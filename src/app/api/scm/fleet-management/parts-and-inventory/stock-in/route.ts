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

    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-created_at");
    params.set("filter[movement_type][_eq]", "Stock In");
    params.set("fields", "*,part_id.*,part_id.classification_id.*,branch_id.*");

    if (branchId && branchId !== "all") {
      params.set("filter[branch_id][_eq]", branchId);
    }

    if (search) {
      params.set("filter[_and][0][movement_type][_eq]", "Stock In");
      params.set("filter[_and][1][_or][0][reference_no][_icontains]", search);
      params.set("filter[_and][1][_or][1][remarks][_icontains]", search);
      params.set("filter[_and][1][_or][2][part_id][part_code][_icontains]", search);
      params.set("filter[_and][1][_or][3][part_id][part_name][_icontains]", search);
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
    const { reference_no, branch_id, remarks, items } = payload as {
      reference_no: string;
      branch_id: number;
      remarks?: string;
      items: Array<{ part_id: number; quantity: number; unit_cost: number; remarks?: string }>;
    };

    if (!reference_no || !branch_id || !items || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Reference number, branch, and at least one item are required." }, 400);
    }

    const movementResults = [];

    for (const item of items) {
      const partId = Number(item.part_id);
      const branchIdNum = Number(branch_id);
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.unit_cost) || 0;
      const itemRemarks = item.remarks || remarks || null;

      if (!partId || qty <= 0) continue;

      // 1. Log the stock movement
      const movementPayload = {
        part_id: partId,
        branch_id: branchIdNum,
        movement_type: "Stock In",
        quantity: qty,
        unit_cost: cost,
        reference_no: reference_no.trim(),
        remarks: itemRemarks,
      };

      const mRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify(movementPayload),
      });

      const mData = await mRes.json().catch(() => ({}));
      if (!mRes.ok) {
        console.error("Directus vehicle_part_movements error:", mData);
        return json(
          {
            error: "Failed to create vehicle_part_movements record in database",
            details: mData,
          },
          mRes.status
        );
      }

      movementResults.push(mData?.data || movementPayload);

      // 2. Update or insert into vehicle_part_stock (quantity per part per branch)
      const stockCheckUrl = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&filter[branch_id][_eq]=${branchIdNum}&limit=1`;
      const stockCheckRes = await fetch(stockCheckUrl, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const stockCheckData = await stockCheckRes.json().catch(() => ({ data: [] }));
      const existingStock = stockCheckData.data?.[0];

      if (existingStock) {
        const currentOnHand = Number(existingStock.on_hand) || 0;
        const stockPatchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify({
            on_hand: currentOnHand + qty,
          }),
        });
        if (!stockPatchRes.ok) {
          const patchErr = await stockPatchRes.json().catch(() => ({}));
          console.error("Directus vehicle_part_stock PATCH error:", patchErr);
        }
      } else {
        const stockPostRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            part_id: partId,
            branch_id: branchIdNum,
            on_hand: qty,
            reserved: 0,
          }),
        });
        if (!stockPostRes.ok) {
          const postErr = await stockPostRes.json().catch(() => ({}));
          console.error("Directus vehicle_part_stock POST error:", postErr);
        }
      }
    }

    return json({ success: true, count: movementResults.length, movements: movementResults }, 201);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
