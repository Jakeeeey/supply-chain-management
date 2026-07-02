import { z } from "zod";

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
  "compatible_vehicle_type_id.type_name",
  "unit",
  "minimum_quantity",
  "storage_location",
  "description",
  "is_active",
  "created_at",
  "updated_at",
  "deleted_at",
] as const;
const LEGACY_PART_FIELDS = PART_FIELDS.map((field) => field === "minimum_quantity" ? "reorder_level" : field);

const STOCK_FIELDS = [
  "id",
  "part_id",
  "branch_id.id",
  "branch_id.branch_name",
  "stock_on_hand",
  "reserved_quantity",
  "damaged_quantity",
  "last_movement_at",
] as const;

const MOVEMENT_FIELDS = [
  "id",
  "movement_no",
  "part_id",
  "part_id.id",
  "part_id.part_code",
  "part_id.part_name",
  "part_id.category_id.category_name",
  "branch_id.id",
  "branch_id.branch_name",
  "vehicle_id.vehicle_id",
  "vehicle_id.vehicle_plate",
  "vehicle_id.name",
  "motorpool_job_id",
  "reservation_id.id",
  "reservation_id.reservation_no",
  "movement_type",
  "quantity",
  "stock_before",
  "stock_after",
  "reserved_before",
  "reserved_after",
  "damaged_before",
  "damaged_after",
  "reference_no",
  "reason_code",
  "remarks",
  "movement_at",
  "encoded_by",
  "created_at",
] as const;

const RESERVATION_FIELDS = [
  "id",
  "reservation_no",
  "part_id.id",
  "part_id.part_code",
  "part_id.part_name",
  "branch_id.id",
  "branch_id.branch_name",
  "vehicle_id.vehicle_id",
  "vehicle_id.vehicle_plate",
  "vehicle_id.name",
  "motorpool_job_id",
  "reserved_quantity",
  "issued_quantity",
  "returned_quantity",
  "cancelled_quantity",
  "status",
  "needed_at",
  "remarks",
  "created_at",
  "updated_at",
  "cancelled_at",
  "cancel_reason",
] as const;

const CATEGORY_FIELDS = [
  "id",
  "category_code",
  "category_name",
  "description",
  "is_active",
  "deleted_at",
] as const;

const VEHICLE_TYPE_FIELDS = ["id", "type_name"] as const;
const BRANCH_FIELDS = ["id", "branch_code", "branch_name", "isActive"] as const;
const VEHICLE_FIELDS = ["vehicle_id", "vehicle_plate", "name", "vehicle_type", "status"] as const;
const COMPATIBILITY_FIELDS = [
  "id",
  "part_id",
  "vehicle_type_id",
  "vehicle_type_id.id",
  "vehicle_type_id.type_name",
  "notes",
] as const;

type UnknownRecord = Record<string, unknown>;
type ActorId = number | string | null;
type MovementType = "Receiving" | "Issue" | "Return" | "Adjustment" | "Damage";
type ReservationAction = "issue" | "return" | "cancel";
type PartStockStatus = "available" | "low_stock" | "out_of_stock";
type ReportType =
  | "stock_on_hand"
  | "low_stock"
  | "out_of_stock"
  | "usage_by_vehicle"
  | "usage_by_category"
  | "movement_audit";

type DirectusListResponse<T> = { data?: T[]; meta?: unknown };
type DirectusItemResponse<T> = { data?: T };

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
  last_movement_at?: string | null;
};

type DirectusMovementRow = {
  id: number;
  movement_no?: string | null;
  part_id?: unknown;
  branch_id?: unknown;
  vehicle_id?: unknown;
  motorpool_job_id?: number | string | null;
  reservation_id?: unknown;
  movement_type?: MovementType | string | null;
  quantity?: number | string | null;
  stock_before?: number | string | null;
  stock_after?: number | string | null;
  reserved_before?: number | string | null;
  reserved_after?: number | string | null;
  damaged_before?: number | string | null;
  damaged_after?: number | string | null;
  reference_no?: string | null;
  reason_code?: string | null;
  remarks?: string | null;
  movement_at?: string | null;
  encoded_by?: unknown;
  created_at?: string | null;
};

type DirectusReservationRow = {
  id: number;
  reservation_no?: string | null;
  part_id?: unknown;
  branch_id?: unknown;
  vehicle_id?: unknown;
  motorpool_job_id?: number | string | null;
  reserved_quantity?: number | string | null;
  issued_quantity?: number | string | null;
  returned_quantity?: number | string | null;
  cancelled_quantity?: number | string | null;
  status?: string | null;
  needed_at?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
};

type DirectusCompatibilityRow = {
  id: number;
  part_id?: unknown;
  vehicle_type_id?: unknown;
  notes?: string | null;
};

type PartInventoryQuery = z.infer<typeof PartsInventoryQuerySchema>;
type MovementQuery = z.infer<typeof MovementQuerySchema>;
type ReservationQuery = z.infer<typeof ReservationQuerySchema>;
type ReportQuery = z.infer<typeof ReportQuerySchema>;
type PartInventoryFilterQuery = Omit<PartInventoryQuery, "page" | "limit">;
type MovementFilterQuery = Omit<MovementQuery, "page" | "limit">;
type CreatePartRequest = z.infer<typeof CreatePartSchema>;
type UpdatePartRequest = z.infer<typeof UpdatePartSchema>;
type CreateMovementRequest = z.infer<typeof CreateMovementSchema>;
type CreateReservationRequest = z.infer<typeof CreateReservationSchema>;
type UpdateReservationRequest = z.infer<typeof UpdateReservationSchema>;

export class PartsInventoryError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "PartsInventoryError";
  }
}

const optionalNullableNumber = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (value === null) return null;
  return Number(value);
}, z.number().int().positive().nullable().optional());

const optionalNullableString = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}, z.string().nullable().optional());

const nonNegativeNumber = z.preprocess((value) => Number(value), z.number().min(0));
const positiveNumber = z.preprocess((value) => Number(value), z.number().positive());

export const PartsInventoryQuerySchema = z.object({
  search: z.string().optional().default(""),
  categoryId: z.coerce.number().int().positive().optional(),
  vehicleTypeId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  stockStatus: z.enum(["all", "available", "low_stock", "out_of_stock", "needs_attention"]).optional().default("all"),
  active: z.enum(["true", "false", "all"]).optional().default("true"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const MovementQuerySchema = z.object({
  partId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  movementType: z.enum(["Receiving", "Issue", "Return", "Adjustment", "Damage"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const ReservationQuerySchema = z.object({
  partId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  search: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const ReportQuerySchema = z.object({
  type: z
    .enum([
      "stock_on_hand",
      "low_stock",
      "out_of_stock",
      "usage_by_vehicle",
      "usage_by_category",
      "movement_audit",
    ])
    .default("stock_on_hand"),
  branchId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: z.enum(["json", "xlsx", "pdf"]).optional().default("json"),
});

export const CreatePartSchema = z.object({
  partCode: z.string().trim().min(1),
  partName: z.string().trim().min(1),
  categoryId: optionalNullableNumber,
  category: optionalNullableString,
  unit: z.string().trim().min(1),
  minimumQuantity: nonNegativeNumber.default(0),
  storageLocation: optionalNullableString,
  description: optionalNullableString,
  isActive: z.boolean().optional().default(true),
  compatibleVehicleTypeIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  initialStock: z
    .array(
      z.object({
        branchId: optionalNullableNumber,
        stockOnHand: positiveNumber,
      }),
    )
    .optional()
    .default([]),
});

export const UpdatePartSchema = z.object({
  partCode: z.string().trim().min(1).optional(),
  partName: z.string().trim().min(1).optional(),
  categoryId: optionalNullableNumber,
  category: optionalNullableString,
  unit: z.string().trim().min(1).optional(),
  minimumQuantity: nonNegativeNumber.optional(),
  storageLocation: optionalNullableString,
  description: optionalNullableString,
  isActive: z.boolean().optional(),
  compatibleVehicleTypeIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const CreateMovementSchema = z.object({
  partId: z.coerce.number().int().positive(),
  branchId: optionalNullableNumber,
  movementType: z.enum(["Receiving", "Issue", "Return", "Adjustment", "Damage"]),
  adjustmentDirection: z.enum(["IN", "OUT"]).optional().default("IN"),
  quantity: positiveNumber,
  vehicleId: optionalNullableNumber,
  motorpoolJobId: optionalNullableNumber,
  reservationId: optionalNullableNumber,
  referenceNo: optionalNullableString,
  reasonCode: optionalNullableString,
  remarks: optionalNullableString,
  movementAt: z.string().optional(),
});

export const CreateReservationSchema = z.object({
  partId: z.coerce.number().int().positive(),
  branchId: optionalNullableNumber,
  vehicleId: z.coerce.number().int().positive(),
  motorpoolJobId: optionalNullableNumber,
  reservedQuantity: positiveNumber,
  neededAt: optionalNullableString,
  remarks: optionalNullableString,
});

export const UpdateReservationSchema = z.object({
  id: z.coerce.number().int().positive(),
  action: z.enum(["issue", "return", "cancel"]),
  quantity: positiveNumber.optional(),
  referenceNo: optionalNullableString,
  remarks: optionalNullableString,
  cancelReason: optionalNullableString,
});

export function parseQuery<T extends z.ZodTypeAny>(schema: T, searchParams: URLSearchParams): z.infer<T> {
  return schema.parse(Object.fromEntries(searchParams.entries()));
}

export function toApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        error: "Invalid request",
        details: error.issues,
      },
    };
  }

  if (error instanceof PartsInventoryError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        details: error.details,
      },
    };
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return {
    status: 500,
    body: {
      error: message,
    },
  };
}

function directusHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

function directusUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  if (!DIRECTUS_BASE) {
    throw new PartsInventoryError("NEXT_PUBLIC_API_BASE_URL is not configured", 500);
  }

  const url = new URL(`${DIRECTUS_BASE}${path.startsWith("/") ? "" : "/"}${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readDirectusError(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return `Directus request failed with status ${res.status}`;

  try {
    const json = JSON.parse(text) as { errors?: Array<{ message?: string }>; error?: string };
    return json.errors?.[0]?.message || json.error || text;
  } catch {
    return text;
  }
}

function isMinimumQuantityFieldError(error: unknown) {
  return error instanceof PartsInventoryError && error.message.includes("minimum_quantity");
}

function legacyMinimumQuantityPayload(payload: UnknownRecord) {
  if (!Object.hasOwn(payload, "minimum_quantity")) return payload;
  const legacyPayload = { ...payload };
  legacyPayload.reorder_level = legacyPayload.minimum_quantity;
  delete legacyPayload.minimum_quantity;
  return legacyPayload;
}

async function directusRequest<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | boolean | undefined>,
) {
  const res = await fetch(directusUrl(path, params), {
    ...options,
    cache: "no-store",
    headers: {
      ...directusHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new PartsInventoryError(await readDirectusError(res), res.status);
  }

  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

async function listItems<T>(
  collection: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  const response = await directusRequest<DirectusListResponse<T>>(`/items/${collection}`, undefined, params);
  return Array.isArray(response.data) ? response.data : [];
}

async function getItem<T>(
  collection: string,
  id: number | string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  const response = await directusRequest<DirectusItemResponse<T>>(`/items/${collection}/${encodeURIComponent(String(id))}`, undefined, params);
  if (!response.data) throw new PartsInventoryError("Record not found", 404);
  return response.data;
}

async function createItem<T>(collection: string, payload: UnknownRecord) {
  const response = await directusRequest<DirectusItemResponse<T>>(`/items/${collection}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.data) throw new PartsInventoryError("Directus did not return created record", 500);
  return response.data;
}

async function updateItem<T>(collection: string, id: number | string, payload: UnknownRecord) {
  const response = await directusRequest<DirectusItemResponse<T>>(`/items/${collection}/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.data) throw new PartsInventoryError("Directus did not return updated record", 500);
  return response.data;
}

async function deleteItem(collection: string, id: number | string) {
  await directusRequest(`/items/${collection}/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

function fields(fieldsList: readonly string[]) {
  return fieldsList.join(",");
}

function filterParam(filter: UnknownRecord) {
  return JSON.stringify(filter);
}

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

function asBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "1", "yes", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive"].includes(normalized)) return false;
  }
  return fallback;
}

function relationLabel(value: unknown, field: string) {
  const record = asRecord(value);
  return record ? asNullableString(record[field]) : null;
}

function nowIso() {
  return new Date().toISOString();
}

function generatedRef(prefix: string) {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

function availableQuantity(stock: Pick<DirectusStockRow, "stock_on_hand" | "reserved_quantity" | "damaged_quantity">) {
  return asNumber(stock.stock_on_hand) - asNumber(stock.reserved_quantity) - asNumber(stock.damaged_quantity);
}

function stockStatus(available: number, minimumQuantity: number): PartStockStatus {
  if (available <= 0) return "out_of_stock";
  if (available <= minimumQuantity) return "low_stock";
  return "available";
}

const stockStatusSeverity: Record<PartStockStatus, number> = {
  available: 0,
  low_stock: 1,
  out_of_stock: 2,
};

function worstStockStatus(statuses: PartStockStatus[]) {
  return statuses.reduce<PartStockStatus>(
    (worst, status) => (stockStatusSeverity[status] > stockStatusSeverity[worst] ? status : worst),
    "available",
  );
}

function statusLabel(status: PartStockStatus) {
  if (status === "out_of_stock") return "Out of Stock";
  if (status === "low_stock") return "Low Stock";
  return "Available";
}

function partIdFrom(value: unknown) {
  return asNullableNumber(value, "id");
}

function branchIdFrom(value: unknown) {
  return asNullableNumber(value, "id");
}

function vehicleIdFrom(value: unknown) {
  return asNullableNumber(value, "vehicle_id");
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))));
}

function paginate<T>(rows: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return rows.slice(start, start + limit);
}

function stockFilter(partId: number, branchId?: number | null): UnknownRecord {
  return {
    part_id: { _eq: partId },
    branch_id: branchId == null ? { _null: true } : { _eq: branchId },
  };
}

function movementDateFilter(query: Pick<MovementQuery, "dateFrom" | "dateTo">) {
  const dateFilter: UnknownRecord = {};
  if (query.dateFrom) dateFilter._gte = query.dateFrom;
  if (query.dateTo) dateFilter._lte = query.dateTo;
  return Object.keys(dateFilter).length ? { movement_at: dateFilter } : {};
}

async function fetchPart(partId: number) {
  try {
    return await getItem<DirectusPartRow>("fleet_parts", partId, {
      fields: fields(PART_FIELDS),
    });
  } catch (error) {
    if (!isMinimumQuantityFieldError(error)) throw error;
    return getItem<DirectusPartRow>("fleet_parts", partId, {
      fields: fields(LEGACY_PART_FIELDS),
    });
  }
}

async function fetchParts() {
  const params = {
    limit: -1,
    fields: fields(PART_FIELDS),
    filter: filterParam({ deleted_at: { _null: true } }),
    sort: "part_code",
  };

  try {
    return await listItems<DirectusPartRow>("fleet_parts", params);
  } catch (error) {
    if (!isMinimumQuantityFieldError(error)) throw error;
    return listItems<DirectusPartRow>("fleet_parts", {
      ...params,
      fields: fields(LEGACY_PART_FIELDS),
    });
  }
}

async function fetchStockRows(partIds: number[]) {
  if (!partIds.length) return [];
  return listItems<DirectusStockRow>("fleet_part_stock", {
    limit: -1,
    fields: fields(STOCK_FIELDS),
    filter: filterParam({ part_id: { _in: partIds } }),
  });
}

async function fetchCompatibilityRows(partIds: number[]) {
  if (!partIds.length) return [];
  return listItems<DirectusCompatibilityRow>("fleet_part_vehicle_compatibility", {
    limit: -1,
    fields: fields(COMPATIBILITY_FIELDS),
    filter: filterParam({ part_id: { _in: partIds } }),
  });
}

async function fetchVehicleTypeNameMap(): Promise<Map<number, string>> {
  const rows = await listItems<{ id?: number | string | null; type_name?: string | null }>(
    "vehicle_type",
    { limit: -1, fields: "id,type_name", sort: "id" },
  );
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = asNullableNumber(row.id);
    const name = asNullableString(row.type_name);
    if (id != null && name) map.set(id, name);
  }
  return map;
}

async function fetchStockRow(partId: number, branchId?: number | null) {
  const rows = await listItems<DirectusStockRow>("fleet_part_stock", {
    limit: 1,
    fields: fields(STOCK_FIELDS),
    filter: filterParam(stockFilter(partId, branchId)),
  });
  return rows[0] || null;
}

async function ensureStockRow(partId: number, branchId: number | null | undefined, actorId: ActorId) {
  const existing = await fetchStockRow(partId, branchId);
  if (existing) return existing;

  return createItem<DirectusStockRow>("fleet_part_stock", {
    part_id: partId,
    branch_id: branchId ?? null,
    stock_on_hand: 0,
    reserved_quantity: 0,
    damaged_quantity: 0,
    created_at: nowIso(),
    created_by: actorId,
  });
}

async function assertPartCodeAvailable(partCode: string, ignorePartId?: number) {
  const rows = await listItems<{ id: number }>("fleet_parts", {
    limit: 1,
    fields: "id",
    filter: filterParam({
      part_code: { _eq: partCode },
      deleted_at: { _null: true },
      ...(ignorePartId ? { id: { _neq: ignorePartId } } : {}),
    }),
  });

  if (rows.length) {
    throw new PartsInventoryError("Part code already exists", 409, { partCode });
  }
}

async function countMovementsForPart(partId: number) {
  const rows = await listItems<{ id: number }>("fleet_part_movements", {
    limit: 1,
    fields: "id",
    filter: filterParam({ part_id: { _eq: partId } }),
  });
  return rows.length;
}

async function countActiveReservationsForPart(partId: number) {
  const rows = await listItems<{ id: number }>("fleet_part_reservations", {
    limit: 1,
    fields: "id",
    filter: filterParam({
      part_id: { _eq: partId },
      status: { _in: ["Reserved", "Partially Issued", "Issued"] },
    }),
  });
  return rows.length;
}

function mapBranchStock(stock: DirectusStockRow) {
  const stockOnHand = asNumber(stock.stock_on_hand);
  const reservedQuantity = asNumber(stock.reserved_quantity);
  const damagedQuantity = asNumber(stock.damaged_quantity);
  const available = stockOnHand - reservedQuantity - damagedQuantity;

  return {
    id: stock.id,
    branchId: branchIdFrom(stock.branch_id),
    branchName: relationLabel(stock.branch_id, "branch_name"),
    stockOnHand,
    reservedQuantity,
    damagedQuantity,
    availableQuantity: available,
    lastMovementAt: stock.last_movement_at || null,
  };
}

function branchAwareStockStatus(
  branchStock: Array<ReturnType<typeof mapBranchStock>>,
  minimumQuantity: number,
) {
  if (!branchStock.length) return stockStatus(0, minimumQuantity);
  return worstStockStatus(branchStock.map((stock) => stockStatus(stock.availableQuantity, minimumQuantity)));
}

function resolveVehicleTypeName(
  vehicleTypeId: number,
  compatibilityRow: DirectusCompatibilityRow | null,
  vehicleTypeNameMap: Map<number, string>,
): string {
  if (compatibilityRow) {
    const expandedName = relationLabel(compatibilityRow.vehicle_type_id, "type_name");
    if (expandedName) return expandedName;
  }
  return vehicleTypeNameMap.get(vehicleTypeId) ?? `Type #${vehicleTypeId}`;
}

function mapPartRow(
  part: DirectusPartRow,
  stockRows: DirectusStockRow[],
  compatibilityRows: DirectusCompatibilityRow[],
  vehicleTypeNameMap: Map<number, string>,
) {
  const partId = part.id;
  const partStocks = stockRows.filter((stock) => partIdFrom(stock.part_id) === partId);
  const compatibleVehicleTypes = compatibilityRows
    .filter((row) => partIdFrom(row.part_id) === partId)
    .map((row) => {
      const typeId = asNullableNumber(row.vehicle_type_id, "id");
      if (typeId == null) return null;
      return {
        id: typeId,
        name: resolveVehicleTypeName(typeId, row, vehicleTypeNameMap),
      };
    })
    .filter((row): row is { id: number; name: string } => row != null);

  const shortcutTypeId = asNullableNumber(part.compatible_vehicle_type_id, "id");
  if (shortcutTypeId && !compatibleVehicleTypes.some((row) => row.id === shortcutTypeId)) {
    compatibleVehicleTypes.push({
      id: shortcutTypeId,
      name: relationLabel(part.compatible_vehicle_type_id, "type_name") || vehicleTypeNameMap.get(shortcutTypeId) || `Type #${shortcutTypeId}`,
    });
  }

  const branchStock = partStocks.map(mapBranchStock);
  const totalStockOnHand = branchStock.reduce((sum, stock) => sum + stock.stockOnHand, 0);
  const totalReservedQuantity = branchStock.reduce((sum, stock) => sum + stock.reservedQuantity, 0);
  const totalDamagedQuantity = branchStock.reduce((sum, stock) => sum + stock.damagedQuantity, 0);
  const totalAvailableQuantity = branchStock.reduce((sum, stock) => sum + stock.availableQuantity, 0);
  const minimumQuantity = asNumber(part.minimum_quantity ?? part.reorder_level);
  const computedStatus = branchAwareStockStatus(branchStock, minimumQuantity);

  return {
    id: partId,
    partCode: asString(part.part_code),
    partName: asString(part.part_name),
    categoryId: asNullableNumber(part.category_id, "id"),
    categoryName: relationLabel(part.category_id, "category_name") || asNullableString(part.category),
    unit: asString(part.unit),
    minimumQuantity,
    storageLocation: asNullableString(part.storage_location),
    description: asNullableString(part.description),
    compatibleVehicleTypes,
    branchStock,
    totalStockOnHand,
    totalReservedQuantity,
    totalDamagedQuantity,
    totalAvailableQuantity,
    stockStatus: computedStatus,
    stockStatusLabel: statusLabel(computedStatus),
    isActive: asBoolean(part.is_active),
    createdAt: part.created_at || null,
    updatedAt: part.updated_at || null,
  };
}

function mapMovement(row: DirectusMovementRow) {
  return {
    id: row.id,
    movementNo: asString(row.movement_no),
    partId: asNullableNumber(row.part_id, "id"),
    partCode: relationLabel(row.part_id, "part_code"),
    partName: relationLabel(row.part_id, "part_name"),
    categoryName: relationLabel(asRecord(row.part_id)?.category_id, "category_name"),
    branchId: branchIdFrom(row.branch_id),
    branchName: relationLabel(row.branch_id, "branch_name"),
    vehicleId: vehicleIdFrom(row.vehicle_id),
    vehiclePlate: relationLabel(row.vehicle_id, "vehicle_plate"),
    vehicleName: relationLabel(row.vehicle_id, "name"),
    motorpoolJobId: asNullableNumber(row.motorpool_job_id),
    reservationId: asNullableNumber(row.reservation_id, "id"),
    reservationNo: relationLabel(row.reservation_id, "reservation_no"),
    movementType: asString(row.movement_type),
    quantity: asNumber(row.quantity),
    stockBefore: asNumber(row.stock_before),
    stockAfter: asNumber(row.stock_after),
    reservedBefore: asNumber(row.reserved_before),
    reservedAfter: asNumber(row.reserved_after),
    damagedBefore: asNumber(row.damaged_before),
    damagedAfter: asNumber(row.damaged_after),
    referenceNo: asNullableString(row.reference_no),
    reasonCode: asNullableString(row.reason_code),
    remarks: asNullableString(row.remarks),
    movementAt: row.movement_at || row.created_at || null,
    encodedBy: row.encoded_by ?? null,
  };
}

async function enrichMovementRowsWithParts(
  rows: Array<ReturnType<typeof mapMovement>>,
): Promise<Array<ReturnType<typeof mapMovement>>> {
  const missingPartIds = uniqueNumbers(
    rows.filter((row) => row.partId != null && (!row.partCode || !row.partName)).map((row) => row.partId),
  );
  if (missingPartIds.length === 0) return rows;

  const partRows = await listItems<{ id?: number | string | null; part_code?: string | null; part_name?: string | null }>(
    "fleet_parts",
    {
      limit: -1,
      fields: "id,part_code,part_name",
      filter: filterParam({ id: { _in: missingPartIds }, deleted_at: { _null: true } }),
    },
  );
  const partMap = new Map<number, { code: string | null; name: string | null }>();
  for (const part of partRows) {
    const id = asNullableNumber(part.id);
    if (id != null) partMap.set(id, { code: asNullableString(part.part_code), name: asNullableString(part.part_name) });
  }

  return rows.map((row) => {
    if ((row.partCode && row.partName) || row.partId == null) return row;
    const fallback = partMap.get(row.partId);
    if (!fallback) return row;
    return {
      ...row,
      partCode: row.partCode || fallback.code,
      partName: row.partName || fallback.name,
    };
  });
}

function mapReservation(row: DirectusReservationRow) {
  const reservedQuantity = asNumber(row.reserved_quantity);
  const issuedQuantity = asNumber(row.issued_quantity);
  const returnedQuantity = asNumber(row.returned_quantity);
  const cancelledQuantity = asNumber(row.cancelled_quantity);
  return {
    id: row.id,
    reservationNo: asString(row.reservation_no),
    partId: asNullableNumber(row.part_id, "id"),
    partCode: relationLabel(row.part_id, "part_code"),
    partName: relationLabel(row.part_id, "part_name"),
    branchId: branchIdFrom(row.branch_id),
    branchName: relationLabel(row.branch_id, "branch_name"),
    vehicleId: vehicleIdFrom(row.vehicle_id),
    vehiclePlate: relationLabel(row.vehicle_id, "vehicle_plate"),
    vehicleName: relationLabel(row.vehicle_id, "name"),
    motorpoolJobId: asNullableNumber(row.motorpool_job_id),
    reservedQuantity,
    issuedQuantity,
    returnedQuantity,
    cancelledQuantity,
    remainingQuantity: Math.max(0, reservedQuantity - issuedQuantity - cancelledQuantity),
    returnableQuantity: Math.max(0, issuedQuantity - returnedQuantity),
    status: asString(row.status),
    neededAt: row.needed_at || null,
    remarks: asNullableString(row.remarks),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    cancelReason: asNullableString(row.cancel_reason),
  };
}

function matchesVehicleTypeFilter(row: ReturnType<typeof mapPartRow>, vehicleTypeId?: number) {
  if (!vehicleTypeId) return true;
  if (!row.compatibleVehicleTypes.length) return true;
  return row.compatibleVehicleTypes.some((type) => type.id === vehicleTypeId);
}

function matchesStockStatusFilter(
  row: ReturnType<typeof mapPartRow>,
  stockStatusFilter: PartInventoryFilterQuery["stockStatus"],
) {
  if (stockStatusFilter === "all") return true;
  if (stockStatusFilter === "needs_attention") return row.stockStatus !== "available";
  return row.stockStatus === stockStatusFilter;
}

async function getFilteredPartRows(query: PartInventoryFilterQuery) {
  const parts = await fetchParts();

  const partIds = parts.map((part) => part.id);
  const [stockRows, compatibilityRows, vehicleTypeNameMap] = await Promise.all([
    fetchStockRows(partIds),
    fetchCompatibilityRows(partIds),
    fetchVehicleTypeNameMap(),
  ]);

  const search = query.search.trim().toLowerCase();
  const rows = parts
    .map((part) => mapPartRow(part, stockRows, compatibilityRows, vehicleTypeNameMap))
    .map((row) => {
      if (!query.branchId) return row;
      const branchStock = row.branchStock.filter((stock) => stock.branchId === query.branchId);
      const totalStockOnHand = branchStock.reduce((sum, stock) => sum + stock.stockOnHand, 0);
      const totalReservedQuantity = branchStock.reduce((sum, stock) => sum + stock.reservedQuantity, 0);
      const totalDamagedQuantity = branchStock.reduce((sum, stock) => sum + stock.damagedQuantity, 0);
      const totalAvailableQuantity = branchStock.reduce((sum, stock) => sum + stock.availableQuantity, 0);
      const computedStatus = stockStatus(totalAvailableQuantity, row.minimumQuantity);
      return {
        ...row,
        branchStock,
        totalStockOnHand,
        totalReservedQuantity,
        totalDamagedQuantity,
        totalAvailableQuantity,
        stockStatus: computedStatus,
        stockStatusLabel: statusLabel(computedStatus),
      };
    })
    .filter((row) => {
      if (query.active === "true" && !row.isActive) return false;
      if (query.active === "false" && row.isActive) return false;
      if (query.categoryId && row.categoryId !== query.categoryId) return false;
      if (!matchesVehicleTypeFilter(row, query.vehicleTypeId)) return false;
      if (!matchesStockStatusFilter(row, query.stockStatus)) return false;
      if (search) {
        const haystack = [
          row.partCode,
          row.partName,
          row.categoryName || "",
          row.storageLocation || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

  const summary = {
    totalParts: rows.length,
    lowStockCount: rows.filter((row) => row.stockStatus === "low_stock").length,
    outOfStockCount: rows.filter((row) => row.stockStatus === "out_of_stock").length,
    totalAvailableQuantity: rows.reduce((sum, row) => sum + row.totalAvailableQuantity, 0),
  };

  return { rows, summary };
}

export async function listParts(query: PartInventoryQuery) {
  const { rows, summary } = await getFilteredPartRows(query);

  return {
    data: paginate(rows, query.page, query.limit),
    meta: {
      page: query.page,
      limit: query.limit,
      total: rows.length,
    },
    summary,
  };
}

export async function getPartDetail(partId: number) {
  const part = await fetchPart(partId);
  const [stockRows, compatibilityRows, movements, reservations, vehicleTypeNameMap] = await Promise.all([
    fetchStockRows([partId]),
    fetchCompatibilityRows([partId]),
    listMovements({ partId, search: "", page: 1, limit: 10 }),
    listReservations({ partId, search: "", page: 1, limit: 10 }),
    fetchVehicleTypeNameMap(),
  ]);

  return {
    data: {
      ...mapPartRow(part, stockRows, compatibilityRows, vehicleTypeNameMap),
      recentMovements: movements.data,
      activeReservations: reservations.data.filter((row) => !["Cancelled", "Returned"].includes(row.status)),
    },
  };
}

async function replaceCompatibility(partId: number, vehicleTypeIds: number[], actorId: ActorId) {
  const existing = await listItems<DirectusCompatibilityRow>("fleet_part_vehicle_compatibility", {
    limit: -1,
    fields: "id",
    filter: filterParam({ part_id: { _eq: partId } }),
  });

  await Promise.all(existing.map((row) => deleteItem("fleet_part_vehicle_compatibility", row.id)));

  const uniqueTypeIds = uniqueNumbers(vehicleTypeIds);
  await Promise.all(
    uniqueTypeIds.map((vehicleTypeId) =>
      createItem<DirectusCompatibilityRow>("fleet_part_vehicle_compatibility", {
        part_id: partId,
        vehicle_type_id: vehicleTypeId,
        created_at: nowIso(),
        created_by: actorId,
      }),
    ),
  );
}

export async function createPart(body: CreatePartRequest, actorId: ActorId) {
  await assertPartCodeAvailable(body.partCode);

  const payload = {
    part_code: body.partCode,
    part_name: body.partName,
    category_id: body.categoryId ?? null,
    category: body.category ?? null,
    unit: body.unit,
    minimum_quantity: body.minimumQuantity,
    storage_location: body.storageLocation ?? null,
    description: body.description ?? null,
    is_active: body.isActive,
    created_at: nowIso(),
    created_by: actorId,
  };

  let part: DirectusPartRow;
  try {
    part = await createItem<DirectusPartRow>("fleet_parts", payload);
  } catch (error) {
    if (!isMinimumQuantityFieldError(error)) throw error;
    part = await createItem<DirectusPartRow>("fleet_parts", legacyMinimumQuantityPayload(payload));
  }

  await replaceCompatibility(part.id, body.compatibleVehicleTypeIds, actorId);

  for (const stock of body.initialStock) {
    if (stock.stockOnHand <= 0) continue;
    const stockRow = await ensureStockRow(part.id, stock.branchId ?? null, actorId);
    await applyStockMovement(
      {
        partId: part.id,
        branchId: stock.branchId ?? null,
        movementType: "Receiving",
        adjustmentDirection: "IN",
        quantity: stock.stockOnHand,
        vehicleId: null,
        motorpoolJobId: null,
        reservationId: null,
        referenceNo: "INITIAL-STOCK",
        reasonCode: null,
        remarks: "Initial stock",
        movementAt: nowIso(),
      },
      actorId,
      stockRow,
    );
  }

  return getPartDetail(part.id);
}

export async function updatePart(partId: number, body: UpdatePartRequest, actorId: ActorId) {
  const existing = await fetchPart(partId);

  if (body.partCode && body.partCode !== existing.part_code) {
    const movementCount = await countMovementsForPart(partId);
    if (movementCount > 0) {
      throw new PartsInventoryError("Part code cannot be changed after movements exist", 409);
    }
    await assertPartCodeAvailable(body.partCode, partId);
  }

  if (body.isActive === false && asBoolean(existing.is_active)) {
    const activeReservationCount = await countActiveReservationsForPart(partId);
    if (activeReservationCount > 0) {
      throw new PartsInventoryError("Part cannot be deactivated while active reservations exist", 409);
    }
  }

  const payload: UnknownRecord = {
    updated_at: nowIso(),
    updated_by: actorId,
  };

  if (body.partCode !== undefined) payload.part_code = body.partCode;
  if (body.partName !== undefined) payload.part_name = body.partName;
  if (body.categoryId !== undefined) payload.category_id = body.categoryId;
  if (body.category !== undefined) payload.category = body.category;
  if (body.unit !== undefined) payload.unit = body.unit;
  if (body.minimumQuantity !== undefined) payload.minimum_quantity = body.minimumQuantity;
  if (body.storageLocation !== undefined) payload.storage_location = body.storageLocation;
  if (body.description !== undefined) payload.description = body.description;
  if (body.isActive !== undefined) payload.is_active = body.isActive;

  try {
    await updateItem<DirectusPartRow>("fleet_parts", partId, payload);
  } catch (error) {
    if (!isMinimumQuantityFieldError(error)) throw error;
    await updateItem<DirectusPartRow>("fleet_parts", partId, legacyMinimumQuantityPayload(payload));
  }

  if (body.compatibleVehicleTypeIds) {
    await replaceCompatibility(partId, body.compatibleVehicleTypeIds, actorId);
  }

  return getPartDetail(partId);
}

function assertActivePart(part: DirectusPartRow, movementType?: MovementType) {
  if (asBoolean(part.is_active)) return;
  if (movementType === "Return") return;
  throw new PartsInventoryError("Inactive parts cannot receive new stock operations", 409);
}

function stockConflictDetails(stock: DirectusStockRow, requestedQuantity: number) {
  return {
    stockOnHand: asNumber(stock.stock_on_hand),
    reservedQuantity: asNumber(stock.reserved_quantity),
    damagedQuantity: asNumber(stock.damaged_quantity),
    availableQuantity: availableQuantity(stock),
    requestedQuantity,
  };
}

async function patchStockAndCreateMovement(
  stock: DirectusStockRow,
  after: { stockOnHand: number; reservedQuantity: number; damagedQuantity: number },
  body: CreateMovementRequest,
  actorId: ActorId,
) {
  if (after.stockOnHand < 0 || after.reservedQuantity < 0 || after.damagedQuantity < 0) {
    throw new PartsInventoryError("Stock operation would create a negative balance", 409, {
      before: stockConflictDetails(stock, body.quantity),
      after,
    });
  }

  const now = nowIso();
  const beforeStockOnHand = asNumber(stock.stock_on_hand);
  const beforeReserved = asNumber(stock.reserved_quantity);
  const beforeDamaged = asNumber(stock.damaged_quantity);

  await updateItem<DirectusStockRow>("fleet_part_stock", stock.id, {
    stock_on_hand: after.stockOnHand,
    reserved_quantity: after.reservedQuantity,
    damaged_quantity: after.damagedQuantity,
    last_movement_at: body.movementAt || now,
    updated_at: now,
    updated_by: actorId,
  });

  return createItem<DirectusMovementRow>("fleet_part_movements", {
    movement_no: generatedRef("FPM"),
    part_id: body.partId,
    branch_id: body.branchId ?? null,
    vehicle_id: body.vehicleId ?? null,
    motorpool_job_id: body.motorpoolJobId ?? null,
    reservation_id: body.reservationId ?? null,
    movement_type: body.movementType,
    quantity: body.quantity,
    stock_before: beforeStockOnHand,
    stock_after: after.stockOnHand,
    reserved_before: beforeReserved,
    reserved_after: after.reservedQuantity,
    damaged_before: beforeDamaged,
    damaged_after: after.damagedQuantity,
    reference_no: body.referenceNo ?? null,
    reason_code: body.reasonCode ?? null,
    remarks: body.remarks ?? null,
    movement_at: body.movementAt || now,
    encoded_by: actorId,
    created_at: now,
    created_by: actorId,
  });
}

function canCreateMissingStockRow(body: CreateMovementRequest) {
  if (body.movementType === "Receiving" || body.movementType === "Return") return true;
  return body.movementType === "Adjustment" && body.adjustmentDirection !== "OUT";
}

async function applyStockMovement(
  body: CreateMovementRequest,
  actorId: ActorId,
  stockRow?: DirectusStockRow,
) {
  const part = await fetchPart(body.partId);
  assertActivePart(part, body.movementType);

  if (body.quantity <= 0) {
    throw new PartsInventoryError("Quantity must be greater than zero", 400);
  }

  if ((body.movementType === "Adjustment" || body.movementType === "Damage") && (!body.reasonCode || !body.remarks)) {
    throw new PartsInventoryError("Reason code and remarks are required for adjustment and damage movements", 400);
  }

  if (body.movementType === "Issue" && !body.vehicleId && !body.motorpoolJobId && !body.reservationId && !body.referenceNo) {
    throw new PartsInventoryError("Issue requires a vehicle, reservation, job, or reference number", 400);
  }

  if (body.movementType === "Return" && !body.vehicleId && !body.motorpoolJobId && !body.reservationId && !body.referenceNo) {
    throw new PartsInventoryError("Return requires a vehicle, reservation, job, or reference number", 400);
  }

  const stock = stockRow || (canCreateMissingStockRow(body)
    ? await ensureStockRow(body.partId, body.branchId ?? null, actorId)
    : await fetchStockRow(body.partId, body.branchId ?? null));

  if (!stock) {
    throw new PartsInventoryError("Stock row does not exist for this part and branch", 404);
  }

  const stockOnHand = asNumber(stock.stock_on_hand);
  const reservedQuantity = asNumber(stock.reserved_quantity);
  const damagedQuantity = asNumber(stock.damaged_quantity);
  const available = stockOnHand - reservedQuantity - damagedQuantity;
  let after = { stockOnHand, reservedQuantity, damagedQuantity };

  if (body.movementType === "Receiving") {
    after = { ...after, stockOnHand: stockOnHand + body.quantity };
  }

  if (body.movementType === "Issue") {
    if (!body.reservationId && available < body.quantity) {
      throw new PartsInventoryError("Insufficient available stock", 409, stockConflictDetails(stock, body.quantity));
    }
    if (body.reservationId && reservedQuantity < body.quantity) {
      throw new PartsInventoryError("Reserved stock is not enough for this issue", 409, stockConflictDetails(stock, body.quantity));
    }
    after = {
      stockOnHand: stockOnHand - body.quantity,
      reservedQuantity: body.reservationId ? reservedQuantity - body.quantity : reservedQuantity,
      damagedQuantity,
    };
  }

  if (body.movementType === "Return") {
    after = { ...after, stockOnHand: stockOnHand + body.quantity };
  }

  if (body.movementType === "Adjustment") {
    if (body.adjustmentDirection === "OUT") {
      if (available < body.quantity) {
        throw new PartsInventoryError("Insufficient available stock", 409, stockConflictDetails(stock, body.quantity));
      }
      after = { ...after, stockOnHand: stockOnHand - body.quantity };
    } else {
      after = { ...after, stockOnHand: stockOnHand + body.quantity };
    }
  }

  if (body.movementType === "Damage") {
    const damageCapacity = stockOnHand - reservedQuantity - damagedQuantity;
    if (damageCapacity < body.quantity) {
      throw new PartsInventoryError("Damaged quantity cannot exceed unreserved physical stock", 409, stockConflictDetails(stock, body.quantity));
    }
    after = { ...after, damagedQuantity: damagedQuantity + body.quantity };
  }

  return patchStockAndCreateMovement(stock, after, body, actorId);
}

export async function createMovement(body: CreateMovementRequest, actorId: ActorId) {
  if (body.reservationId && (body.movementType === "Issue" || body.movementType === "Return")) {
    const action: ReservationAction = body.movementType === "Issue" ? "issue" : "return";
    await applyReservationAction(
      {
        id: body.reservationId,
        action,
        quantity: body.quantity,
        referenceNo: body.referenceNo ?? null,
        remarks: body.remarks ?? null,
        cancelReason: null,
      },
      actorId,
      body,
    );
    return listMovements({ partId: body.partId, search: "", page: 1, limit: 1 });
  }

  const movement = await applyStockMovement(body, actorId);
  const enriched = await enrichMovementRowsWithParts([mapMovement(movement)]);
  return { data: enriched[0] };
}

async function fetchReservation(reservationId: number) {
  return getItem<DirectusReservationRow>("fleet_part_reservations", reservationId, {
    fields: fields(RESERVATION_FIELDS),
  });
}

async function assertVehicleCompatible(partId: number, vehicleId: number) {
  const compatibilityRows = await fetchCompatibilityRows([partId]);
  const compatibleTypeIds = uniqueNumbers(
    compatibilityRows.map((row) => asNullableNumber(row.vehicle_type_id, "id")),
  );

  if (!compatibleTypeIds.length) return;

  const vehicle = await getItem<{ vehicle_id: number; vehicle_type?: unknown }>("vehicles", vehicleId, {
    fields: "vehicle_id,vehicle_type",
  });
  const vehicleTypeId = asNullableNumber(vehicle.vehicle_type, "id") ?? asNullableNumber(vehicle.vehicle_type);
  if (!vehicleTypeId || !compatibleTypeIds.includes(vehicleTypeId)) {
    throw new PartsInventoryError("Part is not compatible with the selected vehicle type", 409, {
      partId,
      vehicleId,
      compatibleVehicleTypeIds: compatibleTypeIds,
      vehicleTypeId,
    });
  }
}

export async function createReservation(body: CreateReservationRequest, actorId: ActorId) {
  const part = await fetchPart(body.partId);
  assertActivePart(part);
  await assertVehicleCompatible(body.partId, body.vehicleId);

  const stock = await fetchStockRow(body.partId, body.branchId ?? null);
  if (!stock) {
    throw new PartsInventoryError("Stock row does not exist for this part and branch", 404);
  }

  if (availableQuantity(stock) < body.reservedQuantity) {
    throw new PartsInventoryError("Insufficient available stock", 409, stockConflictDetails(stock, body.reservedQuantity));
  }

  const now = nowIso();
  await updateItem<DirectusStockRow>("fleet_part_stock", stock.id, {
    reserved_quantity: asNumber(stock.reserved_quantity) + body.reservedQuantity,
    updated_at: now,
    updated_by: actorId,
  });

  const reservation = await createItem<DirectusReservationRow>("fleet_part_reservations", {
    reservation_no: generatedRef("FPR"),
    part_id: body.partId,
    branch_id: body.branchId ?? null,
    vehicle_id: body.vehicleId,
    motorpool_job_id: body.motorpoolJobId ?? null,
    reserved_quantity: body.reservedQuantity,
    issued_quantity: 0,
    returned_quantity: 0,
    cancelled_quantity: 0,
    status: "Reserved",
    needed_at: body.neededAt ?? null,
    remarks: body.remarks ?? null,
    created_at: now,
    created_by: actorId,
  });

  return { data: mapReservation(reservation) };
}

function reservationStatusAfterIssue(reserved: number, issued: number, cancelled: number) {
  return issued + cancelled >= reserved ? "Issued" : "Partially Issued";
}

function reservationStatusAfterReturn(issued: number, returned: number) {
  return returned >= issued ? "Returned" : "Partially Issued";
}

async function applyReservationAction(
  body: UpdateReservationRequest,
  actorId: ActorId,
  movementOverride?: CreateMovementRequest,
) {
  const reservation = await fetchReservation(body.id);
  const partId = asNullableNumber(reservation.part_id, "id");
  const branchId = branchIdFrom(reservation.branch_id);
  const vehicleId = vehicleIdFrom(reservation.vehicle_id);

  if (!partId) throw new PartsInventoryError("Reservation has no part reference", 409);

  const stock = await fetchStockRow(partId, branchId);
  if (!stock) throw new PartsInventoryError("Stock row does not exist for this reservation", 404);

  const reservedQuantity = asNumber(reservation.reserved_quantity);
  const issuedQuantity = asNumber(reservation.issued_quantity);
  const returnedQuantity = asNumber(reservation.returned_quantity);
  const cancelledQuantity = asNumber(reservation.cancelled_quantity);
  const unissuedQuantity = Math.max(0, reservedQuantity - issuedQuantity - cancelledQuantity);
  const now = nowIso();

  if (body.action === "issue") {
    const quantity = body.quantity ?? unissuedQuantity;
    if (quantity <= 0 || quantity > unissuedQuantity) {
      throw new PartsInventoryError("Issue quantity exceeds unissued reserved quantity", 409, {
        unissuedQuantity,
        requestedQuantity: quantity,
      });
    }

    await applyStockMovement(
      {
        partId,
        branchId,
        movementType: "Issue",
        adjustmentDirection: "IN",
        quantity,
        vehicleId,
        motorpoolJobId: asNullableNumber(reservation.motorpool_job_id),
        reservationId: reservation.id,
        referenceNo: movementOverride?.referenceNo ?? body.referenceNo ?? reservation.reservation_no ?? null,
        reasonCode: movementOverride?.reasonCode ?? null,
        remarks: movementOverride?.remarks ?? body.remarks ?? null,
        movementAt: movementOverride?.movementAt ?? now,
      },
      actorId,
      stock,
    );

    const updatedIssued = issuedQuantity + quantity;
    const updated = await updateItem<DirectusReservationRow>("fleet_part_reservations", reservation.id, {
      issued_quantity: updatedIssued,
      status: reservationStatusAfterIssue(reservedQuantity, updatedIssued, cancelledQuantity),
      updated_at: now,
      updated_by: actorId,
    });
    return { data: mapReservation(updated) };
  }

  if (body.action === "return") {
    const returnableQuantity = Math.max(0, issuedQuantity - returnedQuantity);
    const quantity = body.quantity ?? returnableQuantity;
    if (quantity <= 0 || quantity > returnableQuantity) {
      throw new PartsInventoryError("Return quantity exceeds issued quantity", 409, {
        returnableQuantity,
        requestedQuantity: quantity,
      });
    }

    await applyStockMovement(
      {
        partId,
        branchId,
        movementType: "Return",
        adjustmentDirection: "IN",
        quantity,
        vehicleId,
        motorpoolJobId: asNullableNumber(reservation.motorpool_job_id),
        reservationId: reservation.id,
        referenceNo: movementOverride?.referenceNo ?? body.referenceNo ?? reservation.reservation_no ?? null,
        reasonCode: movementOverride?.reasonCode ?? null,
        remarks: movementOverride?.remarks ?? body.remarks ?? null,
        movementAt: movementOverride?.movementAt ?? now,
      },
      actorId,
      stock,
    );

    const updatedReturned = returnedQuantity + quantity;
    const updated = await updateItem<DirectusReservationRow>("fleet_part_reservations", reservation.id, {
      returned_quantity: updatedReturned,
      status: reservationStatusAfterReturn(issuedQuantity, updatedReturned),
      updated_at: now,
      updated_by: actorId,
    });
    return { data: mapReservation(updated) };
  }

  if (!body.cancelReason) {
    throw new PartsInventoryError("Cancellation reason is required", 400);
  }

  await updateItem<DirectusStockRow>("fleet_part_stock", stock.id, {
    reserved_quantity: Math.max(0, asNumber(stock.reserved_quantity) - unissuedQuantity),
    updated_at: now,
    updated_by: actorId,
  });

  const updated = await updateItem<DirectusReservationRow>("fleet_part_reservations", reservation.id, {
    cancelled_quantity: cancelledQuantity + unissuedQuantity,
    status: "Cancelled",
    cancelled_at: now,
    cancelled_by: actorId,
    cancel_reason: body.cancelReason,
    updated_at: now,
    updated_by: actorId,
  });
  return { data: mapReservation(updated) };
}

export async function updateReservation(body: UpdateReservationRequest, actorId: ActorId) {
  return applyReservationAction(body, actorId);
}

async function getFilteredMovementRows(query: MovementFilterQuery) {
  const filter: UnknownRecord = {
    ...movementDateFilter(query),
  };
  if (query.partId) filter.part_id = { _eq: query.partId };
  if (query.branchId) filter.branch_id = { _eq: query.branchId };
  if (query.vehicleId) filter.vehicle_id = { _eq: query.vehicleId };
  if (query.movementType) filter.movement_type = { _eq: query.movementType };

  const movements = await listItems<DirectusMovementRow>("fleet_part_movements", {
    limit: -1,
    fields: fields(MOVEMENT_FIELDS),
    filter: filterParam(filter),
    sort: "-movement_at",
  });

  let rows = await enrichMovementRowsWithParts(movements.map(mapMovement));

  const search = query.search.trim().toLowerCase();
  rows = rows.filter((row) => {
    if (!search) return true;
    return [
      row.movementNo,
      row.partCode || "",
      row.partName || "",
      row.branchName || "",
      row.vehiclePlate || "",
      row.referenceNo || "",
      row.remarks || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  return rows;
}

export async function listMovements(query: MovementQuery) {
  const rows = await getFilteredMovementRows(query);

  return {
    data: paginate(rows, query.page, query.limit),
    meta: {
      page: query.page,
      limit: query.limit,
      total: rows.length,
    },
  };
}

export async function listReservations(query: ReservationQuery) {
  const filter: UnknownRecord = {};
  if (query.partId) filter.part_id = { _eq: query.partId };
  if (query.branchId) filter.branch_id = { _eq: query.branchId };
  if (query.vehicleId) filter.vehicle_id = { _eq: query.vehicleId };
  if (query.status && query.status !== "all") filter.status = { _eq: query.status };

  const reservations = await listItems<DirectusReservationRow>("fleet_part_reservations", {
    limit: -1,
    fields: fields(RESERVATION_FIELDS),
    filter: filterParam(filter),
    sort: "-created_at",
  });

  const search = query.search.trim().toLowerCase();
  const rows = reservations.map(mapReservation).filter((row) => {
    if (!search) return true;
    return [
      row.reservationNo,
      row.partCode || "",
      row.partName || "",
      row.branchName || "",
      row.vehiclePlate || "",
      row.vehicleName || "",
      row.remarks || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  return {
    data: paginate(rows, query.page, query.limit),
    meta: {
      page: query.page,
      limit: query.limit,
      total: rows.length,
    },
  };
}

export async function createCategory(name: string, actorId: ActorId) {
  const trimmed = name.trim();
  if (!trimmed) throw new PartsInventoryError("Category name is required", 400);

  // Check for duplicate active categories (case-insensitive)
  const existing = await listItems<UnknownRecord>("fleet_part_categories", {
    limit: 1,
    fields: "id",
    filter: filterParam({
      category_name: { _eq: trimmed },
      deleted_at: { _null: true },
    }),
  });
  if (existing.length > 0) {
    throw new PartsInventoryError(`Category "${trimmed}" already exists`, 409);
  }

  // Generate code: uppercase slug, append suffix if needed
  const baseCode = trimmed
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase()
    .slice(0, 20);

  let code = baseCode;
  let suffix = 1;
  while (true) {
    const dupe = await listItems<UnknownRecord>("fleet_part_categories", {
      limit: 1,
      fields: "id",
      filter: filterParam({
        category_code: { _eq: code },
        deleted_at: { _null: true },
      }),
    });
    if (dupe.length === 0) break;
    suffix++;
    code = `${baseCode}_${suffix}`;
  }

  const now = nowIso();
  const created = await createItem<UnknownRecord>("fleet_part_categories", {
    category_name: trimmed,
    category_code: code,
    is_active: true,
    description: null,
    created_at: now,
    created_by: actorId,
  });

  return {
    id: asNullableNumber(created.id),
    code: asNullableString(created.category_code),
    name: asString(created.category_name),
    description: asNullableString(created.description),
  };
}

export async function listLookups() {
  const [categories, vehicleTypes, branches, vehicles] = await Promise.all([
    listItems<UnknownRecord>("fleet_part_categories", {
      limit: -1,
      fields: fields(CATEGORY_FIELDS),
      filter: filterParam({ deleted_at: { _null: true }, is_active: { _eq: true } }),
      sort: "category_name",
    }),
    listItems<UnknownRecord>("vehicle_type", {
      limit: -1,
      fields: fields(VEHICLE_TYPE_FIELDS),
      sort: "type_name",
    }),
    listItems<UnknownRecord>("branches", {
      limit: -1,
      fields: fields(BRANCH_FIELDS),
      filter: filterParam({ isActive: { _eq: 1 } }),
      sort: "branch_name",
    }),
    listItems<UnknownRecord>("vehicles", {
      limit: -1,
      fields: fields(VEHICLE_FIELDS),
      sort: "vehicle_plate",
    }),
  ]);

  return {
    categories: categories.map((category) => ({
      id: asNullableNumber(category.id),
      code: asNullableString(category.category_code),
      name: asString(category.category_name),
      description: asNullableString(category.description),
    })).filter((category): category is { id: number; code: string | null; name: string; description: string | null } => category.id != null),
    vehicleTypes: vehicleTypes.map((type) => ({
      id: asNullableNumber(type.id),
      name: asString(type.type_name),
    })).filter((type): type is { id: number; name: string } => type.id != null),
    branches: branches.map((branch) => ({
      id: asNullableNumber(branch.id),
      code: asNullableString(branch.branch_code),
      name: asString(branch.branch_name),
    })).filter((branch): branch is { id: number; code: string | null; name: string } => branch.id != null),
    vehicles: vehicles.map((vehicle) => ({
      id: asNullableNumber(vehicle.vehicle_id),
      plateNo: asString(vehicle.vehicle_plate),
      name: asNullableString(vehicle.name),
      vehicleTypeId: asNullableNumber(vehicle.vehicle_type, "id") ?? asNullableNumber(vehicle.vehicle_type),
      status: asNullableString(vehicle.status),
    })).filter((vehicle): vehicle is { id: number; plateNo: string; name: string | null; vehicleTypeId: number | null; status: string | null } => vehicle.id != null),
  };
}

function reportRowsFromParts(
  parts: Awaited<ReturnType<typeof listParts>>["data"],
  stockStatusFilter?: PartStockStatus,
) {
  return parts.flatMap((part) => {
    const rows = !part.branchStock.length
      ? [
        {
          partCode: part.partCode,
          partName: part.partName,
          categoryName: part.categoryName,
          branchName: null,
          stockOnHand: 0,
          reservedQuantity: 0,
          damagedQuantity: 0,
          availableQuantity: 0,
          minimumQuantity: part.minimumQuantity,
          stockStatus: part.stockStatus,
          shortageQuantity: Math.max(0, part.minimumQuantity),
          lastMovementAt: null,
        },
      ]
      : part.branchStock.map((stock) => ({
        partCode: part.partCode,
        partName: part.partName,
        categoryName: part.categoryName,
        branchName: stock.branchName,
        stockOnHand: stock.stockOnHand,
        reservedQuantity: stock.reservedQuantity,
        damagedQuantity: stock.damagedQuantity,
        availableQuantity: stock.availableQuantity,
        minimumQuantity: part.minimumQuantity,
        stockStatus: stockStatus(stock.availableQuantity, part.minimumQuantity),
        shortageQuantity: Math.max(0, part.minimumQuantity - stock.availableQuantity),
        lastMovementAt: stock.lastMovementAt,
      }));

    return stockStatusFilter ? rows.filter((row) => row.stockStatus === stockStatusFilter) : rows;
  });
}

function usageByVehicle(movements: Awaited<ReturnType<typeof listMovements>>["data"]) {
  const groups = new Map<string, {
    vehicleId: number | null;
    vehiclePlate: string | null;
    vehicleName: string | null;
    partId: number | null;
    partCode: string | null;
    partName: string | null;
    issuedQuantity: number;
    returnedQuantity: number;
    damagedQuantity: number;
  }>();

  for (const movement of movements) {
    if (!["Issue", "Return", "Damage"].includes(movement.movementType)) continue;
    const key = `${movement.vehicleId || "none"}:${movement.partId || "none"}`;
    const current = groups.get(key) || {
      vehicleId: movement.vehicleId,
      vehiclePlate: movement.vehiclePlate,
      vehicleName: movement.vehicleName,
      partId: movement.partId,
      partCode: movement.partCode,
      partName: movement.partName,
      issuedQuantity: 0,
      returnedQuantity: 0,
      damagedQuantity: 0,
    };

    if (movement.movementType === "Issue") current.issuedQuantity += movement.quantity;
    if (movement.movementType === "Return") current.returnedQuantity += movement.quantity;
    if (movement.movementType === "Damage") current.damagedQuantity += movement.quantity;
    groups.set(key, current);
  }

  return Array.from(groups.values()).map((row) => ({
    ...row,
    netUsedQuantity: row.issuedQuantity - row.returnedQuantity,
  }));
}

function usageByCategory(movements: Awaited<ReturnType<typeof listMovements>>["data"]) {
  const groups = new Map<string, {
    categoryName: string | null;
    issuedQuantity: number;
    returnedQuantity: number;
    movementCount: number;
  }>();

  for (const movement of movements) {
    if (!["Issue", "Return"].includes(movement.movementType)) continue;
    const key = movement.categoryName || "Uncategorized";
    const current = groups.get(key) || {
      categoryName: movement.categoryName,
      issuedQuantity: 0,
      returnedQuantity: 0,
      movementCount: 0,
    };
    if (movement.movementType === "Issue") current.issuedQuantity += movement.quantity;
    if (movement.movementType === "Return") current.returnedQuantity += movement.quantity;
    current.movementCount += 1;
    groups.set(key, current);
  }

  return Array.from(groups.values()).map((row) => ({
    ...row,
    netUsedQuantity: row.issuedQuantity - row.returnedQuantity,
  }));
}

export async function getReport(query: ReportQuery) {
  if (query.format !== "json") {
    throw new PartsInventoryError("Only JSON reports are available in Phase 1", 400);
  }

  const type = query.type as ReportType;

  if (["stock_on_hand", "low_stock", "out_of_stock"].includes(type)) {
    const stockStatusFilter = type === "low_stock" || type === "out_of_stock" ? type : undefined;
    const { rows } = await getFilteredPartRows({
      search: "",
      categoryId: query.categoryId,
      branchId: query.branchId,
      stockStatus: stockStatusFilter ? "needs_attention" : "all",
      active: "true",
    });
    return {
      type,
      data: reportRowsFromParts(rows, stockStatusFilter),
    };
  }

  const movements = await getFilteredMovementRows({
    vehicleId: query.vehicleId,
    branchId: query.branchId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    search: "",
  });

  if (type === "usage_by_vehicle") {
    return { type, data: usageByVehicle(movements) };
  }

  if (type === "usage_by_category") {
    return { type, data: usageByCategory(movements) };
  }

  return { type, data: movements };
}
