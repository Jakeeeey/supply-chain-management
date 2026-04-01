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

/** 
 * Philippine Location APIs (PSGC)
 * Source: https://psgc.gitlab.io/api/
 *
 * All PSGC fetches are cached in-memory so repeated selections
 * (e.g. switching back to a previously-selected province) are instant.
 */

type GeoItem = { code: string; name: string };

/** Extended type for barangays that includes parent city/municipality codes */
export type BarangayItem = GeoItem & {
  cityCode: string | false;
  municipalityCode: string | false;
};

const cache: Record<string, GeoItem[]> = {};
const brgyCache: Record<string, BarangayItem[]> = {};

export async function fetchProvinces(): Promise<GeoItem[]> {
  if (cache["provinces"]) return cache["provinces"];

  const res = await fetch("https://psgc.gitlab.io/api/provinces");
  if (!res.ok) return [];
  const provinces: GeoItem[] = await res.json();

  // Inject Metro Manila (technically a Region, not a Province)
  provinces.push({ code: "130000000", name: "Metro Manila" });

  // Sort alphabetically so it's easy to find
  provinces.sort((a, b) => a.name.localeCompare(b.name));

  cache["provinces"] = provinces;
  return provinces;
}

export async function fetchCities(provinceCode: string): Promise<GeoItem[]> {
  const key = `cities:${provinceCode}`;
  if (cache[key]) return cache[key];

  // If "Metro Manila" (NCR) is selected, fetch using the region-level endpoint
  const url = provinceCode === "130000000"
    ? `https://psgc.gitlab.io/api/regions/${provinceCode}/cities-municipalities`
    : `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const cities: GeoItem[] = await res.json();

  cache[key] = cities;
  return cities;
}

/**
 * Eager-load ALL barangays for a province (or region for Metro Manila).
 * Returns full barangay objects with cityCode/municipalityCode for local filtering.
 */
export async function fetchAllBarangays(provinceCode: string): Promise<BarangayItem[]> {
  const key = `allBrgys:${provinceCode}`;
  if (brgyCache[key]) return brgyCache[key];

  const url = provinceCode === "130000000"
    ? `https://psgc.gitlab.io/api/regions/${provinceCode}/barangays`
    : `https://psgc.gitlab.io/api/provinces/${provinceCode}/barangays`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const barangays: BarangayItem[] = await res.json();

  brgyCache[key] = barangays;
  return barangays;
}

export async function fetchBarangays(cityCode: string): Promise<GeoItem[]> {
  const key = `barangays:${cityCode}`;
  if (cache[key]) return cache[key];

  const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays`);
  if (!res.ok) return [];
  const barangays: GeoItem[] = await res.json();

  cache[key] = barangays;
  return barangays;
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
