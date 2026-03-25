export interface PostDispatchPlan {
  id: number;
  doc_no: string;
  driver_id: number;
  vehicle_id: number;
  encoder_id: number;
  starting_point: number;
  total_distance: number;
  status: string;
  amount: number;
  estimated_time_of_dispatch: string;
  estimated_time_of_arrival: string;
  time_of_dispatch: string;
  time_of_arrival: string;
  date_encoded: string;
  remarks: string | null;
}

export interface PostDispatchPlanStaff {
  id: number;
  post_dispatch_plan_id: number;
  user_id: number;
  role: string;
  is_present: number;
}

export interface User {
  user_id: number;
  user_email: string;
  user_fname: string;
  user_mname: string;
  user_lname: string;
  user_image: string | null;
  role: string;
}

export interface Vehicle {
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_type: number;
  name: string | null;
}

export interface PostDispatchBudgeting {
  id: number;
  post_dispatch_plan_id: number;
  coa_id: number;
  remarks: string;
  amount: number;
}

export interface PostDispatchInvoice {
  id: number;
  post_dispatch_plan_id: number | null;
  invoice_id: number;
  distance: number | null;
  status: string;
  sequence: number | null;
  invoiceAt: number;
  isCleared: number | null;
}

export interface SalesInvoice {
  invoice_id: number;
  order_id: string;
  customer_code: string;
  invoice_no: string;
  invoice_date: string;
  total_amount: number;
  payment_status: string;
}

// UI Models
export interface DispatchRow {
  id: number;
  dispatchNo: string;
  driverName: string;
  vehiclePlate: string;
  etod: string;
  etoa: string;
  tripValue: number;
  budget: number;
  status: string;
  invoices: ReconciliationRow[];
}

export interface ReconciliationRow {
  id: number;
  invoiceId: number;
  status: 'Fulfilled' | 'Unfulfilled' | 'Fulfilled with Concerns' | 'Fulfilled with Returns';
  orderNo: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  amount: number;
  remarks?: string;
  missingQtys?: Record<string | number, number>;
  scannedQtys?: Record<string | number, number>;
  scannedRFIDs?: Record<string | number, string[]>;
}

export interface InvoiceLine {
  id: string | number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  qty: number;
  missing_qty?: number;
  price: number;
  net_total: number;
}

export interface InvoiceDetail {
  header: {
    invoice_no: string;
    invoice_date: string;
    customer_name: string;
    status: string;
  };
  lines: InvoiceLine[];
}

export interface RFIDMapping {
  id: number;
  product_id: number;
  dispatch_id: number;
  rfid: string;
}
