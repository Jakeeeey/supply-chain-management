import { randomBytes } from "crypto";
import { z } from "zod";
import { CompensationFailure, CompensationStack } from "./_compensation";
import {
  INVENTORY_SUMMARY_COLLECTION,
  logSummaryRefreshError,
  refreshInventorySummary,
} from "./_inventorySummary";
import { deriveReservationStatus } from "./_reservation-status";

export { deriveReservationStatus } from "./_reservation-status";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN || "";

async function refreshInventorySummaryAfterWrite(partId: number | null | undefined) {
  if (partId == null) return;
  try {
    await refreshInventorySummary(partId);
  } catch (error) {
    logSummaryRefreshError(error, { partId });
  }
}

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
  "stock_revision",
  "last_movement_at",
] as const;

const MOVEMENT_FIELDS = [
  "id",
  "movement_no",
  "part_id",
  "part_id.id",
  "part_id.part_code",
  "part_id.part_name",
  "part_id.category_id.id",
  "part_id.category_id.category_name",
  "branch_id.id",
  "branch_id.branch_name",
  "vehicle_id",
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
  "part_id",
  "part_id.id",
  "part_id.part_code",
  "part_id.part_name",
  "branch_id.id",
  "branch_id.branch_name",
  "vehicle_id",
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

const UNIT_FIELDS = ["unit_id", "unit_name", "unit_shortcut", "sku_code", "order"] as const;
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

const INVENTORY_SUMMARY_FIELDS = [
  "summary_key",
  "scope",
  "part_id",
  "branch_id",
  "branch_name",
  "part_code",
  "part_name",
  "category_id",
  "category_name",
  "unit",
  "minimum_quantity",
  "storage_location",
  "description",
  "is_active",
  "created_at",
  "updated_at",
  "deleted_at",
  "stock_on_hand",
  "reserved_quantity",
  "damaged_quantity",
  "available_quantity",
  "last_movement_at",
  "stock_status",
  "compatibility_count",
  "compatible_vehicle_type_keys",
  "has_stock",
  "has_any_stock",
  "synced_at",
] as const;

type UnknownRecord = Record<string, unknown>;
type ActorId = number | string | null;
type MovementType = "Receiving" | "Issue" | "Return" | "Adjustment" | "Damage" | "Reservation";
type ReservationAction = "issue" | "return" | "return_damage" | "cancel";
type PartStockStatus = "available" | "low_stock" | "out_of_stock";
type ReportType =
  | "stock_on_hand"
  | "low_stock"
  | "out_of_stock"
  | "usage_by_vehicle"
  | "usage_by_category"
  | "movement_audit";

type DirectusListResponse<T> = { data?: T[]; meta?: { filter_count?: number; total_count?: number } };
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
  stock_revision?: number | string | null;
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

type DirectusInventorySummaryRow = {
  summary_key?: string | null;
  scope?: "all" | "branch" | string | null;
  part_id?: number | string | null;
  branch_id?: number | string | null;
  branch_name?: string | null;
  part_code?: string | null;
  part_name?: string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  unit?: string | null;
  minimum_quantity?: number | string | null;
  storage_location?: string | null;
  description?: string | null;
  is_active?: boolean | number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  stock_on_hand?: number | string | null;
  reserved_quantity?: number | string | null;
  damaged_quantity?: number | string | null;
  available_quantity?: number | string | null;
  last_movement_at?: string | null;
  stock_status?: PartStockStatus | string | null;
  compatibility_count?: number | string | null;
  compatible_vehicle_type_keys?: string | null;
  has_stock?: boolean | number | string | null;
  has_any_stock?: boolean | number | string | null;
  synced_at?: string | null;
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
  movementType: z.enum(["Receiving", "Issue", "Return", "Adjustment", "Damage", "Reservation"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const NextMovementReferenceQuerySchema = z.object({
  movementType: z.enum(["Receiving", "Issue", "Return", "Adjustment", "Damage"]),
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
  movementType: z.enum(["Receiving", "Issue", "Return", "Adjustment", "Damage", "Reservation"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: z.enum(["json", "xlsx", "pdf"]).optional().default("json"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export const CreatePartSchema = z.object({
  partCode: z.string().trim().min(1).optional(),
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
  action: z.enum(["issue", "return", "return_damage", "cancel"]),
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

  if (error instanceof CompensationFailure) {
    return {
      status: 503,
      body: {
        error: error.message,
        details: {
          manualReconciliationRequired: true,
          originalDetails: error.originalError instanceof PartsInventoryError
            ? error.originalError.details
            : undefined,
          rollbackErrors: error.rollbackErrors,
          preservedActions: error.preservedActions,
          preservedRecords: error.preservedRecords,
        },
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

const STOCK_REVISION_SETUP_MESSAGE =
  'Fleet parts inventory requires the integer field "fleet_part_stock.stock_revision" with default 0 and service-role read, create, update, and filter access.';

function isStockRevisionAccessError(message: string) {
  const normalized = message.toLowerCase();
  if (!normalized.includes("stock_revision")) return false;

  return [
    "does not exist",
    "not exist",
    "permission",
    "access field",
    "forbidden",
    "unknown field",
  ].some((fragment) => normalized.includes(fragment));
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
    const message = await readDirectusError(res);
    if (isStockRevisionAccessError(message)) {
      throw new PartsInventoryError(STOCK_REVISION_SETUP_MESSAGE, 503, {
        collection: "fleet_part_stock",
        field: "stock_revision",
        type: "integer",
        defaultValue: 0,
        requiredPermissions: ["read", "create", "update", "filter"],
      });
    }
    throw new PartsInventoryError(message, res.status);
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

async function listItemsPage<T>(
  collection: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  const response = await directusRequest<DirectusListResponse<T>>(`/items/${collection}`, undefined, {
    ...params,
    meta: "filter_count",
  });
  return {
    data: Array.isArray(response.data) ? response.data : [],
    total: response.meta?.filter_count ?? response.meta?.total_count ?? 0,
  };
}

async function listItemsBatched<T>(
  collection: string,
  params: Record<string, string | number | boolean | undefined> = {},
  batchSize = 500,
) {
  const rows: T[] = [];
  let page = 1;

  while (true) {
    const response = await listItemsPage<T>(collection, {
      ...params,
      page,
      limit: batchSize,
    });
    rows.push(...response.data);
    if (rows.length >= response.total || response.data.length === 0) break;
    page += 1;
  }

  return rows;
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

async function updateItems<T>(
  collection: string,
  payload: UnknownRecord,
  filter: UnknownRecord,
) {
  const response = await directusRequest<DirectusListResponse<T>>(`/items/${collection}`, {
    method: "PATCH",
    body: JSON.stringify({
      query: { filter },
      data: payload,
    }),
  });
  return Array.isArray(response.data) ? response.data : [];
}

async function deleteItem(collection: string, id: number | string) {
  await directusRequest(`/items/${collection}/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

async function createItemWithRollback<T>(
  tx: CompensationStack,
  collection: string,
  payload: UnknownRecord,
  label = `create ${collection}`,
) {
  const row = await createItem<T & { id: number | string }>(collection, payload);
  tx.add(label, () => deleteItem(collection, row.id), { collection, id: row.id });
  return row as T;
}

async function updateItemWithRollback<T>(
  tx: CompensationStack,
  collection: string,
  id: number | string,
  payload: UnknownRecord,
  rollbackPayload: UnknownRecord,
  label = `update ${collection}`,
) {
  const row = await updateItem<T>(collection, id, payload);
  tx.add(label, async () => {
    await updateItem(collection, id, rollbackPayload);
  }, { collection, id });
  return row;
}

function fields(fieldsList: readonly string[]) {
  return fieldsList.join(",");
}

function filterParam(filter: UnknownRecord) {
  return JSON.stringify(filter);
}

function optionalRelationPayload(field: string, value: number | string | null | undefined) {
  return value == null ? {} : { [field]: value };
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
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

function movementReferencePrefix(movementType: CreateMovementRequest["movementType"]) {
  if (movementType === "Receiving") return "FMR-RCV";
  if (movementType === "Issue") return "FMR-ISS";
  if (movementType === "Return") return "FMR-RET";
  if (movementType === "Adjustment") return "FMR-ADJ";
  return "FMR-DMG";
}

export function generateMovementReference(movementType: CreateMovementRequest["movementType"]) {
  return generatedRef(movementReferencePrefix(movementType));
}

function isGeneratedMovementReference(referenceNo: string, movementType: CreateMovementRequest["movementType"]) {
  const escapedPrefix = movementReferencePrefix(movementType).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedPrefix}-\\d{14}-[A-F0-9]{8}$`).test(referenceNo);
}

function movementReferenceNo(body: CreateMovementRequest) {
  if (!body.referenceNo) return generateMovementReference(body.movementType);
  const isInitialStockReference = body.movementType === "Receiving" && body.referenceNo === "INITIAL-STOCK";
  if (!isGeneratedMovementReference(body.referenceNo, body.movementType) && !isInitialStockReference) {
    throw new PartsInventoryError("Invalid generated movement reference number", 400, {
      referenceNo: body.referenceNo,
      movementType: body.movementType,
    });
  }
  return body.referenceNo;
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

async function fetchStockRows(partIds: number[]) {
  if (!partIds.length) return [];
  return listItemsBatched<DirectusStockRow>("fleet_part_stock", {
    fields: fields(STOCK_FIELDS),
    filter: filterParam({ part_id: { _in: partIds } }),
  });
}

async function fetchCompatibilityRows(partIds: number[]) {
  if (!partIds.length) return [];
  return listItemsBatched<DirectusCompatibilityRow>("fleet_part_vehicle_compatibility", {
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

async function ensureStockRow(
  partId: number,
  branchId: number | null | undefined,
  actorId: ActorId,
  tx?: CompensationStack,
) {
  const existing = await fetchStockRow(partId, branchId);
  if (existing) return existing;

  const payload = {
    part_id: partId,
    branch_id: branchId ?? null,
    stock_on_hand: 0,
    reserved_quantity: 0,
    damaged_quantity: 0,
    stock_revision: 0,
    created_at: nowIso(),
    created_by: actorId,
  };

  const row = await createItem<DirectusStockRow>("fleet_part_stock", payload);
  tx?.recordCreatedStock({ collection: "fleet_part_stock", id: row.id });
  return row;
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

const GENERATED_PART_CODE_PREFIX = "FP";
const GENERATED_PART_CODE_WIDTH = 6;
const GENERATED_PART_CODE_ATTEMPTS = 5;

export async function generatePartCode() {
  const prefix = `${GENERATED_PART_CODE_PREFIX}-`;
  const rows = await listItems<{ part_code?: string | null }>("fleet_parts", {
    limit: 1,
    fields: "part_code",
    filter: filterParam({
      part_code: { _starts_with: prefix },
    }),
    sort: "-part_code",
  });
  const pattern = new RegExp(`^${GENERATED_PART_CODE_PREFIX}-(\\d{${GENERATED_PART_CODE_WIDTH}})$`);
  const highest = rows.reduce((max, row) => {
    const match = asNullableString(row.part_code)?.match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const sequence = String(highest + 1).padStart(GENERATED_PART_CODE_WIDTH, "0");
  return `${prefix}${sequence}`;
}

function isPartCodeDuplicateError(error: unknown) {
  if (!(error instanceof PartsInventoryError)) return false;
  const message = error.message.toLowerCase();
  return message.includes("part code already exists")
    || message.includes("duplicate")
    || message.includes("unique")
    || message.includes("part_code");
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
    categoryId: asNullableNumber(asRecord(row.part_id)?.category_id, "id"),
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

  const partRows = await listItemsBatched<{ id?: number | string | null; part_code?: string | null; part_name?: string | null; category_id?: unknown }>(
    "fleet_parts",
    {
      fields: "id,part_code,part_name,category_id.id,category_id.category_name",
      filter: filterParam({ id: { _in: missingPartIds }, deleted_at: { _null: true } }),
    },
  );
  const partMap = new Map<number, { code: string | null; name: string | null; categoryId: number | null; categoryName: string | null }>();
  for (const part of partRows) {
    const id = asNullableNumber(part.id);
    if (id != null) {
      partMap.set(id, {
        code: asNullableString(part.part_code),
        name: asNullableString(part.part_name),
        categoryId: asNullableNumber(part.category_id, "id"),
        categoryName: relationLabel(part.category_id, "category_name"),
      });
    }
  }

  return rows.map((row) => {
    if ((row.partCode && row.partName && row.categoryId != null && row.categoryName) || row.partId == null) return row;
    const fallback = partMap.get(row.partId);
    if (!fallback) return row;
    return {
      ...row,
      partCode: row.partCode || fallback.code,
      partName: row.partName || fallback.name,
      categoryId: row.categoryId ?? fallback.categoryId,
      categoryName: row.categoryName || fallback.categoryName,
    };
  });
}

async function enrichRowsWithVehicles<T extends { vehicleId: number | null; vehiclePlate: string | null; vehicleName: string | null }>(
  rows: T[],
): Promise<T[]> {
  const missingVehicleIds = uniqueNumbers(
    rows.filter((row) => row.vehicleId != null && (!row.vehiclePlate || !row.vehicleName)).map((row) => row.vehicleId),
  );
  if (missingVehicleIds.length === 0) return rows;

  const vehicleRows = await listItemsBatched<{ vehicle_id?: number | string | null; vehicle_plate?: string | null; name?: string | null }>(
    "vehicles",
    {
      fields: fields(VEHICLE_FIELDS),
      filter: filterParam({ vehicle_id: { _in: missingVehicleIds } }),
    },
  );
  const vehicleMap = new Map<number, { plate: string | null; name: string | null }>();
  for (const vehicle of vehicleRows) {
    const id = asNullableNumber(vehicle.vehicle_id);
    if (id != null) {
      vehicleMap.set(id, {
        plate: asNullableString(vehicle.vehicle_plate),
        name: asNullableString(vehicle.name),
      });
    }
  }

  return rows.map((row) => {
    if ((row.vehiclePlate && row.vehicleName) || row.vehicleId == null) return row;
    const fallback = vehicleMap.get(row.vehicleId);
    if (!fallback) return row;
    return {
      ...row,
      vehiclePlate: row.vehiclePlate || fallback.plate,
      vehicleName: row.vehicleName || fallback.name,
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
    damagedQuantity: 0,
    damagedReturnedQuantity: 0,
    damagedReservedQuantity: 0,
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

async function enrichReservationRowsWithDamage(
  rows: Array<ReturnType<typeof mapReservation>>,
): Promise<Array<ReturnType<typeof mapReservation>>> {
  const reservationIds = uniqueNumbers(rows.map((row) => row.id));
  if (!reservationIds.length) return rows;

  const totals = await fetchReservationDamageTotals(reservationIds);

  return rows.map((row) => ({
    ...row,
    ...(totals.get(row.id) || {}),
  }));
}

async function fetchReservationDamageTotals(reservationIds: number[]) {
  const movements = await listItemsBatched<DirectusMovementRow>("fleet_part_movements", {
    fields: fields(MOVEMENT_FIELDS),
    filter: filterParam({
      reservation_id: { _in: reservationIds },
      movement_type: { _eq: "Damage" },
      reason_code: { _eq: "RETURN_DAMAGED" },
    }),
  });

  const totals = new Map<number, { damagedQuantity: number; damagedReturnedQuantity: number; damagedReservedQuantity: number }>();
  for (const movement of movements) {
    const reservationId = asNullableNumber(movement.reservation_id, "id");
    if (reservationId == null) continue;
    const current = totals.get(reservationId) || {
      damagedQuantity: 0,
      damagedReturnedQuantity: 0,
      damagedReservedQuantity: 0,
    };
    const quantity = asNumber(movement.quantity);
    const stockBefore = asNumber(movement.stock_before);
    const stockAfter = asNumber(movement.stock_after);
    const returnedQuantity = stockAfter > stockBefore ? Math.min(quantity, stockAfter - stockBefore) : 0;
    current.damagedQuantity += quantity;
    current.damagedReturnedQuantity += returnedQuantity;
    current.damagedReservedQuantity += Math.max(0, quantity - returnedQuantity);
    totals.set(reservationId, current);
  }

  return totals;
}

async function enrichReservationRowsWithParts(
  rows: Array<ReturnType<typeof mapReservation>>,
): Promise<Array<ReturnType<typeof mapReservation>>> {
  const missingPartIds = uniqueNumbers(
    rows.filter((row) => row.partId != null && (!row.partCode || !row.partName)).map((row) => row.partId),
  );
  if (missingPartIds.length === 0) return rows;

  const partRows = await listItemsBatched<{ id?: number | string | null; part_code?: string | null; part_name?: string | null }>(
    "fleet_parts",
    {
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
    if (row.partId == null) return row;
    const fallback = partMap.get(row.partId);
    if (!fallback) return row;
    return {
      ...row,
      partCode: row.partCode || fallback.code,
      partName: row.partName || fallback.name,
    };
  });
}

async function mapReservationWithPart(row: DirectusReservationRow) {
  const [reservation] = await enrichReservationRowsWithDamage(
    await enrichRowsWithVehicles(await enrichReservationRowsWithParts([mapReservation(row)])),
  );
  return reservation;
}

function inventorySummaryFilter(
  query: PartInventoryFilterQuery,
  scope: "all" | "branch",
) {
  const filter: UnknownRecord = {
    scope: { _eq: scope },
    deleted_at: { _null: true },
  };
  if (scope === "branch" && query.branchId) filter.branch_id = { _eq: query.branchId };
  if (query.active === "true") filter.is_active = { _eq: true };
  if (query.active === "false") filter.is_active = { _eq: false };
  if (query.categoryId) filter.category_id = { _eq: query.categoryId };

  const search = query.search.trim();
  if (search) {
    filter._or = [
      { part_code: { _icontains: search } },
      { part_name: { _icontains: search } },
      { category_name: { _icontains: search } },
      { storage_location: { _icontains: search } },
    ];
  }
  if (query.vehicleTypeId) {
    const compatibilityFilter = {
      _or: [
        { compatibility_count: { _eq: 0 } },
        { compatible_vehicle_type_keys: { _contains: `|${query.vehicleTypeId}|` } },
      ],
    };
    const existingOr = filter._or;
    if (existingOr) {
      delete filter._or;
      filter._and = [{ _or: existingOr }, compatibilityFilter];
    } else {
      Object.assign(filter, compatibilityFilter);
    }
  }
  if (query.stockStatus === "needs_attention") {
    filter.stock_status = { _in: ["low_stock", "out_of_stock"] };
  } else if (query.stockStatus !== "all") {
    filter.stock_status = { _eq: query.stockStatus };
  }
  return filter;
}

function aggregateValue(row: UnknownRecord, aggregate: "count" | "sum", field: string) {
  const value = row[aggregate];
  const record = asRecord(value);
  return asNumber(record?.[field] ?? value);
}

async function inventorySummaryMetrics(filter: UnknownRecord) {
  const response = await directusRequest<DirectusListResponse<UnknownRecord>>(
    `/items/${INVENTORY_SUMMARY_COLLECTION}`,
    undefined,
    {
      "aggregate[count]": "part_id",
      "aggregate[sum]": "available_quantity",
      groupBy: "stock_status",
      filter: filterParam(filter),
    },
  );
  const summary = {
    totalParts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalAvailableQuantity: 0,
  };
  for (const row of response.data || []) {
    const count = aggregateValue(row, "count", "part_id");
    summary.totalParts += count;
    summary.totalAvailableQuantity += aggregateValue(row, "sum", "available_quantity");
    if (row.stock_status === "low_stock") summary.lowStockCount += count;
    if (row.stock_status === "out_of_stock") summary.outOfStockCount += count;
  }
  return summary;
}

async function fetchPartRowsByIds(partIds: number[]) {
  const params = {
    fields: fields(PART_FIELDS),
    filter: filterParam({ id: { _in: partIds }, deleted_at: { _null: true } }),
  };
  try {
    return await listItems<DirectusPartRow>("fleet_parts", params);
  } catch (error) {
    if (!isMinimumQuantityFieldError(error)) throw error;
    return listItems<DirectusPartRow>("fleet_parts", { ...params, fields: fields(LEGACY_PART_FIELDS) });
  }
}

async function hydrateInventorySummaryRows(
  summaryRows: DirectusInventorySummaryRow[],
  branchId?: number,
) {
  const partIds = uniqueNumbers(summaryRows.map((row) => asNullableNumber(row.part_id)));
  if (!partIds.length) return [];
  const [parts, stockRows, compatibilityRows, vehicleTypeNameMap] = await Promise.all([
    fetchPartRowsByIds(partIds),
    fetchStockRows(partIds),
    fetchCompatibilityRows(partIds),
    fetchVehicleTypeNameMap(),
  ]);
  const partMap = new Map(parts.map((part) => [part.id, part]));

  return summaryRows.flatMap((summaryRow) => {
    const partId = asNullableNumber(summaryRow.part_id);
    const part = partId == null ? null : partMap.get(partId);
    if (!part) return [];
    let row = mapPartRow(part, stockRows, compatibilityRows, vehicleTypeNameMap);
    if (branchId) {
      const branchStock = row.branchStock.filter((stock) => stock.branchId === branchId);
      row = {
        ...row,
        branchStock,
        totalStockOnHand: asNumber(summaryRow.stock_on_hand),
        totalReservedQuantity: asNumber(summaryRow.reserved_quantity),
        totalDamagedQuantity: asNumber(summaryRow.damaged_quantity),
        totalAvailableQuantity: asNumber(summaryRow.available_quantity),
        stockStatus: asString(summaryRow.stock_status) as PartStockStatus,
        stockStatusLabel: statusLabel(asString(summaryRow.stock_status) as PartStockStatus),
      };
    }
    return [row];
  });
}

async function getSummaryPartRows(
  query: PartInventoryFilterQuery,
  pagination: { page: number; limit: number },
) {
  const scope = query.branchId ? "branch" : "all";
  const filter = inventorySummaryFilter(query, scope);
  const [page, summary] = await Promise.all([
    listItemsPage<DirectusInventorySummaryRow>(INVENTORY_SUMMARY_COLLECTION, {
      page: pagination.page,
      limit: pagination.limit,
      fields: fields(INVENTORY_SUMMARY_FIELDS),
      filter: filterParam(filter),
      sort: "part_code",
    }),
    inventorySummaryMetrics(filter),
  ]);
  return {
    rows: await hydrateInventorySummaryRows(page.data, query.branchId),
    summary: { ...summary, totalParts: page.total },
  };
}

async function getFilteredPartRows(
  query: PartInventoryFilterQuery,
  pagination: { page: number; limit: number },
) {
  return getSummaryPartRows(query, pagination);
}

export async function listParts(query: PartInventoryQuery) {
  const { rows, summary } = await getFilteredPartRows(query, { page: query.page, limit: query.limit });

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: summary.totalParts,
    },
    summary,
  };
}

export async function getPartDetail(partId: number) {
  const part = await fetchPart(partId);
  const [stockRows, compatibilityRows, recentMovements, usageMovements, reservations, vehicleTypeNameMap] = await Promise.all([
    fetchStockRows([partId]),
    fetchCompatibilityRows([partId]),
    getMovementRows({ partId, search: "" }, { page: 1, limit: 10 }),
    getFilteredMovementRows({ partId, search: "" }),
    listReservations({ partId, search: "", page: 1, limit: 10 }),
    fetchVehicleTypeNameMap(),
  ]);
  const issuedVehicles = usageByVehicle(usageMovements)
    .filter((row) => row.vehicleId != null && row.issuedQuantity > 0);

  return {
    data: {
      ...mapPartRow(part, stockRows, compatibilityRows, vehicleTypeNameMap),
      recentMovements: recentMovements.rows,
      issuedVehicles,
      activeReservations: reservations.data.filter((row) => !["Cancelled", "Returned"].includes(row.status)),
    },
  };
}

async function replaceCompatibility(
  partId: number,
  vehicleTypeIds: number[],
  actorId: ActorId,
  tx?: CompensationStack,
) {
  const existing = await listItems<DirectusCompatibilityRow>("fleet_part_vehicle_compatibility", {
    limit: -1,
    fields: fields(COMPATIBILITY_FIELDS),
    filter: filterParam({ part_id: { _eq: partId } }),
  });
  const localTx = tx ?? new CompensationStack();

  try {
    const desiredTypeIds = uniqueNumbers(vehicleTypeIds);
    const desiredSet = new Set(desiredTypeIds);
    const existingTypeIds = new Set(
      existing
        .map((row) => asNullableNumber(row.vehicle_type_id, "id"))
        .filter((id): id is number => id != null),
    );

    for (const row of existing) {
      const vehicleTypeId = asNullableNumber(row.vehicle_type_id, "id");
      if (vehicleTypeId == null || desiredSet.has(vehicleTypeId)) continue;
      await deleteItem("fleet_part_vehicle_compatibility", row.id);
      localTx.add("delete compatibility", async () => {
        await createItem<DirectusCompatibilityRow>("fleet_part_vehicle_compatibility", {
          part_id: partId,
          vehicle_type_id: vehicleTypeId,
          notes: row.notes ?? null,
          created_at: nowIso(),
          created_by: actorId,
        });
      }, { collection: "fleet_part_vehicle_compatibility", id: row.id });
    }

    for (const vehicleTypeId of desiredTypeIds) {
      if (existingTypeIds.has(vehicleTypeId)) continue;
      await createItemWithRollback<DirectusCompatibilityRow>(localTx, "fleet_part_vehicle_compatibility", {
        part_id: partId,
        vehicle_type_id: vehicleTypeId,
        created_at: nowIso(),
        created_by: actorId,
      }, "create compatibility");
    }
  } catch (error) {
    if (tx) throw error;
    await localTx.compensate(error);
  }
}

export async function createPart(body: CreatePartRequest, actorId: ActorId) {
  const tx = new CompensationStack();
  const basePayload = {
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

  let part: DirectusPartRow | null = null;
  for (let attempt = 0; attempt < GENERATED_PART_CODE_ATTEMPTS; attempt++) {
    const payload = {
      ...basePayload,
      part_code: await generatePartCode(),
    };

    try {
      part = await createItemWithRollback<DirectusPartRow>(tx, "fleet_parts", payload, "create part");
      break;
    } catch (error) {
      if (isMinimumQuantityFieldError(error)) {
        try {
          part = await createItemWithRollback<DirectusPartRow>(
            tx,
            "fleet_parts",
            legacyMinimumQuantityPayload(payload),
            "create part",
          );
          break;
        } catch (legacyError) {
          if (isPartCodeDuplicateError(legacyError) && attempt < GENERATED_PART_CODE_ATTEMPTS - 1) continue;
          throw legacyError;
        }
      }

      if (isPartCodeDuplicateError(error) && attempt < GENERATED_PART_CODE_ATTEMPTS - 1) continue;
      throw error;
    }
  }
  if (!part) throw new PartsInventoryError("Unable to generate a unique part code", 409);

  try {
    await replaceCompatibility(part.id, body.compatibleVehicleTypeIds, actorId, tx);

    for (const stock of body.initialStock) {
      if (stock.stockOnHand <= 0) continue;
      const stockRow = await ensureStockRow(part.id, stock.branchId ?? null, actorId, tx);
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
        tx,
      );
    }
  } catch (error) {
    await tx.compensate(error);
  }

  await refreshInventorySummaryAfterWrite(part.id);
  return getPartDetail(part.id);
}

export async function updatePart(partId: number, body: UpdatePartRequest, actorId: ActorId) {
  const existing = await fetchPart(partId);
  const tx = new CompensationStack();

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

  const rollbackPayload: UnknownRecord = {
    updated_at: nowIso(),
    updated_by: actorId,
  };
  if (body.partCode !== undefined) rollbackPayload.part_code = existing.part_code ?? null;
  if (body.partName !== undefined) rollbackPayload.part_name = existing.part_name ?? null;
  if (body.categoryId !== undefined) rollbackPayload.category_id = asNullableNumber(existing.category_id, "id");
  if (body.category !== undefined) rollbackPayload.category = existing.category ?? null;
  if (body.unit !== undefined) rollbackPayload.unit = existing.unit ?? null;
  if (body.minimumQuantity !== undefined) rollbackPayload.minimum_quantity = asNumber(existing.minimum_quantity ?? existing.reorder_level);
  if (body.storageLocation !== undefined) rollbackPayload.storage_location = existing.storage_location ?? null;
  if (body.description !== undefined) rollbackPayload.description = existing.description ?? null;
  if (body.isActive !== undefined) rollbackPayload.is_active = asBoolean(existing.is_active);

  try {
    await updateItem<DirectusPartRow>("fleet_parts", partId, payload);
  } catch (error) {
    if (!isMinimumQuantityFieldError(error)) throw error;
    await updateItem<DirectusPartRow>("fleet_parts", partId, legacyMinimumQuantityPayload(payload));
  }
  tx.add("update part", async () => {
    try {
      await updateItem<DirectusPartRow>("fleet_parts", partId, rollbackPayload);
    } catch (error) {
      if (!isMinimumQuantityFieldError(error)) throw error;
      await updateItem<DirectusPartRow>("fleet_parts", partId, legacyMinimumQuantityPayload(rollbackPayload));
    }
  }, { collection: "fleet_parts", id: partId });

  try {
    if (body.compatibleVehicleTypeIds) {
      await replaceCompatibility(partId, body.compatibleVehicleTypeIds, actorId, tx);
    }
  } catch (error) {
    await tx.compensate(error);
  }

  const summaryFieldsChanged =
    body.partCode !== undefined
    || body.partName !== undefined
    || body.isActive !== undefined
    || body.categoryId !== undefined
    || body.category !== undefined
    || body.unit !== undefined
    || body.minimumQuantity !== undefined
    || body.storageLocation !== undefined
    || body.description !== undefined
    || body.compatibleVehicleTypeIds !== undefined;
  if (summaryFieldsChanged) await refreshInventorySummaryAfterWrite(partId);

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

function stockRevision(stock: DirectusStockRow) {
  return asNumber(stock.stock_revision);
}

async function updateStockWithRevision(
  stock: DirectusStockRow,
  after: { stockOnHand: number; reservedQuantity: number; damagedQuantity: number; lastMovementAt?: string | null },
  actorId: ActorId,
  updatedAt: string,
) {
  const revision = stockRevision(stock);
  const payload: UnknownRecord = {
    stock_on_hand: after.stockOnHand,
    reserved_quantity: after.reservedQuantity,
    damaged_quantity: after.damagedQuantity,
    stock_revision: revision + 1,
    updated_at: updatedAt,
    updated_by: actorId,
  };

  if (after.lastMovementAt !== undefined) {
    payload.last_movement_at = after.lastMovementAt;
  }

  const rows = await updateItems<DirectusStockRow>(
    "fleet_part_stock",
    payload,
    {
      id: { _eq: stock.id },
      stock_revision: { _eq: revision },
    },
  );

  if (rows.length !== 1) {
    throw new PartsInventoryError("Stock was updated by another user. Reload and try again.", 409, {
      stockId: stock.id,
      expectedRevision: revision,
    });
  }

  return {
    ...stock,
    ...rows[0],
    stock_on_hand: after.stockOnHand,
    reserved_quantity: after.reservedQuantity,
    damaged_quantity: after.damagedQuantity,
    stock_revision: revision + 1,
    ...(after.lastMovementAt !== undefined ? { last_movement_at: after.lastMovementAt } : {}),
  };
}

async function updateStockWithRevisionWithRollback(
  tx: CompensationStack,
  stock: DirectusStockRow,
  after: { stockOnHand: number; reservedQuantity: number; damagedQuantity: number; lastMovementAt?: string | null },
  actorId: ActorId,
  updatedAt: string,
) {
  const before = {
    stockOnHand: asNumber(stock.stock_on_hand),
    reservedQuantity: asNumber(stock.reserved_quantity),
    damagedQuantity: asNumber(stock.damaged_quantity),
    lastMovementAt: stock.last_movement_at ?? null,
  };
  const updated = await updateStockWithRevision(stock, after, actorId, updatedAt);
  tx.beginStockRollback("update stock", async () => {
    await updateStockWithRevision(
      updated,
      before,
      actorId,
      nowIso(),
    );
  }, { collection: "fleet_part_stock", id: stock.id });
  return updated;
}

async function patchStockAndCreateMovement(
  stock: DirectusStockRow,
  after: { stockOnHand: number; reservedQuantity: number; damagedQuantity: number },
  body: CreateMovementRequest,
  actorId: ActorId,
  tx?: CompensationStack,
) {
  if (after.stockOnHand < 0 || after.reservedQuantity < 0 || after.damagedQuantity < 0) {
    throw new PartsInventoryError("Stock operation would create a negative balance", 409, {
      before: stockConflictDetails(stock, body.quantity),
      after,
    });
  }

  const now = nowIso();
  const referenceNo = movementReferenceNo(body);
  const beforeStockOnHand = asNumber(stock.stock_on_hand);
  const beforeReserved = asNumber(stock.reserved_quantity);
  const beforeDamaged = asNumber(stock.damaged_quantity);

  const localTx = tx ?? new CompensationStack();

  try {
    await updateStockWithRevisionWithRollback(
      localTx,
      stock,
      { ...after, lastMovementAt: body.movementAt || now },
      actorId,
      now,
    );

    return await createItemWithRollback<DirectusMovementRow>(localTx, "fleet_part_movements", {
    movement_no: generatedRef("FPM"),
    part_id: body.partId,
    ...optionalRelationPayload("branch_id", body.branchId),
    ...optionalRelationPayload("vehicle_id", body.vehicleId),
    ...optionalRelationPayload("motorpool_job_id", body.motorpoolJobId),
    ...optionalRelationPayload("reservation_id", body.reservationId),
    movement_type: body.movementType,
    quantity: body.quantity,
    stock_before: beforeStockOnHand,
    stock_after: after.stockOnHand,
    reserved_before: beforeReserved,
    reserved_after: after.reservedQuantity,
    damaged_before: beforeDamaged,
    damaged_after: after.damagedQuantity,
    reference_no: referenceNo,
    reason_code: body.reasonCode ?? null,
    remarks: body.remarks ?? null,
    movement_at: body.movementAt || now,
    encoded_by: actorId,
    created_at: now,
    created_by: actorId,
    }, "create stock movement");
  } catch (error) {
    if (tx) throw error;
    return localTx.compensate(error);
  }
}

function canCreateMissingStockRow(body: CreateMovementRequest) {
  if (body.movementType === "Receiving" || body.movementType === "Return") return true;
  return body.movementType === "Adjustment" && body.adjustmentDirection !== "OUT";
}

async function applyStockMovement(
  body: CreateMovementRequest,
  actorId: ActorId,
  stockRow?: DirectusStockRow,
  tx?: CompensationStack,
) {
  const part = await fetchPart(body.partId);
  assertActivePart(part, body.movementType);

  if (body.quantity <= 0) {
    throw new PartsInventoryError("Quantity must be greater than zero", 400);
  }

  if ((body.movementType === "Adjustment" || body.movementType === "Damage") && (!body.reasonCode || !body.remarks)) {
    throw new PartsInventoryError("Reason code and remarks are required for adjustment and damage movements", 400);
  }

  const stock = stockRow || (canCreateMissingStockRow(body)
    ? await ensureStockRow(body.partId, body.branchId ?? null, actorId, tx)
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

  return patchStockAndCreateMovement(stock, after, body, actorId, tx);
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

  if (body.movementType === "Issue") {
    const tx = new CompensationStack();
    try {
      const movement = await applyStockMovement({ ...body, reservationId: null }, actorId, undefined, tx);
      const reservation = await createIssuedReservationForMovement(body, actorId, tx);
      await updateItemWithRollback<DirectusMovementRow>(
        tx,
        "fleet_part_movements",
        movement.id,
        { reservation_id: reservation.id },
        { reservation_id: null },
        "link movement reservation",
      );
      const enriched = await enrichRowsWithVehicles(await enrichMovementRowsWithParts([mapMovement(await fetchMovement(movement.id))]));
      await refreshInventorySummaryAfterWrite(body.partId);
      return { data: enriched[0] };
    } catch (error) {
      await tx.compensate(error);
    }
  }

  const movement = await applyStockMovement(body, actorId);
  const enriched = await enrichMovementRowsWithParts([mapMovement(movement)]);
  await refreshInventorySummaryAfterWrite(body.partId);
  return { data: enriched[0] };
}

async function fetchReservation(reservationId: number) {
  return getItem<DirectusReservationRow>("fleet_part_reservations", reservationId, {
    fields: fields(RESERVATION_FIELDS),
  });
}

async function fetchMovement(movementId: number) {
  return getItem<DirectusMovementRow>("fleet_part_movements", movementId, {
    fields: fields(MOVEMENT_FIELDS),
  });
}

async function createIssuedReservationForMovement(
  body: CreateMovementRequest,
  actorId: ActorId,
  tx?: CompensationStack,
) {
  const now = nowIso();
  // Direct Issue reservations are audit/display rows, not active reserved holds.
  const payload = {
    reservation_no: generatedRef("FPR"),
    part_id: body.partId,
    ...optionalRelationPayload("branch_id", body.branchId),
    ...optionalRelationPayload("vehicle_id", body.vehicleId),
    ...optionalRelationPayload("motorpool_job_id", body.motorpoolJobId),
    reserved_quantity: 0,
    issued_quantity: body.quantity,
    returned_quantity: 0,
    cancelled_quantity: 0,
    status: "Issued",
    needed_at: body.movementAt ?? null,
    remarks: body.remarks ?? body.referenceNo ?? null,
    created_at: now,
    created_by: actorId,
    updated_at: now,
    updated_by: actorId,
  };

  return tx
    ? createItemWithRollback<DirectusReservationRow>(tx, "fleet_part_reservations", payload, "create issued reservation")
    : createItem<DirectusReservationRow>("fleet_part_reservations", payload);
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
  const stockOnHand = asNumber(stock.stock_on_hand);
  const reservedBefore = asNumber(stock.reserved_quantity);
  const damagedQuantity = asNumber(stock.damaged_quantity);
  const reservedAfter = reservedBefore + body.reservedQuantity;
  const tx = new CompensationStack();

  try {
    await updateStockWithRevisionWithRollback(
      tx,
      stock,
      { stockOnHand, reservedQuantity: reservedAfter, damagedQuantity },
      actorId,
      now,
    );

    const reservation = await createItemWithRollback<DirectusReservationRow>(tx, "fleet_part_reservations", {
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
    }, "create reservation");

    await createItemWithRollback<DirectusMovementRow>(tx, "fleet_part_movements", {
      movement_no: generatedRef("FPM"),
      part_id: body.partId,
      branch_id: body.branchId ?? null,
      vehicle_id: body.vehicleId,
      motorpool_job_id: body.motorpoolJobId ?? null,
      reservation_id: reservation.id,
      movement_type: "Reservation",
      quantity: body.reservedQuantity,
      stock_before: stockOnHand,
      stock_after: stockOnHand,
      reserved_before: reservedBefore,
      reserved_after: reservedAfter,
      damaged_before: damagedQuantity,
      damaged_after: damagedQuantity,
      reference_no: asString(reservation.reservation_no),
      reason_code: null,
      remarks: body.remarks ?? null,
      movement_at: now,
      encoded_by: actorId,
      created_at: now,
      created_by: actorId,
    }, "create reservation movement");

    await refreshInventorySummaryAfterWrite(body.partId);
    return { data: await mapReservationWithPart(await fetchReservation(reservation.id)) };
  } catch (error) {
    await tx.compensate(error);
  }
}

function reservationRollbackPayload(reservation: DirectusReservationRow, actorId: ActorId): UnknownRecord {
  return {
    reserved_quantity: asNumber(reservation.reserved_quantity),
    issued_quantity: asNumber(reservation.issued_quantity),
    returned_quantity: asNumber(reservation.returned_quantity),
    cancelled_quantity: asNumber(reservation.cancelled_quantity),
    status: reservation.status ?? null,
    cancelled_at: reservation.cancelled_at ?? null,
    cancelled_by: null,
    cancel_reason: reservation.cancel_reason ?? null,
    updated_at: nowIso(),
    updated_by: actorId,
  };
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

  const reservedQuantity = asNumber(reservation.reserved_quantity);
  const issuedQuantity = asNumber(reservation.issued_quantity);
  const returnedQuantity = asNumber(reservation.returned_quantity);
  const cancelledQuantity = asNumber(reservation.cancelled_quantity);
  const unissuedQuantity = Math.max(0, reservedQuantity - issuedQuantity - cancelledQuantity);
  const existingDamageTotals = (await fetchReservationDamageTotals([reservation.id])).get(reservation.id);
  const reservationDamagedQuantity = existingDamageTotals?.damagedQuantity ?? 0;
  const now = nowIso();

  if (body.action === "issue") {
    if (!partId) throw new PartsInventoryError("Reservation has no part reference", 409);

    const stock = await fetchStockRow(partId, branchId);
    if (!stock) throw new PartsInventoryError("Stock row does not exist for this reservation", 404);

    const quantity = body.quantity ?? unissuedQuantity;
    if (quantity <= 0 || quantity > unissuedQuantity) {
      throw new PartsInventoryError("Issue quantity exceeds unissued reserved quantity", 409, {
        unissuedQuantity,
        requestedQuantity: quantity,
      });
    }

    const tx = new CompensationStack();
    try {
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
        tx,
      );

      const updatedIssued = issuedQuantity + quantity;
      const updated = await updateItemWithRollback<DirectusReservationRow>(
        tx,
        "fleet_part_reservations",
        reservation.id,
        {
          issued_quantity: updatedIssued,
          status: deriveReservationStatus({
            reserved: reservedQuantity,
            issued: updatedIssued,
            returned: returnedQuantity,
            cancelled: cancelledQuantity,
            damaged: reservationDamagedQuantity,
          }),
          updated_at: now,
          updated_by: actorId,
        },
        reservationRollbackPayload(reservation, actorId),
        "update reservation issue",
      );
      await refreshInventorySummaryAfterWrite(partId);
      return { data: await mapReservationWithPart(await fetchReservation(updated.id)) };
    } catch (error) {
      await tx.compensate(error);
    }
  }

  if (body.action === "return") {
    if (!partId) throw new PartsInventoryError("Reservation has no part reference", 409);

    const stock = await fetchStockRow(partId, branchId);
    if (!stock) throw new PartsInventoryError("Stock row does not exist for this reservation", 404);

    const returnableQuantity = Math.max(0, issuedQuantity - returnedQuantity);
    const quantity = body.quantity ?? returnableQuantity;
    if (quantity <= 0 || quantity > returnableQuantity) {
      throw new PartsInventoryError("Return quantity exceeds issued quantity", 409, {
        returnableQuantity,
        requestedQuantity: quantity,
      });
    }

    const tx = new CompensationStack();
    try {
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
        tx,
      );

      const updatedReturned = returnedQuantity + quantity;
      const updated = await updateItemWithRollback<DirectusReservationRow>(
        tx,
        "fleet_part_reservations",
        reservation.id,
        {
          returned_quantity: updatedReturned,
          status: deriveReservationStatus({
            reserved: reservedQuantity,
            issued: issuedQuantity,
            returned: updatedReturned,
            cancelled: cancelledQuantity,
            damaged: reservationDamagedQuantity,
          }),
          updated_at: now,
          updated_by: actorId,
        },
        reservationRollbackPayload(reservation, actorId),
        "update reservation return",
      );
      await refreshInventorySummaryAfterWrite(partId);
      return { data: await mapReservationWithPart(await fetchReservation(updated.id)) };
    } catch (error) {
      await tx.compensate(error);
    }
  }

  if (body.action === "return_damage") {
    if (!partId) throw new PartsInventoryError("Reservation has no part reference", 409);
    if (!body.remarks) throw new PartsInventoryError("Remarks are required when returning damaged stock", 400);

    const stock = await fetchStockRow(partId, branchId);
    if (!stock) throw new PartsInventoryError("Stock row does not exist for this reservation", 404);

    const returnableIssuedQuantity = Math.max(0, issuedQuantity - returnedQuantity);
    const damageableQuantity = returnableIssuedQuantity + unissuedQuantity;
    const quantity = body.quantity ?? damageableQuantity;
    if (quantity <= 0 || quantity > damageableQuantity) {
      throw new PartsInventoryError("Damaged return quantity exceeds reservation quantity", 409, {
        damageableQuantity,
        requestedQuantity: quantity,
      });
    }

    const issuedDamagedQuantity = Math.min(quantity, returnableIssuedQuantity);
    const reservedDamagedQuantity = quantity - issuedDamagedQuantity;
    const stockOnHand = asNumber(stock.stock_on_hand);
    const stockReservedQuantity = asNumber(stock.reserved_quantity);
    const stockDamagedQuantity = asNumber(stock.damaged_quantity);

    const tx = new CompensationStack();
    try {
      await patchStockAndCreateMovement(
        stock,
        {
          stockOnHand: stockOnHand + issuedDamagedQuantity,
          reservedQuantity: stockReservedQuantity - reservedDamagedQuantity,
          damagedQuantity: stockDamagedQuantity + quantity,
        },
        {
          partId,
          branchId,
          movementType: "Damage",
          adjustmentDirection: "IN",
          quantity,
          vehicleId,
          motorpoolJobId: asNullableNumber(reservation.motorpool_job_id),
          reservationId: reservation.id,
          referenceNo: movementOverride?.referenceNo ?? body.referenceNo ?? null,
          reasonCode: movementOverride?.reasonCode ?? "RETURN_DAMAGED",
          remarks: movementOverride?.remarks ?? body.remarks,
          movementAt: movementOverride?.movementAt ?? now,
        },
        actorId,
        tx,
      );

      const updatedReturned = returnedQuantity + issuedDamagedQuantity;
      const updatedCancelled = cancelledQuantity + reservedDamagedQuantity;
      const updated = await updateItemWithRollback<DirectusReservationRow>(
        tx,
        "fleet_part_reservations",
        reservation.id,
        {
          returned_quantity: updatedReturned,
          cancelled_quantity: updatedCancelled,
          status: deriveReservationStatus({
            reserved: reservedQuantity,
            issued: issuedQuantity,
            returned: updatedReturned,
            cancelled: updatedCancelled,
            damaged: reservationDamagedQuantity + quantity,
          }),
          updated_at: now,
          updated_by: actorId,
        },
        reservationRollbackPayload(reservation, actorId),
        "update reservation damaged return",
      );
      await refreshInventorySummaryAfterWrite(partId);
      return { data: await mapReservationWithPart(await fetchReservation(updated.id)) };
    } catch (error) {
      await tx.compensate(error);
    }
  }

  if (!body.cancelReason) {
    throw new PartsInventoryError("Cancellation reason is required", 400);
  }
  if (unissuedQuantity <= 0) {
    throw new PartsInventoryError("No unissued reserved quantity remains to cancel", 409);
  }

  const stock = partId ? await fetchStockRow(partId, branchId) : null;
  const tx = new CompensationStack();
  try {
    if (stock) {
      await updateStockWithRevisionWithRollback(
        tx,
        stock,
        {
          stockOnHand: asNumber(stock.stock_on_hand),
          reservedQuantity: Math.max(0, asNumber(stock.reserved_quantity) - unissuedQuantity),
          damagedQuantity: asNumber(stock.damaged_quantity),
        },
        actorId,
        now,
      );
    }

    const updated = await updateItemWithRollback<DirectusReservationRow>(
      tx,
      "fleet_part_reservations",
      reservation.id,
      {
        cancelled_quantity: cancelledQuantity + unissuedQuantity,
        status: deriveReservationStatus({
          reserved: reservedQuantity,
          issued: issuedQuantity,
          returned: returnedQuantity,
          cancelled: cancelledQuantity + unissuedQuantity,
          damaged: reservationDamagedQuantity,
        }),
        cancelled_at: now,
        cancelled_by: actorId,
        cancel_reason: body.cancelReason,
        updated_at: now,
        updated_by: actorId,
      },
      reservationRollbackPayload(reservation, actorId),
      "update reservation cancellation",
    );
    await refreshInventorySummaryAfterWrite(partId);
    return { data: await mapReservationWithPart(await fetchReservation(updated.id)) };
  } catch (error) {
    await tx.compensate(error);
  }
}

export async function updateReservation(body: UpdateReservationRequest, actorId: ActorId) {
  return applyReservationAction(body, actorId);
}

type InternalMovementQuery = MovementFilterQuery & { categoryId?: number };

function movementListFilter(query: InternalMovementQuery) {
  const filter: UnknownRecord = {
    ...movementDateFilter(query),
  };
  if (query.partId) filter.part_id = { _eq: query.partId };
  else if (query.categoryId) filter.part_id = { category_id: { _eq: query.categoryId } };
  if (query.branchId) filter.branch_id = { _eq: query.branchId };
  if (query.vehicleId) filter.vehicle_id = { _eq: query.vehicleId };
  if (query.movementType) filter.movement_type = { _eq: query.movementType };

  const search = query.search.trim();
  if (search) {
    filter._or = [
      { movement_no: { _icontains: search } },
      { reference_no: { _icontains: search } },
      { remarks: { _icontains: search } },
      { part_id: { part_code: { _icontains: search } } },
      { part_id: { part_name: { _icontains: search } } },
      { branch_id: { branch_name: { _icontains: search } } },
      { vehicle_id: { vehicle_plate: { _icontains: search } } },
      { vehicle_id: { name: { _icontains: search } } },
    ];
  }

  return filter;
}

async function mapMovementRows(rows: DirectusMovementRow[]) {
  let mapped = await enrichMovementRowsWithParts(rows.map(mapMovement));
  mapped = await enrichRowsWithVehicles(mapped);
  return mapped;
}

async function getMovementRows(
  query: InternalMovementQuery,
  pagination?: { page: number; limit: number },
) {
  const params = {
    fields: fields(MOVEMENT_FIELDS),
    filter: filterParam(movementListFilter(query)),
    sort: "-movement_at",
  };
  const result = pagination
    ? await listItemsPage<DirectusMovementRow>("fleet_part_movements", {
      ...params,
      page: pagination.page,
      limit: pagination.limit,
    })
    : {
      data: await listItemsBatched<DirectusMovementRow>("fleet_part_movements", params),
      total: 0,
    };
  const rows = await mapMovementRows(result.data);

  return {
    rows,
    total: pagination ? result.total : rows.length,
  };
}

async function getFilteredMovementRows(query: InternalMovementQuery) {
  return (await getMovementRows(query)).rows;
}

export async function listMovements(query: MovementQuery) {
  const { rows, total } = await getMovementRows(query, { page: query.page, limit: query.limit });

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
}

export async function listReservations(query: ReservationQuery) {
  const filter: UnknownRecord = {};
  if (query.partId) filter.part_id = { _eq: query.partId };
  if (query.branchId) filter.branch_id = { _eq: query.branchId };
  if (query.vehicleId) filter.vehicle_id = { _eq: query.vehicleId };
  if (query.status && query.status !== "all") filter.status = { _eq: query.status };
  const search = query.search.trim();
  if (search) {
    filter._or = [
      { reservation_no: { _icontains: search } },
      { remarks: { _icontains: search } },
      { part_id: { part_code: { _icontains: search } } },
      { part_id: { part_name: { _icontains: search } } },
      { branch_id: { branch_name: { _icontains: search } } },
      { vehicle_id: { vehicle_plate: { _icontains: search } } },
      { vehicle_id: { name: { _icontains: search } } },
    ];
  }

  const reservations = await listItemsPage<DirectusReservationRow>("fleet_part_reservations", {
    page: query.page,
    limit: query.limit,
    fields: fields(RESERVATION_FIELDS),
    filter: filterParam(filter),
    sort: "-created_at",
  });

  const enrichedRows = await enrichReservationRowsWithDamage(
    await enrichRowsWithVehicles(await enrichReservationRowsWithParts(reservations.data.map(mapReservation))),
  );

  return {
    data: enrichedRows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: reservations.total,
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

export async function createSharedUnit(payload: {
  unitName: string;
  unitShortcut: string;
  skuCode?: string | null;
  order?: number | null;
}) {
  const unitName = payload.unitName.trim();
  const unitShortcut = payload.unitShortcut.trim();
  const skuCode = payload.skuCode?.trim() || null;
  const order = payload.order ?? 0;

  if (!unitName) throw new PartsInventoryError("Unit name is required", 400);
  if (!unitShortcut) throw new PartsInventoryError("Unit shortcut is required", 400);

  const duplicateFilters: UnknownRecord[] = [
    { unit_name: { _eq: unitName } },
    { unit_shortcut: { _eq: unitShortcut } },
  ];
  if (skuCode) duplicateFilters.push({ sku_code: { _eq: skuCode } });

  const existing = await listItems<UnknownRecord>("units", {
    limit: 1,
    fields: fields(UNIT_FIELDS),
    filter: filterParam({ _or: duplicateFilters }),
  });
  if (existing.length > 0) {
    const duplicate = existing[0];
    if (asString(duplicate.unit_name).toLowerCase() === unitName.toLowerCase()) {
      throw new PartsInventoryError(`Unit name "${unitName}" already exists`, 409);
    }
    if (asString(duplicate.unit_shortcut).toLowerCase() === unitShortcut.toLowerCase()) {
      throw new PartsInventoryError(`Unit shortcut "${unitShortcut}" already exists`, 409);
    }
    throw new PartsInventoryError(`Unit code "${skuCode}" already exists`, 409);
  }

  const created = await createItem<UnknownRecord>("units", {
    unit_name: unitName,
    unit_shortcut: unitShortcut,
    sku_code: skuCode,
    order,
  });

  return {
    id: asNullableNumber(created.unit_id),
    name: asString(created.unit_name),
    shortcut: asString(created.unit_shortcut),
    skuCode: asNullableString(created.sku_code),
    order: asNullableNumber(created.order),
  };
}

export async function listLookups() {
  const [categories, units, vehicleTypes, branches, vehicles] = await Promise.all([
    listItems<UnknownRecord>("fleet_part_categories", {
      limit: -1,
      fields: fields(CATEGORY_FIELDS),
      filter: filterParam({ deleted_at: { _null: true }, is_active: { _eq: true } }),
      sort: "category_name",
    }),
    listItems<UnknownRecord>("units", {
      limit: -1,
      fields: fields(UNIT_FIELDS),
      sort: "order,unit_name",
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
    units: units.map((unit) => ({
      id: asNullableNumber(unit.unit_id),
      name: asString(unit.unit_name),
      shortcut: asString(unit.unit_shortcut),
      skuCode: asNullableString(unit.sku_code),
      order: asNullableNumber(unit.order),
    })).filter((unit): unit is { id: number; name: string; shortcut: string; skuCode: string | null; order: number | null } =>
      unit.id != null && unit.name.length > 0 && unit.shortcut.length > 0
    ),
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

async function getStockReportFromSummaryCollection(
  query: ReportQuery,
  stockStatusFilter?: PartStockStatus,
) {
  const filter: UnknownRecord = {
    scope: { _eq: query.branchId ? "branch" : "all" },
    deleted_at: { _null: true },
    is_active: { _eq: true },
  };
  if (query.branchId) filter.branch_id = { _eq: query.branchId };
  if (query.categoryId) filter.category_id = { _eq: query.categoryId };
  if (stockStatusFilter) filter.stock_status = { _eq: stockStatusFilter };

  const page = await listItemsPage<DirectusInventorySummaryRow>(INVENTORY_SUMMARY_COLLECTION, {
    page: query.page,
    limit: query.limit,
    fields: fields(INVENTORY_SUMMARY_FIELDS),
    filter: filterParam(filter),
    sort: "part_code,branch_name",
  });
  return {
    rows: page.data.map((row) => ({
      partCode: asString(row.part_code),
      partName: asString(row.part_name),
      categoryName: asNullableString(row.category_name),
      branchName: asNullableString(row.branch_name),
      stockOnHand: asNumber(row.stock_on_hand),
      reservedQuantity: asNumber(row.reserved_quantity),
      damagedQuantity: asNumber(row.damaged_quantity),
      availableQuantity: asNumber(row.available_quantity),
      minimumQuantity: asNumber(row.minimum_quantity),
      stockStatus: asString(row.stock_status) as PartStockStatus,
      shortageQuantity: Math.max(0, asNumber(row.minimum_quantity) - asNumber(row.available_quantity)),
      lastMovementAt: row.last_movement_at ?? null,
    })),
    total: page.total,
  };
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
    latestMovementAt: string | null;
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
      latestMovementAt: null,
    };

    if (movement.movementType === "Issue") current.issuedQuantity += movement.quantity;
    if (movement.movementType === "Return") current.returnedQuantity += movement.quantity;
    if (movement.movementType === "Damage") current.damagedQuantity += movement.quantity;
    if (movement.movementAt && (!current.latestMovementAt || new Date(movement.movementAt).getTime() > new Date(current.latestMovementAt).getTime())) {
      current.latestMovementAt = movement.movementAt;
    }
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
  const meta = (total: number) => ({ page: query.page, limit: query.limit, total });
  const pageRows = <T>(rows: T[]) => paginate(rows, query.page, query.limit);

  if (["stock_on_hand", "low_stock", "out_of_stock"].includes(type)) {
    const stockStatusFilter = type === "low_stock" || type === "out_of_stock" ? type : undefined;
    const report = await getStockReportFromSummaryCollection(query, stockStatusFilter);
    return { type, data: report.rows, meta: meta(report.total) };
  }

  const movementQuery = {
    vehicleId: query.vehicleId,
    branchId: query.branchId,
    movementType: query.movementType,
    categoryId: query.categoryId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    search: "",
  };

  if (type === "movement_audit") {
    const movements = await getMovementRows(movementQuery, { page: query.page, limit: query.limit });
    return { type, data: movements.rows, meta: meta(movements.total) };
  }

  const reportMovements = await getFilteredMovementRows(movementQuery);

  if (type === "usage_by_vehicle") {
    const rows = usageByVehicle(reportMovements);
    return { type, data: pageRows(rows), meta: meta(rows.length) };
  }

  if (type === "usage_by_category") {
    const rows = usageByCategory(reportMovements);
    return { type, data: pageRows(rows), meta: meta(rows.length) };
  }

  return { type, data: pageRows(reportMovements), meta: meta(reportMovements.length) };
}
