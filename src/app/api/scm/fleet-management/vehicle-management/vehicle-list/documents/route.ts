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

    let endpoint = `${DIRECTUS_URL}/items/vehicle_documents?limit=${encodeURIComponent(limit)}&filter[is_deleted][_neq]=1`;
    if (vehicleId) {
      endpoint += `&filter[vehicle_id][_eq]=${encodeURIComponent(vehicleId)}`;
    }

    const [upstream, vehiclesRes] = await Promise.all([
      fetch(endpoint, {
        cache: "no-store",
        headers: directusHeaders(),
      }),
      fetch(`${DIRECTUS_URL}/items/vehicles?limit=-1&fields=vehicle_id,vehicle_plate,name`, {
        cache: "no-store",
        headers: directusHeaders(),
      }).catch(() => null),
    ]);

    const body = await upstream.json().catch(() => ({ data: [] }));
    const vehiclesData = vehiclesRes && vehiclesRes.ok ? await vehiclesRes.json().catch(() => ({ data: [] })) : { data: [] };
    const vehicleList = Array.isArray(vehiclesData.data) ? vehiclesData.data : [];

    const enrichedDocs = Array.isArray(body?.data)
      ? body.data.map((doc: { vehicle_id?: number }) => {
          const v = vehicleList.find((item: { vehicle_id: number }) => Number(item.vehicle_id) === Number(doc.vehicle_id));
          return {
            ...doc,
            vehicle_plate: v?.vehicle_plate || null,
            vehicle: v ? { vehicle_id: v.vehicle_id, vehicle_plate: v.vehicle_plate, name: v.name } : null,
          };
        })
      : [];

    return json({ ...body, data: enrichedDocs }, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json().catch(() => ({}));
    const cleanDocNo = String(payload?.document_no || "").trim();

    if (cleanDocNo) {
      try {
        const [checkRes, vehiclesRes] = await Promise.all([
          fetch(
            `${DIRECTUS_URL}/items/vehicle_documents?limit=-1&fields=id,vehicle_id,document_no&filter[is_deleted][_neq]=1`,
            {
              cache: "no-store",
              headers: directusHeaders(),
            }
          ),
          fetch(`${DIRECTUS_URL}/items/vehicles?limit=-1&fields=vehicle_id,vehicle_plate,name`, {
            cache: "no-store",
            headers: directusHeaders(),
          }).catch(() => null),
        ]);

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const docs = Array.isArray(checkData.data) ? checkData.data : [];
          const vehiclesData = vehiclesRes && vehiclesRes.ok ? await vehiclesRes.json().catch(() => ({ data: [] })) : { data: [] };
          const vehicleList = Array.isArray(vehiclesData.data) ? vehiclesData.data : [];

          const normalizedTarget = cleanDocNo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

          const duplicate = docs.find((d: { id: number; vehicle_id?: number; document_no?: string }) => {
            const num = (d.document_no || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            return num.length > 0 && num === normalizedTarget;
          });

          if (duplicate) {
            const v = vehicleList.find((item: { vehicle_id: number }) => Number(item.vehicle_id) === Number(duplicate.vehicle_id));
            const plateDisplay = v?.vehicle_plate ? `vehicle with plate '${v.vehicle_plate}'` : `vehicle #${duplicate.vehicle_id || "record"}`;
            return json(
              { error: `Document number '${cleanDocNo}' is already registered to ${plateDisplay}.` },
              409
            );
          }
        }
      } catch (checkErr) {
        console.warn("[Documents POST] Duplicate check warning:", checkErr);
      }
    }

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_documents`, {
      method: "POST",
      cache: "no-store",
      headers: directusHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await upstream.json().catch(() => ({}));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
