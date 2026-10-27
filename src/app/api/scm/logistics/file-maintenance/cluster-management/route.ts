import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const CLUSTER_ENDPOINT = "/items/cluster";
const AREA_ENDPOINT = "/items/area_per_cluster";
const COA_BUDGET_ENDPOINT = "/items/cluster_coa_budget";
const COA_ENDPOINT = "/items/chart_of_accounts";

interface Area {
  id: number;
  cluster_id: number;
  province: string | null;
  city: string | null;
  baranggay: string | null;
}

interface CoaBudget {
  id: number;
  cluster_id: number;
  coa_id: number;
  budget: number;
}

interface CoaItem {
  coa_id: number;
  account_title: string;
  gl_code: string;
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
// GET — List all clusters (with areas & coa budgets), single cluster, or COA options
// =============================================================================

export async function GET(req: NextRequest) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN)
    return json({ error: "Missing config" }, 500);

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "list";
  const clusterId = url.searchParams.get("cluster_id");

  try {
    // ── COA Options: filtered by account_types ──────────────────────
    if (type === "coa_options") {
      // 1. Fetch IDs of the target account types
      const accountTypesRes = await directusFetch(
        `${DIRECTUS_URL}/items/account_types?filter[account_name][_in]=GENERAL AND ADMINISTRATIVE EXPENSES,FINANCE COST&fields=id,account_name&limit=-1`
      ).catch(() => ({ data: [] }));

      const targetTypeIds = ((accountTypesRes.data ?? []) as { id: number; account_name: string }[])
        .map((t) => t.id)
        .filter(Boolean);

      // If matching account types were found, filter by account_type IN (...)
      // Also fallback to relational filter if direct IDs query returned empty
      let filterParam = "";
      if (targetTypeIds.length > 0) {
        filterParam = `&filter[account_type][_in]=${targetTypeIds.join(",")}`;
      } else {
        filterParam = `&filter[account_type][account_name][_in]=${encodeURIComponent("GENERAL AND ADMINISTRATIVE EXPENSES")},${encodeURIComponent("FINANCE COST")}`;
      }

      const coaRes = await directusFetch(
        `${DIRECTUS_URL}${COA_ENDPOINT}?fields=coa_id,account_title,gl_code,account_type${filterParam}&limit=-1`
      ).catch(() => ({ data: [] }));

      return json({ data: coaRes.data ?? [] });
    }

    // ── Detail: single cluster with its areas & coa budgets ───────────
    if (type === "detail" && clusterId) {
      const [cluster, areas, budgets, coas] = await Promise.all([
        directusFetch(`${DIRECTUS_URL}${CLUSTER_ENDPOINT}/${clusterId}`),
        directusFetch(`${DIRECTUS_URL}${AREA_ENDPOINT}?filter[cluster_id][_eq]=${clusterId}&sort=id&limit=-1`),
        directusFetch(`${DIRECTUS_URL}${COA_BUDGET_ENDPOINT}?filter[cluster_id][_eq]=${clusterId}&sort=id&limit=-1`).catch(() => ({ data: [] })),
        directusFetch(`${DIRECTUS_URL}${COA_ENDPOINT}?fields=coa_id,account_title,gl_code&limit=-1`).catch(() => ({ data: [] })),
      ]);

      const coaMap = new Map<number, CoaItem>();
      for (const c of (coas.data ?? []) as CoaItem[]) {
        coaMap.set(c.coa_id, c);
      }

      const enrichedBudgets = ((budgets.data ?? []) as CoaBudget[]).map((b) => ({
        ...b,
        account_title: coaMap.get(b.coa_id)?.account_title || "",
        gl_code: coaMap.get(b.coa_id)?.gl_code || "",
      }));

      return json({
        data: {
          ...cluster.data,
          areas: areas.data ?? [],
          coa_budgets: enrichedBudgets,
        },
      });
    }

    // ── List: all clusters joined with their areas & budgets ──────────
    const [clusters, allAreas, allBudgets, coas] = await Promise.all([
      directusFetch(`${DIRECTUS_URL}${CLUSTER_ENDPOINT}?sort=-id&limit=-1`),
      directusFetch(`${DIRECTUS_URL}${AREA_ENDPOINT}?sort=id&limit=-1`),
      directusFetch(`${DIRECTUS_URL}${COA_BUDGET_ENDPOINT}?sort=id&limit=-1`).catch(() => ({ data: [] })),
      directusFetch(`${DIRECTUS_URL}${COA_ENDPOINT}?fields=coa_id,account_title,gl_code&limit=-1`).catch(() => ({ data: [] })),
    ]);

    const coaMap = new Map<number, CoaItem>();
    for (const c of (coas.data ?? []) as CoaItem[]) {
      coaMap.set(c.coa_id, c);
    }

    const areasByCluster = new Map<number, Area[]>();
    for (const area of (allAreas.data ?? []) as Area[]) {
      const cid = area.cluster_id;
      if (!areasByCluster.has(cid)) areasByCluster.set(cid, []);
      areasByCluster.get(cid)!.push(area);
    }

    const budgetsByCluster = new Map<
      number,
      Array<CoaBudget & { account_title: string; gl_code: string }>
    >();
    for (const b of (allBudgets.data ?? []) as CoaBudget[]) {
      const cid = b.cluster_id;
      if (!budgetsByCluster.has(cid)) budgetsByCluster.set(cid, []);
      budgetsByCluster.get(cid)!.push({
        ...b,
        account_title: coaMap.get(b.coa_id)?.account_title || "",
        gl_code: coaMap.get(b.coa_id)?.gl_code || "",
      });
    }

    const combined = ((clusters.data ?? []) as Cluster[]).map((c: Cluster) => ({
      ...c,
      areas: areasByCluster.get(c.id) ?? [],
      coa_budgets: budgetsByCluster.get(c.id) ?? [],
    }));

    return json({ data: combined });
  } catch (err: unknown) {
    const errorData = err as { data?: { error?: string }; status?: number; message?: string };
    return json(errorData.data ?? { error: errorData.message }, errorData.status ?? 500);
  }
}

// =============================================================================
// POST — Create a new cluster with areas and coa_budgets
// =============================================================================

export async function POST(req: NextRequest) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN)
    return json({ error: "Missing config" }, 500);

  try {
    const body = await req.json();
    const { cluster_name, minimum_amount, areas, coa_budgets } = body;

    // Verify company subscription limit for cluster
    const companyRes = await directusFetch(
      `${DIRECTUS_URL}/items/company?filter[company_id][_eq]=1`
    ).catch(() => ({ data: [] }));
    const company = companyRes.data?.[0];

    if (company && company.company_subscription) {
      const subId = typeof company.company_subscription === "object" && company.company_subscription !== null
        ? (company.company_subscription as { id: number }).id
        : company.company_subscription;

      if (subId) {
        const limitsRes = await directusFetch(
          `${DIRECTUS_URL}/items/subscription_limits?filter[subscription_id][_eq]=${subId}&filter[module_name][_eq]=cluster`
        ).catch(() => ({ data: [] }));
        const limitObj = limitsRes.data?.[0];

        if (limitObj) {
          const limitValue = parseInt(String(limitObj.limit_value));
          if (limitValue !== -1) {
            const existingClusters = await directusFetch(
              `${DIRECTUS_URL}${CLUSTER_ENDPOINT}?limit=-1`
            ).catch(() => ({ data: [] }));
            const count = (existingClusters.data ?? []).length;
            if (count >= limitValue) {
              return json(
                { error: `You have reached the maximum limit of ${limitValue} clusters for your subscription.` },
                403
              );
            }
          }
        }
      }
    }

    // 0. Strict duplication check (case-insensitive)
    const existingCheck = await directusFetch(
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}?filter[cluster_name][_icontains]=${encodeURIComponent(cluster_name)}&limit=1`
    );
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
      // 2. Create areas linked to this cluster concurrently
      const validAreas = (areas ?? []).filter((a: { province?: string }) => !!a.province);
      const createdAreas = await Promise.all(
        validAreas.map((area: { province?: string; city?: string; baranggay?: string }) =>
          directusFetch(`${DIRECTUS_URL}${AREA_ENDPOINT}`, {
            method: "POST",
            body: JSON.stringify({
              cluster_id: newClusterId,
              province: area.province?.trim() || null,
              city: area.city?.trim() || null,
              baranggay: area.baranggay?.trim() || null,
            }),
          }).then((res) => res.data)
        )
      );

      // 3. Create COA budgets linked to this cluster concurrently
      const validBudgets = (coa_budgets ?? []).filter((b: { coa_id?: number }) => Number(b.coa_id) > 0);
      const createdBudgets = await Promise.all(
        validBudgets.map((b: { coa_id: number; budget?: number }) =>
          directusFetch(`${DIRECTUS_URL}${COA_BUDGET_ENDPOINT}`, {
            method: "POST",
            body: JSON.stringify({
              cluster_id: newClusterId,
              coa_id: Number(b.coa_id),
              budget: Number(b.budget) || 0,
            }),
          }).then((res) => res.data)
        )
      );

      return json({
        data: { ...cluster.data, areas: createdAreas, coa_budgets: createdBudgets },
      });
    } catch (createErr: unknown) {
      // ROLLBACK: If areas or budgets fail, delete the cluster
      await directusFetch(`${DIRECTUS_URL}${CLUSTER_ENDPOINT}/${newClusterId}`, {
        method: "DELETE",
      }).catch(() => {});
      throw createErr;
    }
  } catch (err: unknown) {
    const errorData = err as { data?: { errors?: { message?: string }[]; error?: string }; status?: number; message?: string };
    const directusMsg = errorData.data?.errors?.[0]?.message || errorData.data?.error || errorData.message;
    return json({ error: directusMsg || "Failed to create cluster." }, errorData.status ?? 500);
  }
}

// =============================================================================
// PATCH — Update cluster details, areas, and coa_budgets
// =============================================================================

export async function PATCH(req: NextRequest) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN)
    return json({ error: "Missing config" }, 500);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing cluster id" }, 400);

  try {
    const body = await req.json();
    const { cluster_name, minimum_amount, areas, coa_budgets } = body;

    // 0. Strict duplication check (case-insensitive)
    const existingCheck = await directusFetch(
      `${DIRECTUS_URL}${CLUSTER_ENDPOINT}?filter[cluster_name][_icontains]=${encodeURIComponent(cluster_name)}&limit=-1`
    );
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

    // 2. Delete existing areas for this cluster concurrently
    const existingAreasRes = await directusFetch(
      `${DIRECTUS_URL}${AREA_ENDPOINT}?filter[cluster_id][_eq]=${id}&limit=-1`
    );
    const existingAreaIds = ((existingAreasRes.data ?? []) as Area[]).map((a: Area) => a.id);
    await Promise.all(
      existingAreaIds.map((deleteId) =>
        directusFetch(`${DIRECTUS_URL}${AREA_ENDPOINT}/${deleteId}`, {
          method: "DELETE",
        })
      )
    );

    // 3. Re-create all areas concurrently
    const validAreas = (areas ?? []).filter((a: { province?: string }) => !!a.province);
    const createdAreas = await Promise.all(
      validAreas.map((area: { province?: string; city?: string; baranggay?: string }) =>
        directusFetch(`${DIRECTUS_URL}${AREA_ENDPOINT}`, {
          method: "POST",
          body: JSON.stringify({
            cluster_id: parseInt(id),
            province: area.province?.trim() || null,
            city: area.city?.trim() || null,
            baranggay: area.baranggay?.trim() || null,
          }),
        }).then((res) => res.data)
      )
    );

    // 4. Delete existing COA budgets for this cluster concurrently
    const existingBudgetsRes = await directusFetch(
      `${DIRECTUS_URL}${COA_BUDGET_ENDPOINT}?filter[cluster_id][_eq]=${id}&limit=-1`
    ).catch(() => ({ data: [] }));
    const existingBudgetIds = ((existingBudgetsRes.data ?? []) as CoaBudget[]).map((b: CoaBudget) => b.id);

    await Promise.all(
      existingBudgetIds.map((bId) =>
        directusFetch(`${DIRECTUS_URL}${COA_BUDGET_ENDPOINT}/${bId}`, {
          method: "DELETE",
        }).catch(() => {})
      )
    );

    // 5. Re-create all COA budgets concurrently
    const validBudgets = (coa_budgets ?? []).filter((b: { coa_id?: number }) => Number(b.coa_id) > 0);
    const createdBudgets = await Promise.all(
      validBudgets.map((b: { coa_id: number; budget?: number }) =>
        directusFetch(`${DIRECTUS_URL}${COA_BUDGET_ENDPOINT}`, {
          method: "POST",
          body: JSON.stringify({
            cluster_id: parseInt(id),
            coa_id: Number(b.coa_id),
            budget: Number(b.budget) || 0,
          }),
        }).then((res) => res.data)
      )
    );

    return json({
      data: { ...cluster.data, areas: createdAreas, coa_budgets: createdBudgets },
    });
  } catch (err: unknown) {
    const errorData = err as { data?: { errors?: { message?: string }[]; error?: string }; status?: number; message?: string };
    const directusMsg = errorData.data?.errors?.[0]?.message || errorData.data?.error || errorData.message;
    return json({ error: directusMsg || "Failed to update cluster." }, errorData.status ?? 500);
  }
}
