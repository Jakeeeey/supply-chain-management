import type {
  ReturnToSupplier,
  RTSItem,
  InventoryRecord,
  ReferenceData,
  CreateReturnDTO,
} from "../types/rts.schema";

const API_BASE = "/api/scm/outbound/return-to-supplier-manual";

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a fetch response and throws on error.
 * Extracts the `data` field from the JSON body.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const errMsg = json.error || json.message || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return json.data as T;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Fetches all Return-to-Supplier transactions for the list view.
 * @returns Array of ReturnToSupplier records.
 */
export async function listTransactions(): Promise<ReturnToSupplier[]> {
  const res = await fetch(`${API_BASE}?action=list`, { cache: "no-store" });
  return handleResponse<ReturnToSupplier[]>(res);
}

/**
 * Fetches the line items for a specific RTS transaction.
 * @param id - The return_to_supplier record ID.
 * @returns Array of RTSItem records.
 */
export async function getTransactionDetails(
  id: string,
): Promise<RTSItem[]> {
  const res = await fetch(`${API_BASE}?action=details&id=${id}`, {
    cache: "no-store",
  });
  return handleResponse<RTSItem[]>(res);
}

/**
 * Fetches all reference data (suppliers, branches, products, discounts, etc.).
 * @returns ReferenceData bundle.
 */
export async function getReferences(): Promise<ReferenceData> {
  const res = await fetch(`${API_BASE}?action=references`, {
    cache: "no-store",
  });
  return handleResponse<ReferenceData>(res);
}

/**
 * Fetches running inventory for a specific branch and supplier.
 * Returns display-ready records with remainder cascade applied.
 * @param branchId - The branch ID.
 * @param supplierId - The supplier ID.
 * @returns Array of InventoryRecord with floored stock values.
 */
export async function getInventory(
  branchId: number,
  supplierId: number,
): Promise<InventoryRecord[]> {
  const res = await fetch(
    `${API_BASE}?action=inventory&branchId=${branchId}&supplierId=${supplierId}`,
    { cache: "no-store" },
  );
  return handleResponse<InventoryRecord[]>(res);
}



/**
 * Creates a new Return-to-Supplier transaction.
 * @param dto - The create payload (validated on the server via Zod).
 * @returns The created record data, or throws on error.
 */
export async function createTransaction(dto: CreateReturnDTO): Promise<unknown> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  return handleResponse(res);
}

/**
 * Updates an existing Return-to-Supplier transaction.
 * @param id - The return_to_supplier record ID.
 * @param dto - The update payload (validated on the server via Zod).
 * @returns Success confirmation, or throws on error.
 */
export async function updateTransaction(
  id: string,
  dto: CreateReturnDTO,
): Promise<unknown> {
  const res = await fetch(`${API_BASE}?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  return handleResponse(res);
}
