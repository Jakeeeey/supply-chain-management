// ─── Dispatch Creation Module — TypeScript Interfaces ───────
// All shared types for the dispatch-creation feature module.
// No Zod here — see dispatch.schema.ts for validation schemas.

// ─── Master-Data Lookup Options ─────────────────────────────

/** Driver record from the `user` collection (department = 8). */
export interface DriverOption {
  user_id: number;
  user_fname: string;
  user_lname: string;
}

/** Helper record from the `user` collection (department = 9). */
export interface HelperOption {
  user_id: number;
  user_fname: string;
  user_lname: string;
}

/** Active vehicle with its type name resolved. */
export interface VehicleOption {
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_type_name?: string;
}

/** Branch (starting-point / warehouse). */
export interface BranchOption {
  id: number;
  branch_name: string;
}

/** Chart-of-Accounts entry for budgeting. */
export interface COAOption {
  coa_id: number;
  account_title: string;
  gl_code: string;
  account_type?: number;
  is_payment?: number | { type: string; data: number[] };
}

/** Aggregated master-data payload returned to the client. */
export interface DispatchCreationMasterData {
  drivers: DriverOption[];
  helpers: HelperOption[];
  vehicles: VehicleOption[];
  branches: BranchOption[];
  coa: COAOption[];
}

// ─── Raw Directus Row Shapes ────────────────────────────────

/** Row from the `dispatch_plan` collection (Pre-Dispatch Plan). */
export interface RawDispatchPlan {
  dispatch_id: number;
  dispatch_no: string;
  driver_id?: number;
  vehicle_id?: number;
  cluster_id?: number;
  branch_id?: number;
  total_amount: number;
  status: string;
}

/** Row from the `sales_order` collection. */
export interface RawSalesOrder {
  order_id: number;
  order_no: string;
  order_status: string;
  customer_code?: string;
  total_amount?: number;
  net_amount?: number;
}

/** Row from the `sales_invoice` collection. */
export interface RawSalesInvoice {
  invoice_id: number;
  order_id: string;
  transaction_status: string;
}

/** Row from the `post_dispatch_plan` collection. */
export interface PostDispatchPlanRow {
  id: number;
  doc_no: string;
  dispatch_id: number;
  driver_id: number;
  vehicle_id: number;
  starting_point: number;
  status: string;
  amount?: number;
  encoder_id?: number;
  estimated_time_of_dispatch: string;
  estimated_time_of_arrival: string;
  remarks?: string;
}

/** Row from the `post_dispatch_plan_staff` collection. */
export interface PostDispatchStaffRow {
  id?: number;
  post_dispatch_plan_id: number;
  user_id: number;
  role: "Driver" | "Helper";
  is_present: boolean;
}

/** Row from the `post_dispatch_dispatch_plans` junction collection. */
export interface PostDispatchJunctionRow {
  id?: number;
  post_dispatch_plan_id: number;
  dispatch_plan_id: number;
  linked_at?: string;
  linked_by?: number;
}

/** Row from the `post_dispatch_budgeting` collection. */
export interface PostDispatchBudgetRow {
  id?: number;
  post_dispatch_plan_id: number;
  coa_id: number;
  amount: number;
  remarks?: string;
}

/** Row from the `post_dispatch_invoices` collection. */
export interface PostDispatchInvoiceRow {
  id?: number;
  post_dispatch_plan_id: number;
  invoice_id: number;
  sequence: number;
  invoiceNo?: string;
  status: string;
}

/** Row from the `post_dispatch_plan_others` collection. */
export interface PostDispatchOtherRow {
  id?: number;
  post_dispatch_plan_id: number;
  remarks: string;
  distance?: number;
  sequence: number;
  status: string;
}

/** Row from the `post_dispatch_purchases` collection. */
export interface PostDispatchPurchaseRow {
  id?: number;
  post_dispatch_plan_id: number;
  po_id: number;
  distance?: number;
  sequence: number;
  status: string;
}

/** Row from the `cluster` collection. */
export interface ClusterRow {
  id: number;
  cluster_name: string;
}

/** Row from the `dispatch_plan_details` collection. */
export interface DispatchPlanDetailRow {
  detail_id: number;
  dispatch_id: number;
  sales_order_id: number;
}

/** Row from the `customer` collection. */
export interface CustomerRow {
  customer_code: string;
  customer_name: string;
  store_name: string;
  city: string;
}

// ─── Enriched / Composed Return Shapes ──────────────────────

/** Enriched approved PDP for the sidebar picker. */
export interface EnrichedApprovedPlan extends RawDispatchPlan {
  cluster_name: string;
  total_items: number;
}

/** Enriched detail row returned by `fetchPlanDetails`. */
export interface EnrichedPlanDetail {
  detail_id: number | string | undefined;
  sales_order_id?: number;
  invoice_id?: number;
  order_no?: string;
  order_status?: string;
  true_order_status?: string;
  customer_name?: string;
  city?: string;
  amount: number;
  isManualStop?: boolean;
  remarks?: string;
  distance?: number;
  sequence?: number;
  status?: string;
  isPoStop?: boolean;
  po_id?: number;
  po_no?: string;
}

/** Shape of the payload sent to Directus to create a plan header. */
export interface PlanHeaderPayload {
  doc_no: string;
  dispatch_id: number;
  driver_id: number;
  vehicle_id: number;
  starting_point: number;
  status: string;
  amount?: number;
  /** Falls back to driver_id when the caller does not supply an encoder. */
  encoder_id: number;
  estimated_time_of_dispatch: string;
  estimated_time_of_arrival: string;
  remarks?: string;
}

/** Shape of the PATCH header payload for updating a plan. */
export interface UpdateHeaderPayload {
  dispatch_id?: number;
  driver_id: number;
  vehicle_id: number;
  starting_point: number;
  estimated_time_of_dispatch: string;
  estimated_time_of_arrival: string;
  remarks?: string;
  amount?: number;
  encoder_id: number;
}

/** Post-dispatch plan details enriched with staff and junction data. */
export interface PostDispatchPlanDetails {
  [key: string]: unknown;
  id: number;
  doc_no: string;
  dispatch_id: number;
  driver_id: number;
  vehicle_id: number;
  starting_point: number;
  status: string;
  amount?: number;
  encoder_id?: number;
  estimated_time_of_dispatch: string;
  estimated_time_of_arrival: string;
  remarks?: string;
  dispatch_ids?: number[];
  helpers: { user_id: number }[];
}

// ─── Generic Directus Response Wrapper ──────────────────────

/** Standard Directus collection response shape. */
export interface DirectusResponse<T> {
  data: T[];
  meta?: any;
}

/** Directus single-item response shape. */
export interface DirectusSingleResponse<T> {
  data: T;
}
