import { ClusterWithAreas, ClusterFormValues } from "../types";

const API_BASE = "/api/scm/logistics/file-maintenance/cluster-management";

// =============================================================================
// HELPERS
// =============================================================================

function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

async function readError(res: Response) {
  try {
    if (isJsonResponse(res)) {
      const j = await res.json();
      return j?.errors?.[0]?.message || j?.error || JSON.stringify(j);
    }
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/** Fetch all clusters with their nested areas (for table view) */
export async function listClusters(): Promise<{
  data: ClusterWithAreas[];
}> {
  const res = await fetch(`${API_BASE}?type=list`);
  if (!res.ok) throw new Error(await readError(res));
  const json = await res.json();
  return { data: json?.data ?? [] };
}

/** Fetch a single cluster with all its areas (for edit dialog) */
export async function getCluster(
  clusterId: number,
): Promise<ClusterWithAreas> {
  const res = await fetch(
    `${API_BASE}?type=detail&cluster_id=${clusterId}`,
  );
  if (!res.ok) throw new Error(await readError(res));
  const json = await res.json();
  return json?.data;
}

/** Create a new cluster with areas */
export async function createCluster(
  payload: ClusterFormValues,
): Promise<ClusterWithAreas> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = await res.json();
  return json?.data;
}

/** Update an existing cluster and upsert its areas */
export async function updateCluster(
  id: number,
  payload: ClusterFormValues,
): Promise<ClusterWithAreas> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = await res.json();
  return json?.data;
}
