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

/** Normalize a string for safe comparison */
function norm(s?: string | null): string {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Check if any incoming areas overlap with existing areas from OTHER clusters.
 * Returns a descriptive error string if overlap is found, or null if clean.
 */
async function checkAreaOverlap(
  incomingAreas: { province?: string; city?: string; baranggay?: string }[],
  excludeClusterId?: number
): Promise<string | null> {
  const allAreas = await directusFetch(
    `${DIRECTUS_URL}${AREA_ENDPOINT}?limit=-1`
  );
  const existingAreas = (allAreas.data ?? []) as Area[];

  for (const incoming of incomingAreas) {
    if (!incoming.province) continue;

    const inCity = norm(incoming.city);
    const inBrgy = norm(incoming.baranggay);

    if (!inCity) continue; // No city means nothing to check

    for (const existing of existingAreas) {
      // Skip areas belonging to the cluster being edited
      if (excludeClusterId && existing.cluster_id === excludeClusterId) continue;

      const exCity = norm(existing.city);
      const exBrgy = norm(existing.baranggay);

      if (!exCity) continue;

      // Case 1: Incoming is a "whole city" claim (city + no barangay)
      if (inCity && !inBrgy) {
        if (exCity === inCity) {
          return `"${incoming.city}" is already assigned (fully or partially) to another cluster.`;
        }
      }

      // Case 2: Incoming is a specific barangay claim
      if (inCity && inBrgy) {
        // Blocked if someone else owns the whole city
        if (exCity === inCity && !exBrgy) {
          return `"${incoming.city}" is entirely claimed by another cluster. Cannot assign individual barangays.`;
        }
        // Blocked if someone else owns this exact barangay
        if (exCity === inCity && exBrgy === inBrgy) {
          return `"${incoming.baranggay}" in "${incoming.city}" is already assigned to another cluster.`;
        }
      }
    }
  }

  return null; // No overlap
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
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}?sort=-id&limit=-1`,
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

    // 1b. Area overlap check
    const overlapError = await checkAreaOverlap(areas ?? []);
    if (overlapError) {
      // Rollback the cluster we just created
      await directusFetch(`${DIRECTUS_URL}${CLUSTER_ENDPOINT}/${newClusterId}`, {
        method: "DELETE",
      }).catch(() => {});
      return json({ error: overlapError }, 409);
    }

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
              province: area.province?.trim() || null,
              city: area.city?.trim() || null,
              baranggay: area.baranggay?.trim() || null,
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
    const errorData = err as { data?: { errors?: { message?: string }[]; error?: string }; status?: number; message?: string };
    const directusMsg = errorData.data?.errors?.[0]?.message || errorData.data?.error || errorData.message;
    return json({ error: directusMsg || "Failed to create cluster." }, errorData.status ?? 500);
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

    // 1b. Area overlap check (exclude the current cluster's own areas)
    const overlapError = await checkAreaOverlap(areas ?? [], parseInt(id));
    if (overlapError) {
      return json({ error: overlapError }, 409);
    }

    // 2. Delete ALL existing areas for this cluster first
    //    (avoids unique-constraint collisions during upsert when
    //     multiple rows share the same city but different barangays)
    const existingAreasRes = await directusFetch(
      `${DIRECTUS_URL}${AREA_ENDPOINT}?filter[cluster_id][_eq]=${id}&limit=-1`
    );
    const existingAreaIds = ((existingAreasRes.data ?? []) as Area[]).map((a: Area) => a.id);

    for (const deleteId of existingAreaIds) {
      await directusFetch(`${DIRECTUS_URL}${AREA_ENDPOINT}/${deleteId}`, {
        method: "DELETE",
      });
    }

    // 3. Re-create all areas from the incoming form data
    const createdAreas = [];
    for (const area of areas ?? []) {
      if (!area.province) continue;
      const areaRes = await directusFetch(
        `${DIRECTUS_URL}${AREA_ENDPOINT}`,
        {
          method: "POST",
          body: JSON.stringify({
            cluster_id: parseInt(id),
            province: area.province?.trim() || null,
            city: area.city?.trim() || null,
            baranggay: area.baranggay?.trim() || null,
          }),
        },
      );
      createdAreas.push(areaRes.data);
    }

    return json({
      data: { ...cluster.data, areas: createdAreas },
    });
  } catch (err: unknown) {
    const errorData = err as { data?: { errors?: { message?: string }[]; error?: string }; status?: number; message?: string };
    const directusMsg = errorData.data?.errors?.[0]?.message || errorData.data?.error || errorData.message;
    return json({ error: directusMsg || "Failed to update cluster." }, errorData.status ?? 500);
  }
}
