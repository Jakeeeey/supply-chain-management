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
    const classificationId = url.searchParams.get("classification_id");
    const status = url.searchParams.get("status");

    // Check if client requested suppliers list
    if (url.searchParams.get("action") === "suppliers") {
      const supRes = await fetch(
        `${DIRECTUS_URL}/items/suppliers?limit=-1&sort=supplier_name&filter[isActive][_neq]=0`,
        {
          cache: "no-store",
          headers: directusHeaders(),
        }
      );
      const supBody = await supRes.json().catch(() => ({ data: [] }));
      return json(supBody, supRes.status);
    }

    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-created_at");
    // Expand classification relation
    params.set("fields", "*,classification_id.*");

    if (search) {
      params.set("filter[_or][0][part_code][_icontains]", search);
      params.set("filter[_or][1][part_name][_icontains]", search);
      params.set("filter[_or][2][barcode][_icontains]", search);
      params.set("filter[_or][3][classification_id][name][_icontains]", search);
      params.set("filter[_or][4][classification_id][barcode][_icontains]", search);
    }

    if (classificationId && classificationId !== "all") {
      params.set("filter[classification_id][_eq]", classificationId);
    }

    if (status && status !== "all") {
      params.set("filter[is_active][_eq]", status === "active" ? "true" : "false");
    }

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts?${params.toString()}`;

    // Concurrently fetch parts and vehicle_part_suppliers junction
    const [partsRes, vpsRes] = await Promise.all([
      fetch(endpoint, { cache: "no-store", headers: directusHeaders() }),
      fetch(`${DIRECTUS_URL}/items/vehicle_part_suppliers?limit=-1&fields=*,supplier_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      }).catch(() => null),
    ]);

    const partsBody = await partsRes.json().catch(() => ({ data: [] }));
    const vpsBody = vpsRes ? await vpsRes.json().catch(() => ({ data: [] })) : { data: [] };

    const vpsList = Array.isArray(vpsBody?.data) ? vpsBody.data : [];
    // Map part_id -> supplier
    const supplierByPartId = new Map<number, any>();
    for (const vps of vpsList) {
      if (vps.part_id && vps.supplier_id && !supplierByPartId.has(Number(vps.part_id))) {
        supplierByPartId.set(Number(vps.part_id), vps.supplier_id);
      }
    }

    // Attach supplier to parts
    const partsData = Array.isArray(partsBody?.data)
      ? partsBody.data.map((p: any) => {
          const sup = supplierByPartId.get(Number(p.id));
          return {
            ...p,
            supplier: sup || null,
            supplier_id: sup?.id ?? (typeof sup === "number" ? sup : null),
          };
        })
      : [];

    return json({ data: partsData }, partsRes.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const userId = getUserIdFromRequest(req);
    const { supplier_id, ...partData } = payload;

    const postData = {
      ...partData,
      ...(userId ? { created_by: userId } : {}),
    };

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts?fields=*,classification_id.*`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(postData),
    });

    const body = await upstream.json().catch(() => ({}));

    // If part created successfully and supplier_id is provided, save to vehicle_part_suppliers
    const createdPart = body?.data;
    if (upstream.ok && createdPart?.id && supplier_id) {
      try {
        await fetch(`${DIRECTUS_URL}/items/vehicle_part_suppliers`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            part_id: createdPart.id,
            supplier_id: Number(supplier_id),
            ...(userId ? { created_by: userId } : {}),
          }),
        });
      } catch (e) {
        console.error("Error creating vehicle_part_supplier junction:", e);
      }
    }

    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { id, supplier_id, ...updateData } = payload;

    if (!id) {
      return json({ error: "Missing part ID" }, 400);
    }

    const userId = getUserIdFromRequest(req);
    const patchData = {
      ...updateData,
      ...(userId ? { updated_by: userId } : {}),
    };

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts/${id}?fields=*,classification_id.*`;
    const upstream = await fetch(endpoint, {
      method: "PATCH",
      headers: directusHeaders(),
      body: JSON.stringify(patchData),
    });

    const body = await upstream.json().catch(() => ({}));

    // If supplier_id was passed, sync vehicle_part_suppliers
    if (upstream.ok && supplier_id !== undefined) {
      try {
        // Find existing junction record
        const findRes = await fetch(
          `${DIRECTUS_URL}/items/vehicle_part_suppliers?filter[part_id][_eq]=${id}`,
          { headers: directusHeaders() }
        );
        const findBody = await findRes.json().catch(() => ({ data: [] }));
        const existingRecords = Array.isArray(findBody?.data) ? findBody.data : [];

        if (supplier_id) {
          if (existingRecords.length > 0) {
            // Update existing
            await fetch(`${DIRECTUS_URL}/items/vehicle_part_suppliers/${existingRecords[0].id}`, {
              method: "PATCH",
              headers: directusHeaders(),
              body: JSON.stringify({ supplier_id: Number(supplier_id) }),
            });
          } else {
            // Insert new
            await fetch(`${DIRECTUS_URL}/items/vehicle_part_suppliers`, {
              method: "POST",
              headers: directusHeaders(),
              body: JSON.stringify({
                part_id: Number(id),
                supplier_id: Number(supplier_id),
                ...(userId ? { created_by: userId } : {}),
              }),
            });
          }
        }
      } catch (e) {
        console.error("Error updating vehicle_part_suppliers:", e);
      }
    }

    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "Missing part ID" }, 400);
    }

    // Delete junctions in vehicle_part_suppliers first if cascade not configured
    try {
      const vpsRes = await fetch(
        `${DIRECTUS_URL}/items/vehicle_part_suppliers?filter[part_id][_eq]=${id}`,
        { headers: directusHeaders() }
      );
      const vpsData = await vpsRes.json().catch(() => ({ data: [] }));
      if (Array.isArray(vpsData?.data)) {
        for (const item of vpsData.data) {
          await fetch(`${DIRECTUS_URL}/items/vehicle_part_suppliers/${item.id}`, {
            method: "DELETE",
            headers: directusHeaders(),
          });
        }
      }
    } catch {
      // Ignore if already deleted or cascade exists
    }

    const endpoint = `${DIRECTUS_URL}/items/vehicle_parts/${id}`;
    const upstream = await fetch(endpoint, {
      method: "DELETE",
      headers: directusHeaders(),
    });

    if (upstream.status === 204) {
      return json({ success: true }, 200);
    }

    const body = await upstream.json().catch(() => ({}));
    return json(body, upstream.status);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

