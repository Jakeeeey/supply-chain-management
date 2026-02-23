export type PendingStatus = "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";

export type PendingInvoiceRow = {
  id: number; // ✅ used by table key + details/export mapping
  invoice_no: string;
  invoice_date: string | null;
  customer: string | null;
  salesman: string | null;
  salesman_id: number | null;
  net_amount: number;
  dispatch_plan: string;
  pending_status: PendingStatus;
};

export type PendingInvoiceKpis = {
  total_count: number;
  total_amount: number;
  by_status: Record<PendingStatus, { count: number; amount: number }>;
};

export type PendingInvoiceListResponse = {
  rows: PendingInvoiceRow[];
  total: number;
  kpis: PendingInvoiceKpis;
};

export type PendingInvoiceOptions = {
  salesmen: { id: number; label: string }[];
  customers: { code: string; label: string }[];
  statuses: string[];
};

export type InvoiceDetailsResponse = {
  header: {
    invoice_no: string;
    invoice_date: string | null;
    dispatch_date: string | null;
    customer_code: string | null;
    customer_name: string | null;
    address: string | null;
    salesman: string | null;
    sales_type: string | null;
    invoice_type: string | null;
    price_type: string | null;
    status: PendingStatus;
    dispatch_plan: string;
  };
  lines: {
    id: number | string;
    product_id: number | null;
    product_name: string | null;
    unit: string | null;
    qty: number;
    price: number;
    gross: number;
    disc_type: string;
    disc_amt: number;
    net_total: number;
  }[];
  summary: {
    gross: number;
    discount: number;
    vatable: number;
    net: number;
    vat: number;
    total: number;
    balance: number;
  };
};

export type FiltersState = {
  q: string;
  status: "All" | PendingStatus;
  salesmanId: "All" | string;
  customerCode: "All" | string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};
