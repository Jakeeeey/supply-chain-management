/** Dispatch invoice status values from post_dispatch_invoices.status */
export type InvoiceDispatchStatus =
  | "Not Fulfilled"
  | "Fulfilled"
  | "Fulfilled With Returns"
  | "Fulfilled With Concerns";

/** Flat enriched invoice record returned by the API */
export interface ForArrivalInvoice {
  /** post_dispatch_plan.id */
  dispatchPlanId: string;
  /** post_dispatch_plan.doc_no */
  dispatchDocNo: string;

  /** post_dispatch_invoices.sequence */
  sequence: number;

  /** sales_invoice.order_id */
  orderId: string;
  /** sales_invoice.invoice_id */
  invoiceId: string;
  /** sales_invoice.invoice_no */
  invoiceNo: string;

  /** customer.customer_code */
  customerCode: string;
  /** customer.customer_name */
  customerName: string;

  /** customer.brgy */
  brgy: string;
  /** customer.city */
  city: string;
  /** customer.province */
  province: string;

  /** sales_invoice.net_amount */
  netAmount: number;
  /** sales_invoice.total_amount */
  totalAmount: number;

  /** sales_invoice.created_date */
  createdDate: string;

  /** Resolved driver first name */
  driverFirstName: string;
  /** Resolved driver last name */
  driverLastName: string;

  /** Aggregated helper full names */
  helperNames: string[];

  /** vehicles.vehicle_plate */
  vehiclePlate: string;

  /** post_dispatch_invoices.status */
  invoiceStatus: string;
  /** post_dispatch_plan.status */
  dispatchStatus: string;

  /** post_dispatch_plan.estimated_time_of_dispatch */
  estimatedTimeOfDispatch: string;
  /** post_dispatch_plan.estimated_time_of_arrival */
  estimatedTimeOfArrival: string;
}

/** API response wrapper */
export interface ForArrivalSummaryResponse {
  data: ForArrivalInvoice[];
}

/** Grouped structure for Kanban columns */
export interface DispatchPlanGroup {
  /** post_dispatch_plan.doc_no */
  dispatchDocNo: string;
  /** ISO date string for estimated dispatch */
  estimatedTimeOfDispatch: string;
  /** Formatted date display */
  dateLabel: string;
  /** Driver name */
  driverName: string;
  /** Vehicle plate */
  vehiclePlate: string;
  /** Invoices in this dispatch plan */
  invoices: ForArrivalInvoice[];
}

/** Grouped invoices by customer within a dispatch plan column */
export interface GroupedArrivalInvoice {
  /** Aggregation key (customerName) */
  groupKey: string;
  /** Customer name shared by all invoices in this group */
  customerName: string;
  /** Sequence number (from the first invoice in the group) */
  sequence: number;
  /** All individual invoices belonging to this customer group */
  invoices: ForArrivalInvoice[];
  /** Summed net amount across all invoices */
  totalNetAmount: number;
  /** Summed total amount across all invoices */
  totalAmount: number;
  /** Address from the first invoice */
  brgy: string;
  city: string;
  province: string;
}

// ─── Directus Row Interfaces (Backend use only) ────────────────

export interface PostDispatchPlanRow {
  id: number;
  doc_no: string;
  driver_id: number;
  vehicle_id: number;
  status: string;
  estimated_time_of_dispatch: string | null;
  estimated_time_of_arrival: string | null;
  time_of_dispatch: string | null;
  remarks: string | null;
}

export interface PostDispatchPlanStaffRow {
  post_dispatch_plan_id: number;
  user_id: number;
  role: string;
  is_present: number | boolean;
}

export interface PostDispatchInvoiceRow {
  id: number;
  post_dispatch_plan_id: number;
  invoice_id: number;
  sequence: number;
  status: string;
  distance: number | null;
  remarks: string | null;
}

export interface SalesInvoiceRow {
  invoice_id: number;
  order_id: string | number;
  invoice_no: string;
  customer_code: string;
  total_amount: number | string;
  net_amount: number | string;
  created_date: string;
  transaction_status: string;
}

export interface CustomerRow {
  customer_code: string;
  customer_name: string;
  brgy: string;
  city: string;
  province: string;
}

export interface UserRow {
  user_id: number;
  user_fname: string;
  user_lname: string;
}

export interface VehicleRow {
  vehicle_id: number;
  vehicle_plate: string;
}
