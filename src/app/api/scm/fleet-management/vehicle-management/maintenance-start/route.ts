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

    // Default: fetch Approved Job Orders
    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-id");
    params.set("fields", "*,vehicle_id.*,requested_by.*,approved_by.*,mechanic_id.*");
    params.set("filter[status][_eq]", "Approved");

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
            unit_cost: Number(jp.unit_cost || partObj?.unit_cost) || 0,
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

export async function PATCH(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { action } = payload;
    const userId = getUserIdFromRequest(req);

    // 1. Start Maintenance
    if (action === "start_maintenance") {
      const { job_order_id } = payload;
      if (!job_order_id) {
        return json({ error: "Missing job_order_id" }, 400);
      }

      const res = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          status: "In Progress",
          started_at: new Date().toISOString(),
        }),
      });

      const body = await res.json().catch(() => ({}));
      return json(body, res.status);
    }

    // 2. Issue Parts
    if (action === "issue_parts") {
      const { job_order_id, branch_id, items } = payload;
      if (!job_order_id || !items || !Array.isArray(items)) {
        return json({ error: "Missing job_order_id or parts items" }, 400);
      }

      for (const item of items) {
        // Record in vehicle_job_order_parts
        await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            job_order_id,
            part_id: item.part_id,
            quantity_requested: item.quantity,
            quantity_issued: item.quantity,
            unit_cost: item.unit_cost,
            issued_by: userId,
            issued_at: new Date().toISOString(),
            remarks: item.remarks || "Issued from Maintenance Start",
          }),
        }).catch(() => null);

        // Deduct from vehicle_part_stock
        const stockFilter = new URLSearchParams({
          "filter[part_id][_eq]": String(item.part_id),
          "filter[branch_id][_eq]": String(branch_id || 1),
          limit: "1",
        });

        const stockRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?${stockFilter.toString()}`, {
          headers: directusHeaders(),
        });
        const stockBody = await stockRes.json().catch(() => ({ data: [] }));
        const stockItem = stockBody?.data?.[0];

        if (stockItem) {
          const newOnHand = Math.max(0, (Number(stockItem.on_hand) || 0) - Number(item.quantity));
          await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${stockItem.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({ on_hand: newOnHand }),
          });
        }
      }

      return json({ success: true }, 200);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
