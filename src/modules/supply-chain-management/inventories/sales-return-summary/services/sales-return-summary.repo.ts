import { SummaryFilters } from "../type";

/** Returns the Directus base URL (no trailing slash). Throws if not set. */
function getDirectusBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const cleaned = raw.trim().replace(/\/$/, "");
  if (!cleaned) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set.");
  }
  return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
}

/** Returns the Directus static token. Throws if not set. */
function getDirectusToken(): string {
  const token = (process.env.DIRECTUS_STATIC_TOKEN || "").trim();
  if (!token) {
    throw new Error("DIRECTUS_STATIC_TOKEN is not set.");
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
export async function directusGet<T>(path: string): Promise<T> {
  const base = getDirectusBase();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  return directusFetch(url, { method: "GET" });
}

export async function fetchCustomers() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/customer?limit=-1&fields=customer_code,customer_name,store_name`,
  );
}

export async function fetchSalesmen() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/salesman?limit=-1&fields=id,salesman_name,salesman_code,branch_code`,
  );
}

export async function fetchBranches() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/branches?limit=-1&fields=id,branch_name`,
  );
}

export async function fetchReturnTypes() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/sales_return_type?limit=-1&fields=type_id,type_name`,
  );
}

export async function fetchLineDiscounts() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/line_discount?limit=-1&fields=id,line_discount,percentage`,
  );
}

export async function fetchBrands() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/brand?limit=-1&fields=brand_id,brand_name`,
  );
}

export async function fetchSuppliers() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/suppliers?limit=-1&fields=id,supplier_shortcut,nonBuy`,
  );
}

export async function fetchUnits() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/units?limit=-1&fields=unit_id,unit_name`,
  );
}

export async function fetchCategories() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/categories?limit=-1&fields=category_id,category_name`,
  );
}

export async function fetchProductPerSupplier() {
  return directusGet<{ data: Record<string, any>[] }>(
    `/items/product_per_supplier?limit=-1&fields=product_id,supplier_id`,
  );
}

export async function fetchSalesReturnHeaders(
  page: number,
  limit: number,
  search: string,
  filters: SummaryFilters,
) {
  let url = `/items/sales_return?page=${page}&limit=${limit}&meta=filter_count&fields=return_id,return_number,return_date,status,customer_code,salesman_id,invoice_no,total_amount,remarks&sort=-return_date,-return_id`;

  if (search) {
    const term = encodeURIComponent(search);
    url += `&filter[_or][0][return_number][_contains]=${term}`;
    url += `&filter[_or][1][invoice_no][_contains]=${term}`;
    url += `&filter[_or][2][customer_code][_contains]=${term}`;
    url += `&filter[_or][3][status][_contains]=${term}`;
  }
  if (filters.status && filters.status !== "All")
    url += `&filter[status][_eq]=${encodeURIComponent(filters.status)}`;
  if (filters.customerCode && filters.customerCode !== "All")
    url += `&filter[customer_code][_eq]=${encodeURIComponent(filters.customerCode)}`;
  if (filters.salesmanId && filters.salesmanId !== "All")
    url += `&filter[salesman_id][_eq]=${encodeURIComponent(String(filters.salesmanId))}`;
  if (filters.dateFrom)
    url += `&filter[return_date][_gte]=${encodeURIComponent(filters.dateFrom)}`;
  if (filters.dateTo)
    url += `&filter[return_date][_lte]=${encodeURIComponent(filters.dateTo)}`;

  return directusGet<{ data: Record<string, any>[]; meta?: { filter_count?: number } }>(url);
}

export async function fetchSalesReturnDetails(returnNos: string[]) {
  if (returnNos.length === 0) return { data: [] };
  const inFilterParam = returnNos
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map((v) => encodeURIComponent(String(v)))
    .join(",");

  const detailsUrl = `/items/sales_return_details?limit=-1&filter[return_no][_in]=${inFilterParam}&fields=detail_id,return_no,reason,quantity,unit_price,gross_amount,discount_type,total_amount,sales_return_type_id,product_id.product_id,product_id.product_code,product_id.product_name,product_id.product_brand,product_id.parent_id,product_id.unit_of_measurement,product_id.product_category`;
  return directusGet<{ data: Record<string, any>[] }>(detailsUrl);
}
