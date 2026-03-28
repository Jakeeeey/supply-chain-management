/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDirectusBase, directusFetch } from "@/lib/directus";

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/** Helper for Directus GET requests */
async function directusGet<T>(path: string): Promise<T> {
  const base = getDirectusBase();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  return directusFetch(url, { method: "GET" });
}

/** Helper for Directus POST/PATCH/DELETE requests */
async function directusMutate<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const base = getDirectusBase();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const options: RequestInit = { method };
  if (body) {
    options.body = JSON.stringify(body);
  }

  return directusFetch(url, options);
}

// =============================================================================
// REPOSITORY METHODS — READ
// =============================================================================

/**
 * Fetches raw sales return header records with pagination and filters.
 */
export async function getRawReturns(
  page: number = 1,
  limit: number = 10,
  filters: { salesman?: string; customer?: string; status?: string } = {},
) {
  const allowedFields =
    "return_id,return_number,invoice_no,customer_code,salesman_id,total_amount,status,return_date,remarks,order_id,isThirdParty,created_at,price_type";

  let url = `/items/sales_return?page=${page}&limit=${limit}&meta=filter_count&fields=${allowedFields}&sort=-return_id`;

  if (filters.salesman && filters.salesman !== "All")
    url += `&filter[salesman_id][_eq]=${filters.salesman}`;
  if (filters.customer && filters.customer !== "All")
    url += `&filter[customer_code][_eq]=${encodeURIComponent(filters.customer)}`;
  if (filters.status && filters.status !== "All")
    url += `&filter[status][_eq]=${filters.status}`;
  if ((filters as any).invoiceNo)
    url += `&filter[invoice_no][_eq]=${encodeURIComponent((filters as any).invoiceNo)}`;

  return directusGet<{ data: Record<string, unknown>[]; meta?: { filter_count?: number } }>(url);
}

/**
 * Fetches raw sales return detail items for a specific return number.
 */
export async function getRawReturnDetails(returnNo: string) {
  const searchUrl = `/items/sales_return_details?filter[return_no][_eq]=${encodeURIComponent(returnNo)}&fields=*,product_id.*&limit=-1`;
  return directusGet<{ data: Record<string, unknown>[] }>(searchUrl);
}

/**
 * Fetches a single sales return header by ID (for status card).
 */
export async function getRawReturnById(returnId: number) {
  const fields = "return_id,isApplied,updated_at,status,isPosted,isReceived,order_id";
  return directusGet<{ data: Record<string, unknown> }>(
    `/items/sales_return/${returnId}?fields=${fields}`,
  );
}

/**
 * Fetches linked invoice from the junction table.
 */
export async function getRawLinkedInvoice(returnId: number) {
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_invoice_sales_return?filter[return_no][_eq]=${returnId}&fields=invoice_no.invoice_no`,
  );
}

/**
 * Fetches all reference data needed for dropdowns and forms.
 */
export async function getRawReferences() {
  return Promise.all([
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/salesman?limit=-1&fields=id,salesman_name,salesman_code,price_type,branch_code&filter[isActive][_eq]=1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/customer?limit=-1&fields=id,customer_code,customer_name,store_name&filter[isActive][_eq]=1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/branches?limit=-1&fields=id,branch_name",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/discount_type?limit=-1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/sales_return_type?limit=-1",
    ),
  ]);
}

/**
 * Fetches the line_per_discount_type junction table.
 */
export async function getRawLinePerDiscountType() {
  return directusGet<{ data: Record<string, unknown>[] }>(
    "/items/line_per_discount_type?limit=-1&fields=id,type_id,line_id",
  );
}

/**
 * Fetches the line_discount table (individual discount percentages).
 */
export async function getRawLineDiscounts() {
  return directusGet<{ data: Record<string, unknown>[] }>(
    "/items/line_discount?limit=-1&fields=id,line_discount,percentage",
  );
}

/**
 * Fetches all product catalog data needed for ProductLookupModal.
 */
export async function getRawProductCatalog() {
  return Promise.all([
    directusGet<{ data: Record<string, unknown>[] }>("/items/brand?limit=-1"),
    directusGet<{ data: Record<string, unknown>[] }>("/items/categories?limit=-1"),
    directusGet<{ data: Record<string, unknown>[] }>("/items/suppliers?limit=-1"),
    directusGet<{ data: Record<string, unknown>[] }>("/items/units?limit=-1"),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/product_per_supplier?limit=-1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>("/items/products?limit=-1&filter[isActive][_eq]=1"),
  ]);
}

/**
 * Fetches invoice list optionally filtered by salesman and customer code.
 */
export async function getRawInvoices(salesmanId?: string, customerCode?: string) {
  let url =
    "/items/sales_invoice?limit=-1&fields=invoice_id,invoice_no,order_id,customer_code,salesman_id,total_amount";

  if (salesmanId) {
    url += `&filter[salesman_id][_eq]=${salesmanId}`;
  }
  if (customerCode) {
    url += `&filter[customer_code][_eq]=${encodeURIComponent(customerCode)}`;
  }

  return directusGet<{ data: Record<string, unknown>[] }>(url);
}

/**
 * Fetches units list (used for detail mapping).
 */
export async function getRawUnits() {
  return directusGet<{ data: Record<string, unknown>[] }>("/items/units?limit=-1");
}

/**
 * Fetches price types from the price_types table (A, B, C, D, E).
 */
export async function getRawPriceTypes() {
  return directusGet<{ data: Record<string, unknown>[] }>(
    "/items/price_types?limit=-1&sort=sort",
  );
}

// =============================================================================
// REPOSITORY METHODS — WRITE
// =============================================================================

/**
 * Creates a sales return header.
 */
export async function createReturnHeader(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_return",
    "POST",
    payload,
  );
}

/**
 * Creates a sales return detail item.
 */
export async function createReturnDetail(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_return_details",
    "POST",
    payload,
  );
}

/**
 * Updates a sales return header.
 */
export async function updateReturnHeader(
  id: number,
  payload: Record<string, unknown>,
) {
  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_return/${id}`,
    "PATCH",
    payload,
  );
}

/**
 * Deletes a sales return detail item.
 */
export async function deleteReturnDetail(id: number) {
  return directusMutate<void>(
    `/items/sales_return_details/${id}`,
    "DELETE",
  );
}

/**
 * Updates a sales return detail item.
 */
export async function updateReturnDetail(
  id: number,
  payload: Record<string, unknown>,
) {
  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_return_details/${id}`,
    "PATCH",
    payload,
  );
}

/**
 * Updates the status of a sales return.
 */
export async function updateReturnStatus(id: number, status: string) {
  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_return/${id}`,
    "PATCH",
    { status },
  );
}

/**
 * Checks for an existing junction link.
 */
export async function getJunctionLink(returnId: number) {
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_invoice_sales_return?filter[return_no][_eq]=${returnId}`,
  );
}

/**
 * Creates a junction link between invoice and sales return.
 */
export async function createJunctionLink(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_invoice_sales_return",
    "POST",
    payload,
  );
}

/**
 * Updates an existing junction link.
 */
export async function updateJunctionLink(
  linkId: number,
  payload: Record<string, unknown>,
) {
  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_invoice_sales_return/${linkId}`,
    "PATCH",
    payload,
  );
}

// =============================================================================
// REPOSITORY METHODS — RFID
// =============================================================================

/**
 * Creates an RFID tag record in sales_return_rfid.
 */
export async function createRfidTag(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_return_rfid",
    "POST",
    payload,
  );
}

/**
 * Fetches RFID tags for a specific sales return detail.
 */
export async function getRfidTagsByDetailId(detailId: number) {
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_return_rfid?filter[sales_return_detail_id][_eq]=${detailId}&limit=-1`,
  );
}

/**
 * Fetches RFID tags for multiple sales return details.
 */
export async function getRawRfidsByDetailIds(detailIds: number[]) {
  if (detailIds.length === 0) return { data: [] };
  const filterIds = detailIds.join(',');
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_return_rfid?filter[sales_return_detail_id][_in]=${filterIds}&limit=-1`,
  );
}

/**
 * Deletes an RFID tag record.
 */
export async function deleteRfidTag(id: number) {
  return directusMutate<void>(
    `/items/sales_return_rfid/${id}`,
    "DELETE",
  );
}

/**
 * Checks if an RFID tag is already used in ANY sales return record.
 * This is used to prevent the same RFID from being returned multiple times.
 */
export async function checkRfidDuplicate(rfidTag: string) {
  const url = `/items/sales_return_rfid?filter[rfid_tag][_eq]=${encodeURIComponent(rfidTag)}&fields=id,sales_return_detail_id.return_no`;
  return directusGet<{ data: Record<string, unknown>[] }>(url);
}

// =============================================================================
// REPOSITORY METHODS — RFID LOOKUP (Spring Boot VOS API)
// =============================================================================

/**
 * Looks up an RFID tag via Spring Boot VOS API to find the associated product.
 * Same endpoint used by return-to-supplier-rfid.
 */
export async function getSpringRfidLookup(
  rfidTag: string,
  branchId: number,
  token: string,
): Promise<{ productId: number; [key: string]: unknown }[]> {
  const SPRING_URL = process.env.SPRING_API_BASE_URL;
  if (!SPRING_URL) throw new Error("SPRING_API_BASE_URL is not defined");

  const targetUrl = `${SPRING_URL.replace(/\/$/, "")}/api/view-rfid-onhand?rfid=${encodeURIComponent(rfidTag)}&branchId=${branchId}`;

  const springRes = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!springRes.ok) {
    const text = await springRes.text().catch(() => `HTTP ${springRes.status}`);
    throw new Error(`RFID lookup failed (${springRes.status}): ${text}`);
  }

  return springRes.json();
}

/**
 * Fetches a single product by product_id with price and unit information.
 */
export async function getRawProductById(productId: number) {
  return directusGet<{ data: Record<string, unknown> }>(
    `/items/products/${productId}?fields=product_id,product_code,product_name,description,priceA,priceB,priceC,priceD,priceE,unit_of_measurement,unit_of_measurement_count`,
  );
}
