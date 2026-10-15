import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, COOKIE_NAME } from "@/lib/auth-utils";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

function getUserIdFromRequest(req: NextRequest): number | null {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const rawId = payload?.user_id ?? payload?.id ?? payload?.sub;
    const num = Number(rawId);
    return isNaN(num) || num <= 0 ? null : num;
  } catch {
    return null;
  }
}

function directusHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const branchId = url.searchParams.get("branch_id");

    // 1. Fetch parts, stock, purchase requests, and purchase request items
    const [partsRes, stockRes, prRes, prItemsRes] = await Promise.all([
      fetch(`${DIRECTUS_URL}/items/vehicle_parts?limit=-1&fields=*,classification_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      }),
      fetch(
        `${DIRECTUS_URL}/items/vehicle_part_stock?limit=-1&fields=*,part_id.*,branch_id.*${
          branchId && branchId !== "all" ? `&filter[branch_id][_eq]=${branchId}` : ""
        }`,
        {
          cache: "no-store",
          headers: directusHeaders(),
        }
      ),
      // Fetch purchase requests
      fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests?limit=-1&sort=-id&fields=*,branch_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      }).catch(() => null),
      // Fetch purchase request items
      fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_request_items?limit=-1&fields=*,part_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      }).catch(() => null),
    ]);

    const partsData = await partsRes.json().catch(() => ({ data: [] }));
    const stockData = await stockRes.json().catch(() => ({ data: [] }));

    const parts = Array.isArray(partsData?.data) ? partsData.data : [];
    const stockList = Array.isArray(stockData?.data) ? stockData.data : [];

    // Map parts into a quick lookup Map
    const partMap = new Map<number, Record<string, unknown>>();
    parts.forEach((p: { id: number }) => partMap.set(Number(p.id), p));

    let prItems: unknown[] = [];
    if (prRes && prRes.ok) {
      const prData = await prRes.json().catch(() => ({ data: [] }));
      const rawPrs = prData?.data || [];

      const rawItemsData = prItemsRes && prItemsRes.ok ? await prItemsRes.json().catch(() => ({ data: [] })) : { data: [] };
      const rawItems = Array.isArray(rawItemsData?.data) ? rawItemsData.data : [];

      // Group items by purchase_request_id
      const itemsByPr = new Map<number, Record<string, unknown>[]>();
      rawItems.forEach((it: Record<string, unknown>) => {
        const prId = typeof it.purchase_request_id === "object" && it.purchase_request_id !== null
          ? Number((it.purchase_request_id as Record<string, unknown>).id)
          : Number(it.purchase_request_id);
        if (!itemsByPr.has(prId)) itemsByPr.set(prId, []);
        itemsByPr.get(prId)!.push(it);
      });

      // Enrich PR items
      prItems = rawPrs.map((pr: Record<string, unknown>) => {
        const linkedItems = itemsByPr.get(Number(pr.id)) || [];
        const primaryItem = linkedItems[0];

        let partObj: Record<string, unknown> | null = null;
        let itemQty = Number(pr.quantity) || 0;

        if (primaryItem) {
          itemQty = Number(primaryItem.quantity) || itemQty;
          const pId = typeof primaryItem.part_id === "object" && primaryItem.part_id !== null
            ? Number((primaryItem.part_id as Record<string, unknown>).id)
            : Number(primaryItem.part_id);
          partObj = (typeof primaryItem.part_id === "object" ? primaryItem.part_id as Record<string, unknown> : null) || partMap.get(pId) || null;
        } else if (pr.part_id) {
          const pId = typeof pr.part_id === "object" && pr.part_id !== null
            ? Number((pr.part_id as Record<string, unknown>).id)
            : Number(pr.part_id);
          partObj = (typeof pr.part_id === "object" ? pr.part_id as Record<string, unknown> : null) || partMap.get(pId) || null;
        }

        const unitCost = Number(partObj?.unit_cost) || 0;
        const estCost = Number(pr.estimated_cost) || (itemQty * unitCost);

        return {
          ...pr,
          part_id: partObj || pr.part_id,
          quantity: itemQty,
          estimated_cost: estCost,
          items: linkedItems,
        };
      });
    }

    // Calculate low stock / reorder triggers
    const triggers: unknown[] = [];
    const processedPartIds = new Set<string>();

    // 1. Process from stock records
    stockList.forEach((s: Record<string, unknown>) => {
      const partId = typeof s.part_id === "object" && s.part_id !== null ? Number((s.part_id as Record<string, unknown>).id) : Number(s.part_id);
      const p = partMap.get(partId) || (typeof s.part_id === "object" ? (s.part_id as Record<string, unknown>) : null);
      const b = typeof s.branch_id === "object" && s.branch_id !== null ? (s.branch_id as Record<string, unknown>) : { id: Number(s.branch_id || 1), branch_name: `Branch #${s.branch_id || 1}` };

      if (!p) return;

      const onHand = Number(s.on_hand) || 0;
      const reserved = Number(s.reserved) || 0;
      const available = onHand - reserved;
      const reorderPoint = Number(p.reorder_point) || 0;

      const key = `${partId}-${b.id}`;
      processedPartIds.add(key);

      // Trigger condition: Available stock is at or below the reorder point
      if (available <= reorderPoint) {
        const targetStock = Math.max(reorderPoint * 2, 10);
        const suggestedQty = Math.max(1, targetStock - available);
        const deficit = Math.max(0, reorderPoint - available);

        const classObj = typeof p.classification_id === "object" && p.classification_id !== null ? (p.classification_id as Record<string, unknown>) : null;

        triggers.push({
          id: s.id,
          part_id: p.id,
          part_code: p.part_code,
          part_name: p.part_name,
          classification_name: (classObj?.name as string) || (p.category as string) || "General",
          barcode: (p.barcode as string) || (classObj?.barcode as string) || "—",
          unit: p.unit || "pc",
          unit_cost: Number(p.unit_cost) || 0,
          branch_id: b.id,
          branch_name: b.branch_name || `Branch #${b.id}`,
          on_hand: onHand,
          reserved,
          available,
          reorder_point: reorderPoint,
          deficit,
          suggested_quantity: suggestedQty,
        });
      }
    });

    // 2. Also check registered catalog parts that may have 0 stock
    parts.forEach((p: Record<string, unknown>) => {
      const partId = Number(p.id);
      const reorderPoint = Number(p.reorder_point) || 0;
      const targetBranchId = branchId && branchId !== "all" ? Number(branchId) : 1;
      const key = `${partId}-${targetBranchId}`;

      // If not yet in triggers and has no positive stock record
      if (!processedPartIds.has(key)) {
        // Check if there is any stock record for this part
        const hasStock = stockList.some((s: Record<string, unknown>) => {
          const sPartId = typeof s.part_id === "object" && s.part_id !== null ? Number((s.part_id as Record<string, unknown>).id) : Number(s.part_id);
          return sPartId === partId;
        });

        if (!hasStock) {
          const targetStock = Math.max(reorderPoint * 2, 10);
          const classObj = typeof p.classification_id === "object" && p.classification_id !== null ? (p.classification_id as Record<string, unknown>) : null;

          triggers.push({
            id: `cat-${partId}`,
            part_id: p.id,
            part_code: p.part_code,
            part_name: p.part_name,
            classification_name: (classObj?.name as string) || (p.category as string) || "General",
            barcode: (p.barcode as string) || (classObj?.barcode as string) || "—",
            unit: p.unit || "pc",
            unit_cost: Number(p.unit_cost) || 0,
            branch_id: targetBranchId,
            branch_name: "Central Warehouse",
            on_hand: 0,
            reserved: 0,
            available: 0,
            reorder_point: reorderPoint,
            deficit: reorderPoint,
            suggested_quantity: targetStock,
          });
        }
      }
    });

    return json({
      data: prItems,
      triggers,
      meta: {
        total_count: prItems.length,
        triggers_count: triggers.length,
      },
    });
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { branch_id, part_id, quantity, estimated_cost, priority, supplier_name, expected_delivery_date, notes } = payload;

    const branchIdNum = Number(branch_id);
    const partIdNum = Number(part_id);
    const qty = Number(quantity);

    if (!branchIdNum || !partIdNum || !qty || qty <= 0) {
      return json({ error: "Branch, part, and valid positive quantity are required." }, 400);
    }

    const prNo = `PR-${Date.now().toString().slice(-6)}`;
    const currentUserId = getUserIdFromRequest(req);
    const nowIso = new Date().toISOString();

    const prRecord: Record<string, unknown> = {
      pr_no: prNo,
      branch_id: branchIdNum,
      priority: priority || "Normal",
      supplier_name: supplier_name || "General Supplier",
      expected_delivery_date: expected_delivery_date || null,
      status: "Pending",
      notes: notes || "",
      requested_by: currentUserId || null,
      requested_at: nowIso,
      created_at: nowIso,
    };

    // Attempt writing to vehicle_part_purchase_requests
    const prRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(prRecord),
    }).catch(() => null);

    const prJson = prRes && prRes.ok ? await prRes.json().catch(() => ({})) : null;
    const createdPrId = prJson?.data?.id;

    if (createdPrId) {
      // Insert item into vehicle_part_purchase_request_items
      await fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_request_items`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify({
          purchase_request_id: createdPrId,
          part_id: partIdNum,
          quantity: qty,
          remarks: notes || `Ordered for ${prNo}`,
        }),
      }).catch(() => null);
    } else {
      // Fallback: Also record as procurement movement log if PR table isn't dedicated in directus
      await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify({
          part_id: partIdNum,
          branch_id: branchIdNum,
          movement_type: "Purchase Request",
          quantity: qty,
          unit_cost: Number(estimated_cost) || 0,
          reference_no: prNo,
          remarks: `[PR-${priority}] ${notes || ""}`.trim(),
        }),
      }).catch(() => null);
    }

    return json({ success: true, data: { ...prRecord, id: createdPrId, part_id: partIdNum, quantity: qty } }, 201);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { id, action } = payload;

    if (!id || !action) {
      return json({ error: "id and action are required." }, 400);
    }

    // Fetch existing PR record and linked items
    const [getRes, itemsRes] = await Promise.all([
      fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests/${id}?fields=*,branch_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      }),
      fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_request_items?filter[purchase_request_id][_eq]=${id}&limit=-1&fields=*,part_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      }).catch(() => null),
    ]);

    const prData = await getRes.json().catch(() => ({}));
    const pr = prData?.data;

    if (!pr) {
      return json({ error: "Purchase Request not found." }, 404);
    }

    const branchId = typeof pr.branch_id === "object" && pr.branch_id !== null ? Number(pr.branch_id.id) : Number(pr.branch_id || 1);
    const prNo = pr.pr_no || `PR-#${id}`;

    const itemsData = itemsRes && itemsRes.ok ? await itemsRes.json().catch(() => ({ data: [] })) : { data: [] };
    const prItemsList = Array.isArray(itemsData?.data) && itemsData.data.length > 0
      ? itemsData.data
      : [{
          part_id: pr.part_id,
          quantity: pr.quantity,
          remarks: pr.notes,
        }];

    const currentUserId = getUserIdFromRequest(req);
    const nowIso = new Date().toISOString();

    // 1. Approve Action
    if (action === "approve") {
      const patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests/${id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          status: "Approved",
          approved_at: nowIso,
          decided_by: currentUserId || null,
          decided_at: nowIso,
        }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      return json(patchData, patchRes.status);
    }

    // 2. Cancel Action
    if (action === "cancel") {
      const patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests/${id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          status: "Cancelled",
          decided_by: currentUserId || null,
          decided_at: nowIso,
        }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      return json(patchData, patchRes.status);
    }

    // 3. Receive Action (Stock In to Inventory)
    if (action === "receive") {
      // a. Mark PR as Received
      const patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests/${id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          status: "Received",
          received_at: new Date().toISOString(),
        }),
      });

      // b. Process each item in the purchase request
      for (const item of prItemsList) {
        const partId = typeof item.part_id === "object" && item.part_id !== null ? Number(item.part_id.id) : Number(item.part_id);
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unit_cost || (typeof item.part_id === "object" ? item.part_id.unit_cost : 0)) || 0;

        if (!partId || qty <= 0) continue;

        // Record Movement: Stock In / Purchase Receipt
        await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            part_id: partId,
            branch_id: branchId || 1,
            movement_type: "Stock In",
            quantity: qty,
            unit_cost: cost,
            reference_no: prNo,
            remarks: `Received via Purchase Request ${prNo}`,
            created_at: new Date().toISOString(),
          }),
        }).catch(() => null);

        // Increase on_hand in vehicle_part_stock
        const stockFilter = branchId
          ? `filter[part_id][_eq]=${partId}&filter[branch_id][_eq]=${branchId}&limit=1`
          : `filter[part_id][_eq]=${partId}&limit=1`;

        const stockRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?${stockFilter}`, {
          cache: "no-store",
          headers: directusHeaders(),
        });
        const stockData = await stockRes.json().catch(() => ({ data: [] }));
        let existingStock = stockData.data?.[0];

        if (!existingStock) {
          const fallbackRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&limit=1`, {
            cache: "no-store",
            headers: directusHeaders(),
          });
          const fbData = await fallbackRes.json().catch(() => ({ data: [] }));
          existingStock = fbData.data?.[0];
        }

        if (existingStock) {
          const currentOnHand = Number(existingStock.on_hand) || 0;
          await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              on_hand: currentOnHand + qty,
            }),
          });
        } else {
          // Create initial stock entry if not exists
          await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify({
              part_id: partId,
              branch_id: branchId || 1,
              on_hand: qty,
              reserved: 0,
            }),
          });
        }
      }

      const patchData = await patchRes.json().catch(() => ({}));
      return json({ success: true, data: patchData }, 200);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

