import { createHash } from "crypto";

export const INVENTORY_SUMMARY_COLLECTION = "fleet_part_inventory_summary";
export const SUMMARY_REFRESH_MAX_ATTEMPTS = 3;

export type PartStockStatus = "available" | "low_stock" | "out_of_stock";
export type SummaryScope = "all" | "branch";

type UnknownRecord = Record<string, unknown>;

type DirectusListResponse<T> = { data?: T[]; meta?: { filter_count?: number; total_count?: number } };
type DirectusItemResponse<T> = { data?: T };

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN || "";

const PART_FIELDS = [
  "id",
  "part_code",
  "part_name",
  "category",
  "category_id.id",
  "category_id.category_name",
  "compatible_vehicle_type_id",
  "compatible_vehicle_type_id.id",
  "unit",
  "minimum_quantity",
  "reorder_level",
  "storage_location",
  "description",
  "is_active",
  "created_at",
  "updated_at",
  "deleted_at",
] as const;

const LEGACY_PART_FIELDS = PART_FIELDS.map((field) => (field === "minimum_quantity" ? "reorder_level" : field));

const STOCK_FIELDS = [
  "id",
  "part_id",
  "branch_id",
  "stock_on_hand",
  "reserved_quantity",
  "damaged_quantity",
  "stock_revision",
  "last_movement_at",
] as const;

const COMPATIBILITY_FIELDS = [
  "id",
  "part_id",
  "vehicle_type_id",
  "vehicle_type_id.id",
] as const;

const BRANCH_FIELDS = ["id", "branch_name", "isActive"] as const;

const SUMMARY_LIST_FIELDS = ["id", "summary_key", "source_fingerprint"] as const;
const UNASSIGNED_BRANCH_KEY = 0;

type DirectusPartRow = {
  id: number;
  part_code?: string | null;
  part_name?: string | null;
  category?: string | null;
  category_id?: unknown;
  compatible_vehicle_type_id?: unknown;
  unit?: string | null;
  minimum_quantity?: number | string | null;
  reorder_level?: number | string | null;
  storage_location?: string | null;
  description?: string | null;
  is_active?: boolean | number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type DirectusStockRow = {
  id: number;
  part_id?: unknown;
  branch_id?: unknown;
  stock_on_hand?: number | string | null;
  reserved_quantity?: number | string | null;
  damaged_quantity?: number | string | null;
  stock_revision?: number | string | null;
  last_movement_at?: string | null;
};

type DirectusCompatibilityRow = {
  id: number;
  part_id?: unknown;
  vehicle_type_id?: unknown;
};

type DirectusBranchRow = {
  id: number;
  branch_name?: string | null;
  isActive?: boolean | number | string | null;
};

type DirectusSummaryStoredRow = {
  id: number;
  summary_key?: string | null;
  source_fingerprint?: string | null;
};

export type BranchStockAggregate = {
  stockOnHand: number;
  reservedQuantity: number;
  damagedQuantity: number;
  availableQuantity: number;
  lastMovementAt: string | null;
  stockRevision: number;
};

export type SummaryPartInput = {
  id: number;
  partCode: string;
  partName: string;
  categoryId: number | null;
  categoryName: string | null;
  unit: string;
  minimumQuantity: number;
  storageLocation: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type SummaryRowPayload = {
  summary_key: string;
  scope: SummaryScope;
  part_id: number;
  branch_id: number | null;
  branch_name: string | null;
  part_code: string;
  part_name: string;
  category_id: number | null;
  category_name: string | null;
  unit: string;
  minimum_quantity: number;
  storage_location: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  stock_on_hand: number;
  reserved_quantity: number;
  damaged_quantity: number;
  available_quantity: number;
  last_movement_at: string | null;
  stock_status: PartStockStatus;
  compatibility_count: number;
  compatible_vehicle_type_keys: string;
  has_stock: boolean;
  has_any_stock: boolean;
  synced_at: string;
  source_fingerprint: string;
};

export type DeriveSummaryInput = {
  part: SummaryPartInput;
  stockByBranch: Map<number, BranchStockAggregate>;
  activeBranches: Array<{ id: number; branchName: string }>;
  compatibilityTypeIds: number[];
  stockRowCount: number;
  fingerprint: string;
  syncedAt: string;
};

const stockStatusSeverity: Record<PartStockStatus, number> = {
  available: 0,
  low_stock: 1,
  out_of_stock: 2,
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNullableString(value: unknown) {
  const text = asString(value).trim();
  return text.length ? text : null;
}

function asNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableNumber(value: unknown, idField = "id"): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const record = asRecord(value);
  return record ? asNullableNumber(record[idField]) : null;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = asString(value).trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes";
}

function relationLabel(value: unknown, field: string) {
  const record = asRecord(value);
  return record ? asNullableString(record[field]) : null;
}

function fields(fieldsList: readonly string[]) {
  return fieldsList.join(",");
}

function filterParam(filter: UnknownRecord) {
  return JSON.stringify(filter);
}

function nowIso() {
  return new Date().toISOString();
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))));
}

export function availableQuantityFromValues(
  stockOnHand: number,
  reservedQuantity: number,
  damagedQuantity: number,
) {
  return stockOnHand - reservedQuantity - damagedQuantity;
}

export function deriveStockStatus(available: number, minimumQuantity: number): PartStockStatus {
  if (available <= 0) return "out_of_stock";
  if (available <= minimumQuantity) return "low_stock";
  return "available";
}

export function worstStockStatus(statuses: PartStockStatus[]) {
  return statuses.reduce<PartStockStatus>(
    (worst, status) => (stockStatusSeverity[status] > stockStatusSeverity[worst] ? status : worst),
    "available",
  );
}

export function deriveAllScopeStockStatus(
  branchStocks: Array<{ availableQuantity: number; hasStockRow: boolean }>,
  minimumQuantity: number,
) {
  if (!branchStocks.some((stock) => stock.hasStockRow)) return "out_of_stock" as const;
  return worstStockStatus(
    branchStocks
      .filter((stock) => stock.hasStockRow)
      .map((stock) => deriveStockStatus(stock.availableQuantity, minimumQuantity)),
  );
}

export function deriveBranchScopeStockStatus(availableQuantity: number, minimumQuantity: number, hasStockRow: boolean) {
  if (!hasStockRow) return deriveStockStatus(0, minimumQuantity);
  return deriveStockStatus(availableQuantity, minimumQuantity);
}

export function buildCompatibleVehicleTypeKeys(typeIds: number[]) {
  const unique = uniqueNumbers(typeIds).sort((left, right) => left - right);
  if (!unique.length) return "";
  return `|${unique.join("|")}|`;
}

export function summaryKeyFor(scope: SummaryScope, partId: number, branchId?: number | null) {
  if (scope === "all") return `${partId}:all`;
  return `${partId}:branch:${branchId}`;
}

export function computeSourceFingerprint(input: {
  minimumQuantity: number;
  isActive: boolean;
  categoryId: number | null;
  partCode: string;
  partName: string;
  compatibilityTypeIds: number[];
  stockByBranch: Map<number, BranchStockAggregate>;
}) {
  const stockPart = Array.from(input.stockByBranch.entries())
    .sort(([left], [right]) => left - right)
    .map(([branchId, stock]) => (
      `${branchId}:${stock.stockRevision}:${stock.stockOnHand}:${stock.reservedQuantity}:${stock.damagedQuantity}`
    ))
    .join(";");
  const compatPart = uniqueNumbers(input.compatibilityTypeIds).sort((left, right) => left - right).join(",");
  const partPart = [
    input.minimumQuantity,
    input.isActive ? 1 : 0,
    input.categoryId ?? "null",
    input.partCode,
    input.partName,
  ].join(":");
  return createHash("sha256").update(`${stockPart}|${compatPart}|${partPart}`).digest("hex");
}

function basePartFields(part: SummaryPartInput, fingerprint: string, syncedAt: string) {
  return {
    part_id: part.id,
    part_code: part.partCode,
    part_name: part.partName,
    category_id: part.categoryId,
    category_name: part.categoryName,
    unit: part.unit,
    minimum_quantity: part.minimumQuantity,
    storage_location: part.storageLocation,
    description: part.description,
    is_active: part.isActive,
    created_at: part.createdAt,
    updated_at: part.updatedAt,
    deleted_at: part.deletedAt,
    compatibility_count: 0,
    compatible_vehicle_type_keys: "",
    synced_at: syncedAt,
    source_fingerprint: fingerprint,
  };
}

export function deriveSummaryRows(input: DeriveSummaryInput): SummaryRowPayload[] {
  const { part, stockByBranch, activeBranches, compatibilityTypeIds, stockRowCount, fingerprint, syncedAt } = input;
  const compatibilityKeys = buildCompatibleVehicleTypeKeys(compatibilityTypeIds);
  const compatibilityCount = uniqueNumbers(compatibilityTypeIds).length;
  const hasAnyStock = stockRowCount > 0;

  const branchStatuses = activeBranches.map((branch) => {
    const stock = stockByBranch.get(branch.id);
    const hasStockRow = stock != null;
    const stockOnHand = stock?.stockOnHand ?? 0;
    const reservedQuantity = stock?.reservedQuantity ?? 0;
    const damagedQuantity = stock?.damagedQuantity ?? 0;
    const availableQuantity = stock?.availableQuantity ?? 0;
    const stockStatus = deriveBranchScopeStockStatus(availableQuantity, part.minimumQuantity, hasStockRow);
    return {
      branch,
      stockOnHand,
      reservedQuantity,
      damagedQuantity,
      availableQuantity,
      lastMovementAt: stock?.lastMovementAt ?? null,
      hasStockRow,
      stockStatus,
    };
  });

  const allStocks = Array.from(stockByBranch.values());
  const allStockOnHand = allStocks.reduce((sum, row) => sum + row.stockOnHand, 0);
  const allReservedQuantity = allStocks.reduce((sum, row) => sum + row.reservedQuantity, 0);
  const allDamagedQuantity = allStocks.reduce((sum, row) => sum + row.damagedQuantity, 0);
  const allAvailableQuantity = allStocks.reduce((sum, row) => sum + row.availableQuantity, 0);
  const allLastMovementAt = allStocks
    .map((row) => row.lastMovementAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const allStockStatus = deriveAllScopeStockStatus(
    allStocks.map((row) => ({ availableQuantity: row.availableQuantity, hasStockRow: true })),
    part.minimumQuantity,
  );

  const shared = {
    ...basePartFields(part, fingerprint, syncedAt),
    compatibility_count: compatibilityCount,
    compatible_vehicle_type_keys: compatibilityKeys,
    has_any_stock: hasAnyStock,
  };

  const allRow: SummaryRowPayload = {
    ...shared,
    summary_key: summaryKeyFor("all", part.id),
    scope: "all",
    branch_id: null,
    branch_name: null,
    stock_on_hand: allStockOnHand,
    reserved_quantity: allReservedQuantity,
    damaged_quantity: allDamagedQuantity,
    available_quantity: allAvailableQuantity,
    last_movement_at: allLastMovementAt,
    stock_status: allStockStatus,
    has_stock: hasAnyStock,
  };

  const branchRows: SummaryRowPayload[] = branchStatuses.map((row) => ({
    ...shared,
    summary_key: summaryKeyFor("branch", part.id, row.branch.id),
    scope: "branch",
    branch_id: row.branch.id,
    branch_name: row.branch.branchName,
    stock_on_hand: row.stockOnHand,
    reserved_quantity: row.reservedQuantity,
    damaged_quantity: row.damagedQuantity,
    available_quantity: row.availableQuantity,
    last_movement_at: row.lastMovementAt,
    stock_status: row.stockStatus,
    has_stock: row.hasStockRow,
  }));

  return [allRow, ...branchRows];
}

export function staleSummaryKeys(
  existingKeys: string[],
  expectedKeys: string[],
) {
  const expected = new Set(expectedKeys);
  return existingKeys.filter((key) => !expected.has(key));
}

export function logSummaryRefreshError(error: unknown, context?: { partId?: number; summaryKey?: string }) {
  console.error("[fleet-inventory-summary] refresh failed", { ...context, error });
}

async function directusRequest<T>(
  path: string,
  init?: RequestInit,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  if (!DIRECTUS_BASE || !DIRECTUS_TOKEN) {
    throw new Error("Directus is not configured for inventory summary sync");
  }
  const url = new URL(`${DIRECTUS_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Directus returned ${response.status}: ${body}`);
  }
  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

async function listItems<T>(
  collection: string,
  params: Record<string, string | number | boolean | undefined>,
) {
  const response = await directusRequest<DirectusListResponse<T>>(`/items/${collection}`, undefined, {
    limit: -1,
    ...params,
  });
  return response.data || [];
}

async function listItemsBatched<T>(
  collection: string,
  params: Record<string, string | number | boolean | undefined>,
  batchSize = 100,
) {
  const rows: T[] = [];
  let page = 1;
  while (true) {
    const response = await directusRequest<DirectusListResponse<T>>(`/items/${collection}`, undefined, {
      ...params,
      limit: batchSize,
      page,
    });
    const batch = response.data || [];
    rows.push(...batch);
    if (batch.length < batchSize) break;
    page += 1;
  }
  return rows;
}

async function createItem<T>(collection: string, payload: UnknownRecord) {
  const response = await directusRequest<DirectusItemResponse<T>>(`/items/${collection}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.data) throw new Error(`Directus did not return created ${collection} record`);
  return response.data;
}

async function updateItem<T>(collection: string, id: number | string, payload: UnknownRecord) {
  const response = await directusRequest<DirectusItemResponse<T>>(`/items/${collection}/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.data) throw new Error(`Directus did not return updated ${collection} record`);
  return response.data;
}

async function deleteItem(collection: string, id: number | string) {
  await directusRequest(`/items/${collection}/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}

function isMinimumQuantityFieldError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("minimum_quantity") || message.includes("reorder_level");
}

function mapPartInput(part: DirectusPartRow): SummaryPartInput {
  return {
    id: part.id,
    partCode: asString(part.part_code),
    partName: asString(part.part_name),
    categoryId: asNullableNumber(part.category_id, "id"),
    categoryName: relationLabel(part.category_id, "category_name") || asNullableString(part.category),
    unit: asString(part.unit),
    minimumQuantity: asNumber(part.minimum_quantity ?? part.reorder_level),
    storageLocation: asNullableString(part.storage_location),
    description: asNullableString(part.description),
    isActive: asBoolean(part.is_active),
    createdAt: part.created_at ?? null,
    updatedAt: part.updated_at ?? null,
    deletedAt: part.deleted_at ?? null,
  };
}

function aggregateStockByBranch(stockRows: DirectusStockRow[]) {
  const stockByBranch = new Map<number, BranchStockAggregate>();
  for (const row of stockRows) {
    const branchId = asNullableNumber(row.branch_id, "id") ?? UNASSIGNED_BRANCH_KEY;
    const stockOnHand = asNumber(row.stock_on_hand);
    const reservedQuantity = asNumber(row.reserved_quantity);
    const damagedQuantity = asNumber(row.damaged_quantity);
    const availableQuantity = availableQuantityFromValues(stockOnHand, reservedQuantity, damagedQuantity);
    const stockRevision = asNumber(row.stock_revision);
    const lastMovementAt = row.last_movement_at ?? null;
    const current = stockByBranch.get(branchId);
    if (!current) {
      stockByBranch.set(branchId, {
        stockOnHand,
        reservedQuantity,
        damagedQuantity,
        availableQuantity,
        lastMovementAt,
        stockRevision,
      });
      continue;
    }
    current.stockOnHand += stockOnHand;
    current.reservedQuantity += reservedQuantity;
    current.damagedQuantity += damagedQuantity;
    current.availableQuantity += availableQuantity;
    current.stockRevision += stockRevision;
    if (lastMovementAt && (!current.lastMovementAt || new Date(lastMovementAt).getTime() > new Date(current.lastMovementAt).getTime())) {
      current.lastMovementAt = lastMovementAt;
    }
  }
  return stockByBranch;
}

function collectCompatibilityTypeIds(part: DirectusPartRow, compatibilityRows: DirectusCompatibilityRow[]) {
  const typeIds = compatibilityRows
    .map((row) => asNullableNumber(row.vehicle_type_id, "id"))
    .filter((id): id is number => id != null);
  const shortcutTypeId = asNullableNumber(part.compatible_vehicle_type_id, "id");
  if (shortcutTypeId != null) typeIds.push(shortcutTypeId);
  return uniqueNumbers(typeIds);
}

async function fetchPart(partId: number) {
  try {
    const response = await directusRequest<DirectusItemResponse<DirectusPartRow>>(`/items/fleet_parts/${partId}`, undefined, {
      fields: fields(PART_FIELDS),
    });
    if (!response.data) throw new Error("Part not found");
    return response.data;
  } catch (error) {
    if (!isMinimumQuantityFieldError(error)) throw error;
    const response = await directusRequest<DirectusItemResponse<DirectusPartRow>>(`/items/fleet_parts/${partId}`, undefined, {
      fields: fields(LEGACY_PART_FIELDS),
    });
    if (!response.data) throw new Error("Part not found");
    return response.data;
  }
}

async function fetchStockRows(partId: number) {
  return listItems<DirectusStockRow>("fleet_part_stock", {
    fields: fields(STOCK_FIELDS),
    filter: filterParam({ part_id: { _eq: partId } }),
  });
}

async function fetchCompatibilityRows(partId: number) {
  return listItems<DirectusCompatibilityRow>("fleet_part_vehicle_compatibility", {
    fields: fields(COMPATIBILITY_FIELDS),
    filter: filterParam({ part_id: { _eq: partId } }),
  });
}

async function fetchActiveBranches() {
  const rows = await listItems<DirectusBranchRow>("branches", {
    fields: fields(BRANCH_FIELDS),
    filter: filterParam({ isActive: { _eq: true } }),
  });
  return rows
    .map((row) => {
      const id = asNullableNumber(row.id);
      if (id == null) return null;
      return { id, branchName: asString(row.branch_name) };
    })
    .filter((row): row is { id: number; branchName: string } => row != null);
}

async function fetchExistingSummaryRows(partId: number) {
  return listItems<DirectusSummaryStoredRow>(INVENTORY_SUMMARY_COLLECTION, {
    fields: fields(SUMMARY_LIST_FIELDS),
    filter: filterParam({ part_id: { _eq: partId } }),
  });
}

async function deleteSummaryRowsForPart(partId: number) {
  const existing = await fetchExistingSummaryRows(partId);
  await Promise.all(existing.map((row) => deleteItem(INVENTORY_SUMMARY_COLLECTION, row.id)));
}

async function upsertSummaryRows(rows: SummaryRowPayload[], existing: DirectusSummaryStoredRow[]) {
  const existingByKey = new Map(
    existing
      .map((row) => [asString(row.summary_key), row] as const)
      .filter(([key]) => key.length > 0),
  );

  for (const row of rows) {
    const current = existingByKey.get(row.summary_key);
    if (current) {
      await updateItem(INVENTORY_SUMMARY_COLLECTION, current.id, row);
      continue;
    }
    await createItem(INVENTORY_SUMMARY_COLLECTION, row);
  }

  const expectedKeys = new Set(rows.map((row) => row.summary_key));
  const staleRows = existing.filter((row) => row.summary_key && !expectedKeys.has(row.summary_key));
  await Promise.all(staleRows.map((row) => deleteItem(INVENTORY_SUMMARY_COLLECTION, row.id)));
}

async function loadRefreshContext(partId: number) {
  const [part, stockRows, compatibilityRows, activeBranches] = await Promise.all([
    fetchPart(partId),
    fetchStockRows(partId),
    fetchCompatibilityRows(partId),
    fetchActiveBranches(),
  ]);

  if (part.deleted_at) {
    return { deleted: true as const };
  }

  const partInput = mapPartInput(part);
  const stockByBranch = aggregateStockByBranch(stockRows);
  const compatibilityTypeIds = collectCompatibilityTypeIds(part, compatibilityRows);
  const fingerprint = computeSourceFingerprint({
    minimumQuantity: partInput.minimumQuantity,
    isActive: partInput.isActive,
    categoryId: partInput.categoryId,
    partCode: partInput.partCode,
    partName: partInput.partName,
    compatibilityTypeIds,
    stockByBranch,
  });

  return {
    deleted: false as const,
    partInput,
    stockByBranch,
    compatibilityTypeIds,
    activeBranches,
    stockRowCount: stockRows.length,
    fingerprint,
  };
}

export async function deleteStaleSummaryRows(partId: number) {
  await deleteSummaryRowsForPart(partId);
}

export async function refreshInventorySummary(partId: number) {
  for (let attempt = 0; attempt < SUMMARY_REFRESH_MAX_ATTEMPTS; attempt += 1) {
    const context = await loadRefreshContext(partId);
    if (context.deleted) {
      await deleteSummaryRowsForPart(partId);
      return;
    }

    const syncedAt = nowIso();
    const rows = deriveSummaryRows({
      part: context.partInput,
      stockByBranch: context.stockByBranch,
      activeBranches: context.activeBranches,
      compatibilityTypeIds: context.compatibilityTypeIds,
      stockRowCount: context.stockRowCount,
      fingerprint: context.fingerprint,
      syncedAt,
    });

    const afterFingerprintContext = await loadRefreshContext(partId);
    if (afterFingerprintContext.deleted) {
      await deleteSummaryRowsForPart(partId);
      return;
    }
    if (afterFingerprintContext.fingerprint !== context.fingerprint) {
      continue;
    }

    const existing = await fetchExistingSummaryRows(partId);
    await upsertSummaryRows(rows, existing);

    const verifyContext = await loadRefreshContext(partId);
    if (verifyContext.deleted) {
      await deleteSummaryRowsForPart(partId);
      return;
    }
    if (verifyContext.fingerprint !== context.fingerprint) {
      continue;
    }
    return;
  }

  throw new Error(`Inventory summary refresh exhausted retries for part ${partId}`);
}

export async function rebuildAllInventorySummaries(options?: { batchSize?: number; partBatchSize?: number }) {
  const partBatchSize = options?.partBatchSize ?? 100;
  const activePartIds: number[] = [];
  let page = 1;

  while (true) {
    const response = await directusRequest<DirectusListResponse<{ id?: number | string | null }>>(
      "/items/fleet_parts",
      undefined,
      {
        fields: "id",
        filter: filterParam({ deleted_at: { _null: true } }),
        limit: partBatchSize,
        page,
        sort: "id",
      },
    );
    const batch = (response.data || [])
      .map((row) => asNullableNumber(row.id))
      .filter((id): id is number => id != null);
    activePartIds.push(...batch);
    if (batch.length < partBatchSize) break;
    page += 1;
  }

  const batchSize = options?.batchSize ?? 10;
  for (let index = 0; index < activePartIds.length; index += batchSize) {
    const slice = activePartIds.slice(index, index + batchSize);
    await Promise.all(slice.map((partId) => refreshInventorySummary(partId)));
  }

  const activeBranchIds = new Set((await fetchActiveBranches()).map((branch) => branch.id));
  const activePartIdSet = new Set(activePartIds);
  const summaryRows = await listItemsBatched<{
    id: number;
    part_id?: number | string | null;
    branch_id?: number | string | null;
    scope?: string | null;
  }>(INVENTORY_SUMMARY_COLLECTION, { fields: "id,part_id,branch_id,scope", limit: 100 });

  const orphanIds = summaryRows
    .filter((row) => {
      const partId = asNullableNumber(row.part_id);
      if (partId == null || !activePartIdSet.has(partId)) return true;
      if (row.scope === "branch") {
        const branchId = asNullableNumber(row.branch_id);
        return branchId == null || !activeBranchIds.has(branchId);
      }
      return false;
    })
    .map((row) => row.id);

  await Promise.all(orphanIds.map((id) => deleteItem(INVENTORY_SUMMARY_COLLECTION, id)));

  return {
    refreshedParts: activePartIds.length,
    deletedOrphans: orphanIds.length,
  };
}
