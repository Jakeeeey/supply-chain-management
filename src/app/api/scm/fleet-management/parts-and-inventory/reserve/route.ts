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
    const action = url.searchParams.get("action");
    const issuingBranchId = url.searchParams.get("issuing_branch_id") || url.searchParams.get("branch_id");

    // Action: Fetch branch-specific available parts with on_hand > 0
    if (action === "available-parts" || issuingBranchId) {
      if (!issuingBranchId || issuingBranchId === "all") {
        return json({ data: [] });
      }

      const stockParams = new URLSearchParams();
      stockParams.set("limit", "-1");
      stockParams.set("filter[branch_id][_eq]", issuingBranchId);
      stockParams.set("filter[on_hand][_gt]", "0");
      stockParams.set("fields", "id,branch_id,on_hand,reserved,part_id.*,part_id.classification_id.*");

      const stockRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?${stockParams.toString()}`, {
        cache: "no-store",
        headers: directusHeaders(),
      });

      const stockBody = await stockRes.json().catch(() => ({ data: [] }));
      const stockList = Array.isArray(stockBody?.data) ? stockBody.data : [];

      // Extract parts and attach on_hand / available count from stock record
      const availableParts = stockList
        .map((s: Record<string, unknown>) => {
          const part = s.part_id as Record<string, unknown> | null;
          if (!part || typeof part !== "object") return null;

          const onHand = Number(s.on_hand) || 0;
          const reserved = Number(s.reserved) || 0;
          const available = Math.max(0, onHand - reserved);

          return {
            ...part,
            on_hand: onHand,
            reserved,
            available,
            stock_id: s.id,
          };
        })
        .filter(Boolean);

      return json({ data: availableParts });
    }

    const joId = url.searchParams.get("job_order_id");

    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-id");
    params.set("fields", "*,job_order_id.*,part_id.*,part_id.classification_id.*");

    if (joId) {
      params.set("filter[job_order_id][_eq]", joId);
    }

    const endpoint = `${DIRECTUS_URL}/items/vehicle_job_order_parts?${params.toString()}`;

    const upstream = await fetch(endpoint, {
      cache: "no-store",
      headers: directusHeaders(),
    });

    const body = await upstream.json().catch(() => ({ data: [] }));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { job_order_id, branch_id, remarks, items } = payload as {
      job_order_id: number;
      branch_id: number;
      remarks?: string;
      items: Array<{ part_id: number; quantity: number; unit_cost: number; remarks?: string }>;
    };

    if (!job_order_id || !branch_id || !items || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Job order, branch, and items to issue are required." }, 400);
    }

    const currentUserId = getUserIdFromRequest(req);
    const nowIso = new Date().toISOString();

    // 1. Fetch Job Order details for vehicle reference and jo_no
    const joRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}?fields=*,vehicle_id.*`, {
      cache: "no-store",
      headers: directusHeaders(),
    });
    const joData = await joRes.json().catch(() => ({}));
    const jo = joData?.data;

    const joNo = jo?.jo_no || `JO-#${job_order_id}`;
    const vehicleId =
      typeof jo?.vehicle_id === "object" && jo?.vehicle_id !== null
        ? jo.vehicle_id.id || jo.vehicle_id.vehicle_id
        : jo?.vehicle_id || null;

    const branchIdNum = Number(branch_id);

    // 2. Validate branch stock availability before issuing
    for (const item of items) {
      const partId = Number(item.part_id);
      const qty = Number(item.quantity) || 0;

      if (!partId || qty <= 0) continue;

      const stockCheckUrl = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&filter[branch_id][_eq]=${branchIdNum}&limit=1`;
      const stockCheckRes = await fetch(stockCheckUrl, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const stockCheckData = await stockCheckRes.json().catch(() => ({ data: [] }));
      const existingStock = stockCheckData.data?.[0];

      const onHand = Number(existingStock?.on_hand) || 0;
      if (qty > onHand) {
        return json(
          {
            error: `Insufficient stock on hand for part #${partId}. Requested: ${qty}, Available On Hand: ${onHand}`,
          },
          400
        );
      }
    }

    const issuedResults = [];

    // 3. Process each item issuance
    for (const item of items) {
      const partId = Number(item.part_id);
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.unit_cost) || 0;
      const itemRemarks = item.remarks || remarks || `Issued for ${joNo}`;

      if (!partId || qty <= 0) continue;

      // a. Log stock movement as 'Issue'
      const movementPayload: Record<string, unknown> = {
        part_id: partId,
        branch_id: branchIdNum,
        movement_type: "Issue",
        quantity: qty,
        unit_cost: cost,
        job_order_id: Number(job_order_id),
        vehicle_id: vehicleId ? Number(vehicleId) : null,
        reference_no: joNo,
        remarks: itemRemarks,
        created_by: currentUserId || null,
        created_at: nowIso,
      };

      const movRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify(movementPayload),
      });

      if (!movRes.ok) {
        const movErr = await movRes.json().catch(() => ({}));
        console.error("Directus vehicle_part_movements error:", movErr);
        return json(
          {
            error: movErr?.errors?.[0]?.message || "Failed to log parts issuance movement",
          },
          movRes.status || 500
        );
      }

      // b. Deduct from vehicle_part_stock on_hand
      const stockCheckUrl = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&filter[branch_id][_eq]=${branchIdNum}&limit=1`;
      const stockCheckRes = await fetch(stockCheckUrl, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const stockCheckData = await stockCheckRes.json().catch(() => ({ data: [] }));
      const existingStock = stockCheckData.data?.[0];

      if (existingStock) {
        const currentOnHand = Number(existingStock.on_hand) || 0;
        await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify({
            on_hand: Math.max(0, currentOnHand - qty),
          }),
        });
      }

      // c. Record in vehicle_job_order_parts
      const joPartPayload: Record<string, unknown> = {
        job_order_id: Number(job_order_id),
        part_id: partId,
        quantity_requested: qty,
        quantity_issued: qty,
        unit_cost: cost,
        issued_at: nowIso,
        remarks: itemRemarks,
        created_by: currentUserId || null,
      };

      const jopRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify(joPartPayload),
      });

      if (!jopRes.ok) {
        const jopErr = await jopRes.json().catch(() => ({}));
        console.error("Directus vehicle_job_order_parts error:", jopErr);
        return json(
          {
            error: jopErr?.errors?.[0]?.message || "Failed to save job order part record",
          },
          jopRes.status || 500
        );
      }

      const jopData = await jopRes.json().catch(() => ({}));
      issuedResults.push(jopData?.data || joPartPayload);

      // d. Optional audit: Record in vehicle_installed_parts if vehicle exists
      if (vehicleId) {
        await fetch(`${DIRECTUS_URL}/items/vehicle_installed_parts`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            vehicle_id: Number(vehicleId),
            part_id: partId,
            quantity: qty,
            job_order_id: Number(job_order_id),
            installed_at: nowIso,
            remarks: itemRemarks,
            created_by: currentUserId || null,
          }),
        }).catch(() => null);
      }
    }

    return json({ success: true, count: issuedResults.length, data: issuedResults }, 201);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
