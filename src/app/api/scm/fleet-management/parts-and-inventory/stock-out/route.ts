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
    const search = url.searchParams.get("search");
    const branchId = url.searchParams.get("branch_id");
    const movementType = url.searchParams.get("movement_type");

    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-id");
    params.set("fields", "*,part_id.*,part_id.classification_id.*,branch_id.*,job_order_id.*,vehicle_id.*");

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
    const { branch_id, part_id, movement_type, quantity, unit_cost, reference_no, remarks } = payload;

    const branchIdNum = Number(branch_id);
    const partIdNum = Number(part_id);
    const qty = Number(quantity);
    const cost = Number(unit_cost) || 0;

    if (!branchIdNum || !partIdNum || !qty || qty <= 0) {
      return json({ error: "Branch, part, and valid positive quantity are required." }, 400);
    }

    // 1. Check current stock
    const stockUrl = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partIdNum}&filter[branch_id][_eq]=${branchIdNum}&limit=1`;
    const stockRes = await fetch(stockUrl, {
      cache: "no-store",
      headers: directusHeaders(),
    });
    const stockData = await stockRes.json().catch(() => ({ data: [] }));
    const existingStock = stockData.data?.[0];

    const currentOnHand = existingStock ? Number(existingStock.on_hand) || 0 : 0;
    if (qty > currentOnHand) {
      return json(
        {
          error: `Insufficient stock. Requested: ${qty}, Available on-hand: ${currentOnHand}`,
        },
        400
      );
    }

    // 2. Log outbound movement in vehicle_part_movements
    const movementPayload = {
      part_id: partIdNum,
      branch_id: branchIdNum,
      movement_type: movement_type || "Disposal",
      quantity: qty,
      unit_cost: cost,
      reference_no: reference_no || `SO-${Date.now().toString().slice(-6)}`,
      remarks: remarks || "",
    };

    const movRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(movementPayload),
    });

    const movData = await movRes.json().catch(() => ({}));

    // 3. Deduct stock from vehicle_part_stock
    if (existingStock) {
      const patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          on_hand: Math.max(0, currentOnHand - qty),
        }),
      });

      if (!patchRes.ok) {
        const patchErr = await patchRes.json().catch(() => ({}));
        console.error("Directus vehicle_part_stock deduction PATCH error:", patchErr);
        return json(
          {
            error:
              patchErr?.errors?.[0]?.message ||
              "Movement logged, but failed to deduct quantity from branch inventory in database.",
          },
          patchRes.status || 500
        );
      }
    }

    return json({ success: true, data: movData?.data || movementPayload }, 201);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
