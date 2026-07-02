import type {
  CreateMovementInput,
  CreatePartInput,
  CreateReservationInput,
  MovementFilters,
  PaginatedResponse,
  PartInventoryRow,
  PartMovementRow,
  PartReservationRow,
  PartsInventoryFilters,
  PartsInventoryListResponse,
  PartsLookupData,
  ReportResponse,
  ReservationFilters,
  UpdatePartInput,
  UpdateReservationInput,
} from "../types";

const BASE = "/api/scm/fleet-management/parts-inventory";

async function readError(res: Response) {
  try {
    const json = await res.json();
    return json?.error || json?.errors?.[0]?.message || JSON.stringify(json);
  } catch {
    return res.text();
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as T;
}

function appendIfPresent(params: URLSearchParams, key: string, value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "" || value === "all") return;
  params.set(key, String(value));
}

function appendActiveFilter(params: URLSearchParams, value: PartsInventoryFilters["active"]) {
  params.set("active", value);
}

export async function fetchLookups() {
  return request<PartsLookupData>(`${BASE}/lookups`);
}

export async function fetchParts(filters: PartsInventoryFilters) {
  const params = new URLSearchParams();
  appendIfPresent(params, "search", filters.search);
  appendIfPresent(params, "categoryId", filters.categoryId);
  appendIfPresent(params, "vehicleTypeId", filters.vehicleTypeId);
  appendIfPresent(params, "branchId", filters.branchId);
  appendIfPresent(params, "stockStatus", filters.stockStatus);
  appendActiveFilter(params, filters.active);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
  return request<PartsInventoryListResponse>(`${BASE}?${params}`);
}

export async function fetchPartOptions(search = "") {
  const response = await fetchParts({
    search,
    categoryId: "",
    vehicleTypeId: "",
    branchId: "",
    stockStatus: "all",
    active: "true",
    page: 1,
    limit: 50,
  });
  return response.data;
}

export async function fetchLowStockParts(filters: PartsInventoryFilters) {
  return fetchParts({
    ...filters,
    stockStatus: "needs_attention",
  });
}

export async function fetchPartDetail(partId: number) {
  return request<{ data: PartInventoryRow }>(`${BASE}/${partId}`);
}

export async function createPart(payload: CreatePartInput) {
  return request<{ data: PartInventoryRow }>(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePart(partId: number, payload: UpdatePartInput) {
  return request<{ data: PartInventoryRow }>(`${BASE}/${partId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchMovements(filters: MovementFilters) {
  const params = new URLSearchParams();
  appendIfPresent(params, "search", filters.search);
  appendIfPresent(params, "partId", filters.partId);
  appendIfPresent(params, "branchId", filters.branchId);
  appendIfPresent(params, "vehicleId", filters.vehicleId);
  appendIfPresent(params, "movementType", filters.movementType);
  appendIfPresent(params, "dateFrom", filters.dateFrom);
  appendIfPresent(params, "dateTo", filters.dateTo);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
  return request<PaginatedResponse<PartMovementRow>>(`${BASE}/movements?${params}`);
}

export async function createMovement(payload: CreateMovementInput) {
  return request<{ data: PartMovementRow } | PaginatedResponse<PartMovementRow>>(`${BASE}/movements`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchReservations(filters: ReservationFilters) {
  const params = new URLSearchParams();
  appendIfPresent(params, "search", filters.search);
  appendIfPresent(params, "partId", filters.partId);
  appendIfPresent(params, "branchId", filters.branchId);
  appendIfPresent(params, "vehicleId", filters.vehicleId);
  appendIfPresent(params, "status", filters.status);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
  return request<PaginatedResponse<PartReservationRow>>(`${BASE}/reservations?${params}`);
}

export async function createReservation(payload: CreateReservationInput) {
  return request<{ data: PartReservationRow }>(`${BASE}/reservations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReservation(payload: UpdateReservationInput) {
  return request<{ data: PartReservationRow }>(`${BASE}/reservations`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createPartCategory(name: string) {
  return request<{ data: { id: number; code: string | null; name: string; description: string | null } }>(
    `${BASE}/categories`,
    { method: "POST", body: JSON.stringify({ name }) },
  );
}

export async function fetchReport(type: string, filters: { branchId?: string; vehicleId?: string; categoryId?: string }) {
  const params = new URLSearchParams();
  params.set("type", type);
  appendIfPresent(params, "branchId", filters.branchId);
  appendIfPresent(params, "vehicleId", filters.vehicleId);
  appendIfPresent(params, "categoryId", filters.categoryId);
  return request<ReportResponse>(`${BASE}/reports?${params}`);
}
