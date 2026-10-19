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
    const vehicleId = url.searchParams.get("vehicle_id");
    const limit = url.searchParams.get("limit") ?? "-1";

    let endpoint = `${DIRECTUS_URL}/items/vehicle_installed_parts?limit=${encodeURIComponent(limit)}&fields=*,part_id.*`;
    if (vehicleId) {
      endpoint += `&filter[vehicle_id][_eq]=${encodeURIComponent(vehicleId)}`;
    }

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

    const payload = await req.json().catch(() => ({}));
    const { vehicle_id, part_id, quantity, branch_id, serial_no, remarks } = payload;

    const vehicleIdNum = Number(vehicle_id);
    const partIdNum = Number(part_id);
    const qty = Number(quantity);
    const branchIdNum = branch_id ? Number(branch_id) : null;

    if (!vehicleIdNum || !partIdNum || !qty || qty <= 0) {
      return json({ error: "Vehicle, part, and valid positive quantity are required." }, 400);
    }

    // 1. Fetch vehicle plate / name for reference logging
    let vehicleRef = `Vehicle #${vehicleIdNum}`;
    try {
      const vRes = await fetch(`${DIRECTUS_URL}/items/vehicles/${vehicleIdNum}?fields=id,vehicle_plate,name`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const vJson = await vRes.json().catch(() => ({}));
      if (vJson?.data?.vehicle_plate) {
        vehicleRef = String(vJson.data.vehicle_plate);
      }
    } catch {
      // ignore error, fallback to Vehicle #id
    }

    // 2. Fetch part details (unit_cost, part_name, etc.)
    let partUnitCost = 0;
    let partCode = `PART-${partIdNum}`;
    try {
      const pRes = await fetch(`${DIRECTUS_URL}/items/vehicle_parts/${partIdNum}?fields=id,part_code,part_name,unit_cost`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const pJson = await pRes.json().catch(() => ({}));
      if (pJson?.data) {
        partUnitCost = Number(pJson.data.unit_cost) || 0;
        if (pJson.data.part_code) partCode = String(pJson.data.part_code);
      }
    } catch {
      // ignore
    }

    // 3. Find stock record in vehicle_part_stock
    let stockEndpoint = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partIdNum}&limit=1`;
    if (branchIdNum) {
      stockEndpoint += `&filter[branch_id][_eq]=${branchIdNum}`;
    }

    const stockRes = await fetch(stockEndpoint, {
      cache: "no-store",
      headers: directusHeaders(),
    });
    const stockJson = await stockRes.json().catch(() => ({ data: [] }));
    const existingStock = stockJson?.data?.[0];

    const currentOnHand = existingStock ? Number(existingStock.on_hand) || 0 : 0;
    const targetBranchId = branchIdNum || (existingStock?.branch_id ? Number(existingStock.branch_id) : 1);

    if (existingStock && qty > currentOnHand) {
      return json(
        {
          error: `Insufficient stock in inventory for ${partCode}. Available on-hand: ${currentOnHand}, requested: ${qty}.`,
        },
        400
      );
    }

    // 4. Insert into vehicle_installed_parts
    const installedPayload: Record<string, unknown> = {
      vehicle_id: vehicleIdNum,
      part_id: partIdNum,
      quantity: qty,
      serial_no: serial_no || null,
      remarks: remarks || null,
      installed_at: new Date().toISOString(),
    };
    if (branchIdNum) {
      installedPayload.branch_id = branchIdNum;
    }

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_installed_parts`, {
      method: "POST",
      cache: "no-store",
      headers: directusHeaders(),
      body: JSON.stringify(installedPayload),
    });

    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({}));
      return json(
        { error: errBody?.errors?.[0]?.message || "Failed to save installed part record" },
        upstream.status || 500
      );
    }

    const installedResult = await upstream.json().catch(() => ({}));

    // 5. Deduct from vehicle_part_stock (Stock Monitoring)
    if (existingStock) {
      const newOnHand = Math.max(0, currentOnHand - qty);
      await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          on_hand: newOnHand,
        }),
      });
    }

    // 6. Log movement in vehicle_part_movements
    const movementPayload = {
      part_id: partIdNum,
      branch_id: targetBranchId,
      movement_type: "Issue",
      quantity: qty,
      unit_cost: partUnitCost,
      vehicle_id: vehicleIdNum,
      reference_no: `INST-${vehicleRef}-${Date.now().toString().slice(-6)}`,
      remarks: remarks ? `Vehicle installation: ${remarks}` : `Installed to vehicle ${vehicleRef}`,
    };

    await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(movementPayload),
    }).catch(() => null);

    return json(installedResult, 201);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
