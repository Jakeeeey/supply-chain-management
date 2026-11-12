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
    const mode = url.searchParams.get("mode");

    // Mode: parts/options
    if (mode === "options") {
      const branchId = url.searchParams.get("branch_id");

      const [pRes, sRes] = await Promise.all([
        fetch(
          `${DIRECTUS_URL}/items/vehicle_parts?filter[is_active][_eq]=true&limit=-1&fields=id,part_code,part_name,category,unit,unit_cost,barcode`,
          { cache: "no-store", headers: directusHeaders() }
        ).catch(() => null),
        fetch(
          `${DIRECTUS_URL}/items/vehicle_part_stock?limit=-1&fields=id,part_id,branch_id,on_hand,reserved`,
          { cache: "no-store", headers: directusHeaders() }
        ).catch(() => null),
      ]);

      const parts = pRes ? (await pRes.json().catch(() => ({})))?.data || [] : [];
      const stocks = sRes ? (await sRes.json().catch(() => ({})))?.data || [] : [];

      const partsWithStock = parts.map((part: { id: number }) => {
        const branchStock = stocks.filter(
          (s: { part_id: number; branch_id?: number }) =>
            Number(s.part_id) === Number(part.id) &&
            (!branchId || Number(s.branch_id) === Number(branchId))
        );
        const on_hand = branchStock.reduce(
          (acc: number, curr: { on_hand?: number }) => acc + (Number(curr.on_hand) || 0),
          0
        );
        const reserved = branchStock.reduce(
          (acc: number, curr: { reserved?: number }) => acc + (Number(curr.reserved) || 0),
          0
        );
        return {
          ...part,
          on_hand,
          reserved,
        };
      });

      return json({ data: { parts: partsWithStock } });
    }

    // Default: fetch In Progress Job Orders
    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-id");
    params.set("fields", "*,vehicle_id.*,branch_id.*,requested_by.*,approved_by.*,completed_by.*,mechanic_id.*");
    params.set("filter[status][_eq]", "In Progress");

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders?${params.toString()}`, {
      cache: "no-store",
      headers: directusHeaders(),
    });

    const body = await upstream.json().catch(() => ({ data: [] }));
    const jobOrders = body?.data || [];

    // Also get parts requested/issued for these job orders
    const joPartsRes = await fetch(
      `${DIRECTUS_URL}/items/vehicle_job_order_parts?limit=-1&fields=*,part_id.*`,
      { cache: "no-store", headers: directusHeaders() }
    ).catch(() => null);

    const joParts = joPartsRes ? (await joPartsRes.json().catch(() => ({})))?.data || [] : [];

    const enriched = jobOrders.map((jo: { id: number }) => {
      const partsForJo = joParts
        .filter((jp: { job_order_id: number | { id: number } }) => {
          const jpJoId =
            typeof jp.job_order_id === "object" && jp.job_order_id !== null
              ? jp.job_order_id.id
              : jp.job_order_id;
          return Number(jpJoId) === Number(jo.id);
        })
        .map((jp: { id: number; part_id: unknown; quantity_requested: number; quantity_issued?: number; unit_cost?: number; remarks?: string }) => {
          const partObj =
            typeof jp.part_id === "object" && jp.part_id !== null
              ? (jp.part_id as { id: number; part_name?: string; part_code?: string; unit_cost?: number })
              : null;
          return {
            id: jp.id,
            part_id: partObj ? partObj.id : Number(jp.part_id),
            part_name: partObj?.part_name || "",
            part_code: partObj?.part_code || "",
            quantity_requested: Number(jp.quantity_requested) || 0,
            quantity_issued: Number(jp.quantity_issued) || 0,
            unit_cost: Number(jp.unit_cost || partObj?.unit_cost || 0),
            remarks: jp.remarks || "",
          };
        });

      return {
        ...jo,
        parts: partsForJo,
      };
    });

    return json({ data: enriched });
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;
    const userId = getUserIdFromRequest(req);
    const utcNow = new Date().toISOString();

    // Helper function to process part deductions & movements
    async function deductAndIssueParts(
      jobOrderId: number,
      effectiveBranchId: number,
      items: Array<{ part_id: number; quantity: number; unit_cost: number; remarks?: string }>
    ) {
      if (!items || items.length === 0) return;

      // Fetch JO details for context
      const joDetailsRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${jobOrderId}?fields=id,jo_no,vehicle_id`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const joDetails = (await joDetailsRes.json().catch(() => ({})))?.data || {};
      const vehicleId =
        typeof joDetails.vehicle_id === "object" && joDetails.vehicle_id !== null
          ? joDetails.vehicle_id.id || joDetails.vehicle_id.vehicle_id
          : joDetails.vehicle_id;
      const joNo = joDetails.jo_no || `JO-${jobOrderId}`;

      // Consolidate duplicates
      const consolidated = new Map<number, { part_id: number; quantity: number; unit_cost: number; remarks?: string }>();
      for (const item of items) {
        if (!item.part_id || Number(item.quantity) <= 0) continue;
        const pId = Number(item.part_id);
        const qty = Number(item.quantity);
        const existing = consolidated.get(pId);
        if (existing) {
          existing.quantity += qty;
        } else {
          consolidated.set(pId, { ...item, part_id: pId, quantity: qty });
        }
      }

      // Check stock availability
      for (const [partId, item] of consolidated.entries()) {
        const stockFilter = new URLSearchParams({
          "filter[part_id][_eq]": String(partId),
          "filter[branch_id][_eq]": String(effectiveBranchId),
          limit: "1",
        });
        const sRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?${stockFilter.toString()}`, {
          headers: directusHeaders(),
          cache: "no-store",
        });
        const sData = await sRes.json().catch(() => ({ data: [] }));
        const onHand = Number(sData?.data?.[0]?.on_hand || 0);

        if (onHand < item.quantity) {
          throw new Error(`Insufficient stock for part ID #${partId} in branch. Available: ${onHand}, Requested: ${item.quantity}`);
        }
      }

      // Query existing job order parts
      const existingJoPartsRes = await fetch(
        `${DIRECTUS_URL}/items/vehicle_job_order_parts?filter[job_order_id][_eq]=${jobOrderId}&limit=-1`,
        { headers: directusHeaders(), cache: "no-store" }
      );
      const existingJoParts = (await existingJoPartsRes.json().catch(() => ({ data: [] })))?.data || [];

      // Execute deductions and movement logging
      for (const [partId, item] of consolidated.entries()) {
        const matchingPartRow = existingJoParts.find(
          (jp: { part_id: unknown }) => {
            const rawPId = typeof jp.part_id === "object" && jp.part_id !== null ? (jp.part_id as { id: number }).id : jp.part_id;
            return Number(rawPId) === Number(partId);
          }
        );

        if (matchingPartRow) {
          const currentIssued = Number(matchingPartRow.quantity_issued || 0);
          const currentRequested = Number(matchingPartRow.quantity_requested || 0);
          const newIssued = currentIssued + item.quantity;
          const newRequested = Math.max(currentRequested, newIssued);

          await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts/${matchingPartRow.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              quantity_issued: newIssued,
              quantity_requested: newRequested,
              issued_by: userId,
              issued_at: utcNow,
              unit_cost: item.unit_cost,
              remarks: item.remarks || matchingPartRow.remarks,
            }),
          });
        } else {
          await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify({
              job_order_id: Number(jobOrderId),
              part_id: partId,
              quantity_requested: item.quantity,
              quantity_issued: item.quantity,
              unit_cost: item.unit_cost,
              issued_by: userId,
              issued_at: utcNow,
              remarks: item.remarks || "Issued from Maintenance Progress",
            }),
          });
        }

        // Record stock movement
        await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            part_id: partId,
            branch_id: effectiveBranchId,
            movement_type: "Issue",
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            job_order_id: Number(jobOrderId),
            vehicle_id: vehicleId,
            reference_no: joNo,
            remarks: item.remarks || `Issued from Maintenance Progress (${joNo})`,
            created_by: userId,
            created_at: utcNow,
          }),
        }).catch(() => null);

        // Deduct from vehicle_part_stock
        const stockFilter = new URLSearchParams({
          "filter[part_id][_eq]": String(partId),
          "filter[branch_id][_eq]": String(effectiveBranchId),
          limit: "1",
        });
        const stockRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?${stockFilter.toString()}`, {
          headers: directusHeaders(),
          cache: "no-store",
        });
        const stockBody = await stockRes.json().catch(() => ({ data: [] }));
        const stockItem = stockBody?.data?.[0];

        if (stockItem) {
          const newOnHand = Math.max(0, (Number(stockItem.on_hand) || 0) - item.quantity);
          await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${stockItem.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              on_hand: newOnHand,
              updated_at: utcNow,
            }),
          });
        }

        // Register to vehicle_installed_parts
        if (vehicleId) {
          await fetch(`${DIRECTUS_URL}/items/vehicle_installed_parts`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify({
              vehicle_id: vehicleId,
              part_id: partId,
              quantity: item.quantity,
              job_order_id: Number(jobOrderId),
              installed_at: utcNow,
              remarks: item.remarks || `Fitted during maintenance (${joNo})`,
            }),
          }).catch(() => null);
        }
      }
    }

    // 1. Issue Parts action
    if (action === "issue_parts") {
      const { job_order_id, branch_id, items } = payload;
      if (!job_order_id || !items || !Array.isArray(items) || items.length === 0) {
        return json({ error: "Missing job_order_id or items array" }, 400);
      }

      const joRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}?fields=branch_id`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const joData = await joRes.json().catch(() => ({}));
      const joBranchId =
        typeof joData?.data?.branch_id === "object" && joData?.data?.branch_id !== null
          ? joData.data.branch_id.id
          : joData?.data?.branch_id;

      const effectiveBranchId = Number(branch_id || joBranchId || 1);

      await deductAndIssueParts(Number(job_order_id), effectiveBranchId, items);

      return json({ success: true, message: "Parts issued successfully and stock accurately deducted." }, 200);
    }

    // 2. Complete Job Order action (with automated difference part deduction)
    if (action === "complete_jo") {
      const { job_order_id, completion_remarks, labor_cost, final_odometer, additional_parts } = payload;
      if (!job_order_id) {
        return json({ error: "Missing job_order_id" }, 400);
      }

      // Check for effective branch
      const joRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}?fields=vehicle_id,branch_id`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const joData = await joRes.json().catch(() => ({}));
      const joBranchId =
        typeof joData?.data?.branch_id === "object" && joData?.data?.branch_id !== null
          ? joData.data.branch_id.id
          : joData?.data?.branch_id;
      const effectiveBranchId = Number(joBranchId || 1);

      // If there are additional or exceeded parts with difference > 0, deduct them atomically
      if (Array.isArray(additional_parts) && additional_parts.length > 0) {
        const itemsToDeduct = additional_parts
          .filter((p) => p.part_id > 0 && Number(p.quantity_diff) > 0)
          .map((p) => ({
            part_id: Number(p.part_id),
            quantity: Number(p.quantity_diff),
            unit_cost: Number(p.unit_cost) || 0,
            remarks: p.remarks || "Additional parts consumed during repair completion",
          }));

        if (itemsToDeduct.length > 0) {
          await deductAndIssueParts(Number(job_order_id), effectiveBranchId, itemsToDeduct);
        }
      }

      // Update Job Order status with completed_by and strict UTC completed_at
      const completeData: Record<string, unknown> = {
        status: "Completed",
        completed_at: utcNow,
        completed_by: userId,
        completion_remarks: completion_remarks || "",
        labor_cost: labor_cost ? Number(labor_cost) : 0,
        updated_by: userId,
      };

      let patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify(completeData),
      });

      // Fallback if completed_by column is not yet present in schema
      if (!patchRes.ok) {
        const fallbackData = {
          status: "Completed",
          completed_at: utcNow,
          completion_remarks: completion_remarks || "",
          labor_cost: labor_cost ? Number(labor_cost) : 0,
        };
        patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify(fallbackData),
        });
      }

      const patchData = await patchRes.json().catch(() => ({}));

      // Update vehicle odometer & status if provided
      const vehicleId =
        typeof joData?.data?.vehicle_id === "object" && joData?.data?.vehicle_id !== null
          ? joData.data.vehicle_id.id || joData.data.vehicle_id.vehicle_id
          : joData?.data?.vehicle_id;

      if (vehicleId) {
        const vehUpdate: Record<string, unknown> = {
          status: "Available",
        };
        if (final_odometer) {
          vehUpdate.current_mileage = Number(final_odometer);
        }
        await fetch(`${DIRECTUS_URL}/items/vehicles/${vehicleId}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify(vehUpdate),
        }).catch(() => null);
      }

      return json({ success: true, message: "Job order completed successfully.", data: patchData }, 200);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
