import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const CLUSTER_ENDPOINT = "/items/cluster";
const AREA_ENDPOINT = "/items/area_per_cluster";

interface Area {
  id: number;
  cluster_id: number;
  province: string | null;
  city: string | null;
  baranggay: string | null;
}

interface Cluster {
  id: number;
  cluster_name: string;
  minimum_amount: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${ACCESS_TOKEN}`,
});

async function directusFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers as Record<string, string>) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw { status: response.status, data };
  return data;
}

// =============================================================================
// GET — List all clusters (with areas) or fetch a single cluster by id
// =============================================================================

export async function GET(req: NextRequest) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN)
    return json({ error: "Missing config" }, 500);

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "list";
  const clusterId = url.searchParams.get("cluster_id");

  try {
    // ── Detail: single cluster with its areas ──────────────────────────
    if (type === "detail" && clusterId) {
      const cluster = await directusFetch(
        `${DIRECTUS_URL}${CLUSTER_ENDPOINT}/${clusterId}`,
      );
      const areas = await directusFetch(
        `${DIRECTUS_URL}${AREA_ENDPOINT}?filter[cluster_id][_eq]=${clusterId}&sort=id&limit=-1`,
      );

      return json({
        data: { ...cluster.data, areas: areas.data ?? [] },
      });
    }

    // ── List: all clusters joined with their areas ─────────────────────
    const clusters = await directusFetch(
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}?sort=cluster_name&limit=-1`,
    );
    const allAreas = await directusFetch(
      `${DIRECTUS_URL}${AREA_ENDPOINT}?sort=id&limit=-1`,
    );

    const areasByCluster = new Map<number, Area[]>();
    for (const area of (allAreas.data ?? []) as Area[]) {
      const cid = area.cluster_id;
      if (!areasByCluster.has(cid)) areasByCluster.set(cid, []);
      areasByCluster.get(cid)!.push(area);
    }

    const combined = ((clusters.data ?? []) as Cluster[]).map((c: Cluster) => ({
      ...c,
      areas: areasByCluster.get(c.id) ?? [],
    }));

    return json({ data: combined });
  } catch (err: unknown) {
    const errorData = err as { data?: { error?: string }; status?: number; message?: string };
    return json(errorData.data ?? { error: errorData.message }, errorData.status ?? 500);
  }
}

// =============================================================================
// POST — Create a new cluster with areas
// =============================================================================

export async function POST(req: NextRequest) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN)
    return json({ error: "Missing config" }, 500);

  try {
    const body = await req.json();
    const { cluster_name, minimum_amount, areas } = body;

    // 0. Strict duplication check (case-insensitive)
    const existingCheck = await directusFetch(
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}?filter[cluster_name][_icontains]=${encodeURIComponent(cluster_name)}&limit=1`
    );
    // Directus `_icontains` might match substrings, so we verify strictly in JS
    const isDuplicate = (existingCheck.data as Cluster[] | undefined)?.some(
      (c: Cluster) => c.cluster_name?.toLowerCase().trim() === cluster_name.toLowerCase().trim()
    );
    if (isDuplicate) {
      return json({ error: "This cluster name already exists (case-insensitive target)." }, 409);
    }

    // 1. Create the cluster
    const cluster = await directusFetch(
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}`,
      {
        method: "POST",
        body: JSON.stringify({ cluster_name, minimum_amount }),
      },
    );

    const newClusterId = cluster.data.id;

    try {
      // 2. Create each area linked to this cluster
      const createdAreas = [];
      for (const area of areas ?? []) {
        if (!area.province) continue;
        const areaRes = await directusFetch(
          `${DIRECTUS_URL}${AREA_ENDPOINT}`,
          {
            method: "POST",
            body: JSON.stringify({
              cluster_id: newClusterId,
              province: area.province || null,
              city: area.city || null,
              baranggay: area.baranggay || null,
            }),
          },
        );
        createdAreas.push(areaRes.data);
      }

      return json({
        data: { ...cluster.data, areas: createdAreas },
      });
    } catch (areaErr: unknown) {
      // ROLLBACK: If areas fail to create, delete the cluster so we don't have a partial "ghost" record.
      await directusFetch(`${DIRECTUS_URL}${CLUSTER_ENDPOINT}/${newClusterId}`, {
        method: "DELETE",
      }).catch(() => {
        /* ignore rollback failure, primary error is more important */
      });
      throw areaErr;
    }
  } catch (err: unknown) {
    const errorData = err as { data?: { error?: string }; status?: number; message?: string };
    return json(errorData.data ?? { error: errorData.message }, errorData.status ?? 500);
  }
}

// =============================================================================
// PATCH — Update cluster details and upsert areas
// =============================================================================

export async function PATCH(req: NextRequest) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN)
    return json({ error: "Missing config" }, 500);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing cluster id" }, 400);

  try {
    const body = await req.json();
    const { cluster_name, minimum_amount, areas } = body;

    // 0. Strict duplication check (case-insensitive)
    const existingCheck = await directusFetch(
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}?filter[cluster_name][_icontains]=${encodeURIComponent(cluster_name)}&limit=-1`
    );
    // Ensure we don't block saving if the matched cluster is the exact one we are currently editing
    const isDuplicate = (existingCheck.data as Cluster[] | undefined)?.some(
      (c: Cluster) => 
        c.id !== parseInt(id) && 
        c.cluster_name?.toLowerCase().trim() === cluster_name.toLowerCase().trim()
    );
    if (isDuplicate) {
      return json({ error: "This cluster name already exists (case-insensitive target)." }, 409);
    }

    // 1. Update the cluster record
    const cluster = await directusFetch(
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ cluster_name, minimum_amount }),
      },
    );

    // 2. Fetch existing existing areas for deletion check
    const existingAreasRes = await directusFetch(
      `${DIRECTUS_URL}${AREA_ENDPOINT}?filter[cluster_id][_eq]=${id}&limit=-1`
    );
    const existingAreaIds = (existingAreasRes.data as Area[] | undefined)?.map((a: Area) => a.id) || [];
    const incomingAreaIds = (areas as { id?: number }[] ?? []).filter((a) => a.id).map((a) => a.id as number);
    const idsToDelete = existingAreaIds.filter(
      (existingId: number) => !incomingAreaIds.includes(existingId)
    );

    // 3. Delete areas removed from the UI
    for (const deleteId of idsToDelete) {
      await directusFetch(`${DIRECTUS_URL}${AREA_ENDPOINT}/${deleteId}`, {
        method: "DELETE",
      });
    }

    // 4. Upsert remaining areas (update existing, create new)
    const upsertedAreas = [];
    for (const area of areas ?? []) {
      if (!area.province) continue;

      if (area.id) {
        // Update existing area
        const areaRes = await directusFetch(
          `${DIRECTUS_URL}${AREA_ENDPOINT}/${area.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              province: area.province || null,
              city: area.city || null,
              baranggay: area.baranggay || null,
            }),
          },
        );
        upsertedAreas.push(areaRes.data);
      } else {
        // Create new area for this cluster
        const areaRes = await directusFetch(
          `${DIRECTUS_URL}${AREA_ENDPOINT}`,
          {
            method: "POST",
            body: JSON.stringify({
              cluster_id: parseInt(id),
              province: area.province || null,
              city: area.city || null,
              baranggay: area.baranggay || null,
            }),
          },
        );
        upsertedAreas.push(areaRes.data);
      }
    }

    return json({
      data: { ...cluster.data, areas: upsertedAreas },
    });
  } catch (err: unknown) {
    const errorData = err as { data?: { error?: string }; status?: number; message?: string };
    return json(errorData.data ?? { error: errorData.message }, errorData.status ?? 500);
  }
}
