// =============================================================================
// INTERNAL HELPERS — Directus Client (Module-Isolated)
// =============================================================================

/** Returns the Directus base URL (no trailing slash). Throws if not set. */
function getDirectusBase(): string {
  const raw =
    process.env.DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";
  const cleaned = raw.trim().replace(/\/$/, "");
  if (!cleaned) {
    throw new Error("DIRECTUS_URL is not set. Add it to .env.local and restart the dev server.");
  }
  return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
}

/** Returns the Directus static token. Throws if not set. */
function getDirectusToken(): string {
  const token = (process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();
  if (!token) {
    throw new Error("DIRECTUS_STATIC_TOKEN is not set. Add it to .env.local and restart the dev server.");
  }
  return token;
}

/** Returns headers for authenticated Directus requests. */
function directusHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getDirectusToken()}`,
  };
}

/** Fetches a Directus URL with JSON response handling. Throws on non-2xx. */
async function directusFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...directusHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errors = json?.errors as Array<{ message: string }> | undefined;
    const msg =
      errors?.[0]?.message ||
      (json?.error as string) ||
      `Directus responded ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return json as T;
}

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
  filters: { salesman?: string; customer?: string; status?: string; invoiceNo?: string } = {},
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
  if (filters.invoiceNo)
    url += `&filter[invoice_no][_eq]=${encodeURIComponent(filters.invoiceNo)}`;

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
 * Fetches invoice list (unposted) optionally filtered by customer code.
 */
export async function getRawInvoices(
  salesmanId?: string,
  customerCode?: string,
) {
  let url =
    "/items/sales_invoice?limit=-1&fields=invoice_id,invoice_no,customer_code,order_id,salesman_id,isPosted,total_amount";

  if (customerCode) {
    url += `&filter[customer_code][_eq]=${encodeURIComponent(customerCode)}`;
  }
  if (salesmanId) {
    url += `&filter[salesman_id][_eq]=${salesmanId}`;
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
export async function updateReturnStatus(
  id: number,
  status: string,
  isReceived?: number,
  received_at?: string,
) {
  const payload: Record<string, unknown> = { status };
  if (isReceived !== undefined) payload.isReceived = isReceived;
  if (received_at !== undefined) payload.received_at = received_at;

  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_return/${id}`,
    "PATCH",
    payload,
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
