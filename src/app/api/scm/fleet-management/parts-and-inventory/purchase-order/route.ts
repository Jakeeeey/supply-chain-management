import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
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

    // 1. Fetch parts and stock to calculate replenishment triggers
    const [partsRes, stockRes, prRes] = await Promise.all([
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
      // Try fetching purchase requests if table exists, otherwise return empty
      fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests?limit=-1&sort=-id&fields=*,part_id.*,branch_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      }).catch(() => null),
    ]);

    const partsData = await partsRes.json().catch(() => ({ data: [] }));
    const stockData = await stockRes.json().catch(() => ({ data: [] }));

    let prItems = [];
    if (prRes && prRes.ok) {
      const prData = await prRes.json().catch(() => ({ data: [] }));
      prItems = prData?.data || [];
    }

    const parts = Array.isArray(partsData?.data) ? partsData.data : [];
    const stockList = Array.isArray(stockData?.data) ? stockData.data : [];

    // Calculate low stock / reorder triggers
    const triggers: unknown[] = [];

    stockList.forEach((s: Record<string, unknown>) => {
      const p = typeof s.part_id === "object" && s.part_id !== null ? (s.part_id as Record<string, unknown>) : parts.find((pt: { id: number }) => pt.id === Number(s.part_id));
      const b = typeof s.branch_id === "object" && s.branch_id !== null ? (s.branch_id as Record<string, unknown>) : { id: Number(s.branch_id), branch_name: `Branch #${s.branch_id}` };

      if (!p) return;

      const onHand = Number(s.on_hand) || 0;
      const reserved = Number(s.reserved) || 0;
      const available = onHand - reserved;
      const reorderPoint = Number(p.reorder_point) || 0;

      // Trigger condition: Available stock is at or below the reorder point
      if (available <= reorderPoint) {
        const targetStock = Math.max(reorderPoint * 2, 10);
        const suggestedQty = Math.max(1, targetStock - available);
        const deficit = Math.max(0, reorderPoint - available);

        const classObj = typeof p.classification_id === "object" ? p.classification_id : null;

        triggers.push({
          id: s.id,
          part_id: p.id,
          part_code: p.part_code,
          part_name: p.part_name,
          classification_name: classObj?.name || p.category || "General",
          barcode: p.barcode || classObj?.barcode || "—",
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

    const prRecord = {
      pr_no: prNo,
      branch_id: branchIdNum,
      part_id: partIdNum,
      quantity: qty,
      estimated_cost: Number(estimated_cost) || 0,
      priority: priority || "Normal",
      supplier_name: supplier_name || "General Supplier",
      expected_delivery_date: expected_delivery_date || null,
      status: "Pending",
      notes: notes || "",
      created_at: new Date().toISOString(),
    };

    // Attempt writing to vehicle_part_purchase_requests
    const prRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_purchase_requests`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(prRecord),
    }).catch(() => null);

    if (!prRes || !prRes.ok) {
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

    return json({ success: true, data: prRecord }, 201);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
