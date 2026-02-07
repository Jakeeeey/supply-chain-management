import type {
  FiltersState,
  PendingInvoiceListResponse,
  PendingInvoiceOptions,
  InvoiceDetailsResponse,
} from "../types";

const API_BASE = "/api/scm/fleet-management/logistics-delivery/pending-invoices";

function qs(filters: FiltersState) {
  const p = new URLSearchParams();
  p.set("q", filters.q || "");
  p.set("status", filters.status);
  p.set("salesmanId", filters.salesmanId);
  p.set("customerCode", filters.customerCode);
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) p.set("dateTo", filters.dateTo);
  p.set("page", String(filters.page));
  p.set("pageSize", String(filters.pageSize));
  return p.toString();
}

async function http<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (data ?? {}) as T;
}

export async function listPendingInvoices(filters: FiltersState) {
  return http<PendingInvoiceListResponse>(`${API_BASE}?${qs(filters)}`);
}

export async function getPendingInvoiceOptions() {
  return http<PendingInvoiceOptions>(`${API_BASE}/options`);
}

export async function getInvoiceDetails(invoiceNo: string) {
  return http<InvoiceDetailsResponse>(`${API_BASE}/${encodeURIComponent(invoiceNo)}`);
}

// for ExportDialog (itemized)
export async function getItemizedReplica(params: {
  q?: string;
  status?: string;
  salesmanId?: string;
  customerCode?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.status) p.set("status", params.status);
  if (params.salesmanId) p.set("salesmanId", params.salesmanId);
  if (params.customerCode) p.set("customerCode", params.customerCode);
  if (params.dateFrom) p.set("dateFrom", params.dateFrom);
  if (params.dateTo) p.set("dateTo", params.dateTo);

  return http<{ rows: any[] }>(`${API_BASE}/itemized?${p.toString()}`);
}
