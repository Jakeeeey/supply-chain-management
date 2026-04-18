// ─── Stock Transfer Module — TypeScript Interfaces ──────────
// All shared types for the stock-transfer feature module.
// No Zod here — see stock-transfer.schema.ts for validation schemas.

// ─── Master-Data Row Shapes ─────────────────────────────────

/** Row from the `branches` collection. */
export interface BranchRow {
  id: number;
  branch_name?: string;
  name?: string;
}

/** Resolved unit-of-measurement object from Directus relational expansion. */
export interface UnitOfMeasurement {
  unit_id: number;
  unit_name: string;
}

/** Resolved brand object from Directus relational expansion. */
export interface ProductBrand {
  brand_id: number;
  brand_name: string;
}

/** Resolved category object from Directus relational expansion. */
export interface ProductCategory {
  category_id: number;
  category_name: string;
}

/** Resolved supplier shortcut from Directus nested junction expansion. */
export interface SupplierShortcut {
  supplier_shortcut: string;
}

/** Supplier junction row from `product_per_supplier`. */
export interface ProductPerSupplier {
  supplier_id: SupplierShortcut;
}

/** Product row from the `products` collection with relational fields expanded. */
export interface ProductRow {
  product_id: number;
  product_name: string;
  description?: string;
  barcode?: string;
  product_code?: string;
  cost_per_unit?: number;
  price_per_unit?: number;
  unit_of_measurement: UnitOfMeasurement | number;
  unit_of_measurement_count?: number;
  product_brand?: ProductBrand | number;
  product_category?: ProductCategory | number;
  product_per_supplier?: ProductPerSupplier[];
}

// ─── Stock Transfer Row Shapes ──────────────────────────────

/** Raw row from the `stock_transfer` collection (Directus). */
export interface StockTransferRow {
  id: number;
  order_no: string;
  product_id: ProductRow | number;
  source_branch: number | null;
  target_branch: number | null;
  lead_date: string | null;
  ordered_quantity: number;
  received_quantity: number;
  allocated_quantity?: number;
  scanned_quantity?: number;
  amount: number;
  status: string;
  remarks: string | null;
  date_requested: string;
  date_encoded: string;
  date_received: string | null;
  encoder_id: number;
  receiver_id: number | null;
  /** Attached by the GET handler after fetching dispatched RFIDs. */
  dispatched_rfids?: string[];
}

/** Row from the `stock_transfer_rfid` tracking collection. */
export interface StockTransferRfidRow {
  id?: number;
  stock_transfer_id: number;
  rfid_tag: string;
  scan_type: "DISPATCH" | "RECEIVE";
}

// ─── Scanned / Manual Item (Client-Side) ────────────────────

/** A product scanned via RFID or manually added in the Request form. */
export interface ScannedItem {
  rfid: string;
  productId: number;
  productName: string;
  description: string;
  brandName: string;
  unit: string;
  unitId?: number;
  qtyAvailable: number;
  unitQty: number;
  unitPrice: number;
  totalAmount: number;
}

// ─── Order Grouping ────────────────────────────────────────

/**
 * Items within an OrderGroup, extending the raw StockTransferRow
 * with client-side enrichment fields added by dispatching/receive hooks.
 */
export interface OrderGroupItem extends StockTransferRow {
  /** Number of RFID scans recorded during dispatch picking. */
  scannedQty?: number;
  /** Number of items received at the target branch. */
  receivedQty?: number;
  /** RFID tags scanned/received for this item during pick/receipt. */
  scannedRfids: string[];
  receivedRfids: string[];
  /** Available qty at source branch (fetched from inventory). */
  qtyAvailable?: number;
  /** Whether this item is a loose-pack variant. */
  isLoosePack?: boolean;
}

/**
 * A group of stock transfer line items sharing the same `order_no`.
 * Used by all downstream modules (approval, dispatching, receive).
 */
export interface OrderGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  dateEncoded: string;
  items: OrderGroupItem[];
  totalAmount: number;
  status: string;
}

// ─── API Response Shapes ────────────────────────────────────

/** Standard Directus collection response wrapper. */
export interface DirectusResponse<T> {
  data: T[];
  meta?: {
    total_count?: number;
    filter_count?: number;
  };
}

/** Directus single-item response wrapper. */
export interface DirectusSingleResponse<T> {
  data: T;
}

/** Response from the stock transfer GET handler (default action). */
export interface StockTransferListResponse {
  stockTransfers: StockTransferRow[];
  branches: BranchRow[];
}

/** Response from the RFID lookup action. */
export interface RfidLookupResponse {
  rfid: string;
  productId: number;
  productName: string;
  barcode: string;
  unitPrice: number;
  branchId?: string;
  qtyAvailable: number;
}

/** Response from the products action. */
export interface ProductListResponse {
  data: EnrichedProduct[];
}

/** Product enriched with resolved relations and available quantity. */
export interface EnrichedProduct extends ProductRow {
  qtyAvailable: number;
}

// ─── API Request Payloads ───────────────────────────────────

/** Single scanned item in the POST request body. */
export interface CreateTransferItem {
  rfid: string;
  productId: number;
  unitQty: number;
  unitPrice: number;
  totalAmount: number;
}

/** POST request body for creating a stock transfer. */
export interface CreateTransferPayload {
  sourceBranch: string;
  targetBranch: string;
  leadDate: string;
  scannedItems: CreateTransferItem[];
}

/** Single item in the PATCH request body (modern format). */
export interface UpdateTransferItem {
  id: number;
  status: string;
  allocated_quantity?: number;
}

/** RFID tracking entry in the PATCH request body. */
export interface RfidTrackingEntry {
  stock_transfer_id: number;
  rfid_tag: string;
}

/** PATCH request body for updating stock transfer statuses. */
export interface UpdateTransferPayload {
  /** Modern format: individual items with per-item status/quantity. */
  items?: UpdateTransferItem[];
  /** Legacy format: batch IDs with a single status. */
  ids?: number[];
  /** Status for legacy format. */
  status?: string;
  /** RFID tags to record in tracking table. */
  rfids?: RfidTrackingEntry[];
  /** Scan type for RFID tracking ('DISPATCH' or 'RECEIVE'). */
  scanType?: "DISPATCH" | "RECEIVE";
}

/** Directus payload for batch-inserting a stock_transfer row. */
export interface StockTransferInsertPayload {
  order_no: string;
  source_branch: number | null;
  target_branch: number | null;
  lead_date: string | null;
  product_id: number;
  ordered_quantity: number;
  received_quantity: number;
  amount: number;
  status: string;
  remarks: string;
  date_requested: string;
  date_encoded: string;
}

// ─── Valid Statuses ─────────────────────────────────────────

/** All valid statuses in the stock transfer lifecycle. */
export type StockTransferStatus =
  | "Requested"
  | "For Picking"
  | "Picking"
  | "Picked"
  | "For Loading"
  | "Received"
  | "Rejected";

/** All valid RFID scan types. */
export type RfidScanType = "DISPATCH" | "RECEIVE";
