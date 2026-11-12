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
    const search = url.searchParams.get("search");
    const branchId = url.searchParams.get("branch_id");
    const movementType = url.searchParams.get("movement_type");

    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-id");
    params.set("fields", "*,part_id.*,part_id.classification_id.*,branch_id.*,job_order_id.*,vehicle_id.*,created_by.*");

    // Exclude 'Stock In' movements to show outbound / issue / disposal
    if (movementType && movementType !== "all") {
      params.set("filter[movement_type][_eq]", movementType);
    } else {
      params.set("filter[movement_type][_neq]", "Stock In");
    }

    if (branchId && branchId !== "all") {
      params.set("filter[branch_id][_eq]", branchId);
    }

    if (search) {
      params.set("filter[_or][0][reference_no][_icontains]", search);
      params.set("filter[_or][1][remarks][_icontains]", search);
      params.set("filter[_or][2][part_id][part_code][_icontains]", search);
      params.set("filter[_or][3][part_id][part_name][_icontains]", search);
    }

    const endpoint = `${DIRECTUS_URL}/items/vehicle_part_movements?${params.toString()}`;

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
    const { branch_id, part_id, movement_type, quantity, unit_cost, reference_no, remarks, items } = payload;

    const branchIdNum = Number(branch_id);
    if (!branchIdNum) {
      return json({ error: "Branch is required." }, 400);
    }

    // Normalize items into array
    type StockOutItem = { part_id: number; quantity: number; unit_cost?: number; remarks?: string };
    let requestItems: StockOutItem[] = [];

    if (Array.isArray(items) && items.length > 0) {
      requestItems = items
        .map((it: { part_id: number | string; quantity: number | string; unit_cost?: number | string; remarks?: string }) => ({
          part_id: Number(it.part_id),
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost || 0),
          remarks: it.remarks || "",
        }))
        .filter((it) => it.part_id > 0 && it.quantity > 0);
    } else if (part_id && quantity) {
      const pNum = Number(part_id);
      const qNum = Number(quantity);
      if (pNum > 0 && qNum > 0) {
        requestItems = [{ part_id: pNum, quantity: qNum, unit_cost: Number(unit_cost || 0), remarks }];
      }
    }

    if (requestItems.length === 0) {
      return json({ error: "At least one valid part with a positive quantity is required." }, 400);
    }

    const assignedRefNo = reference_no && reference_no.trim() ? reference_no.trim() : `SO-${Date.now().toString().slice(-6)}`;
    const userId = getUserIdFromRequest(req);
    const nowIso = new Date().toISOString();
    const movType = movement_type || "Disposal";

    // 1. Pre-validate stock for all items before any mutation
    for (const item of requestItems) {
      const stockUrl = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${item.part_id}&filter[branch_id][_eq]=${branchIdNum}&limit=1`;
      const stockRes = await fetch(stockUrl, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const stockData = await stockRes.json().catch(() => ({ data: [] }));
      const existingStock = stockData.data?.[0];
      const currentOnHand = existingStock ? Number(existingStock.on_hand) || 0 : 0;

      if (item.quantity > currentOnHand) {
        return json(
          {
            error: `Insufficient stock for Part #${item.part_id}. Requested: ${item.quantity}, Available on-hand: ${currentOnHand}`,
          },
          400
        );
      }
    }

    // 2. Perform movement insertions and stock deductions
    const createdMovements = [];

    for (const item of requestItems) {
      // Find current stock to update
      const stockUrl = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${item.part_id}&filter[branch_id][_eq]=${branchIdNum}&limit=1`;
      const stockRes = await fetch(stockUrl, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const stockData = await stockRes.json().catch(() => ({ data: [] }));
      const existingStock = stockData.data?.[0];
      const currentOnHand = existingStock ? Number(existingStock.on_hand) || 0 : 0;

      const movementPayload: Record<string, unknown> = {
        part_id: item.part_id,
        branch_id: branchIdNum,
        movement_type: movType,
        quantity: item.quantity,
        unit_cost: item.unit_cost || 0,
        reference_no: assignedRefNo,
        remarks: item.remarks || remarks || "",
        created_by: userId || null,
        created_at: nowIso,
      };

      const movRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify(movementPayload),
      });

      const movData = await movRes.json().catch(() => ({}));
      createdMovements.push(movData?.data || movementPayload);

      // Deduct stock
      if (existingStock) {
        await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify({
            on_hand: Math.max(0, currentOnHand - item.quantity),
          }),
        });
      }
    }

    return json(
      {
        success: true,
        reference_no: assignedRefNo,
        count: createdMovements.length,
        data: createdMovements[0],
        items: createdMovements,
      },
      201
    );
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
