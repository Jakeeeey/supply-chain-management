import { directusGet } from "./sales-return.client";

/**
 * Fetches raw sales return header records with pagination and filters.
 */
export async function getRawReturns(
  page: number = 1,
  limit: number = 10,
  filters: { salesman?: string; customer?: string; status?: string; invoiceNo?: string } = {},
) {
  const allowedFields =
    "return_id,return_number,invoice_no,customer_code,salesman_id,total_amount,status,return_date,remarks,order_id,isThirdParty,created_at,price_type,received_at";

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
  const searchUrl = `/items/sales_return_details?filter[return_no][_eq]=${encodeURIComponent(returnNo)}&fields=*,product_id.*,product_id.is_serialized&limit=-1`;
  return directusGet<{ data: Record<string, unknown>[] }>(searchUrl);
}

/**
 * Fetches a single sales return header by ID (for status card).
 */
export async function getRawReturnById(returnId: number) {
  const fields = "return_id,isApplied,updated_at,status,isPosted,isReceived,order_id,received_at";
  return directusGet<{ data: Record<string, unknown> }>(
    `/items/sales_return/${returnId}?fields=${fields}`,
  );
}
