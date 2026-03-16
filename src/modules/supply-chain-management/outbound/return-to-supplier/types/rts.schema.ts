// =============================================================================
// Return-to-Supplier — Data Contracts (Zod Schemas & TypeScript Interfaces)
// =============================================================================
import { z } from "zod";

// =============================================================================
// 1. ZOD SCHEMAS — Runtime validation for user-submitted payloads
// =============================================================================

/** Schema for a single return item when creating/updating a transaction. */
export const createReturnItemSchema = z.object({
  product_id: z.number({ error: "Product ID is required" }),
  uom_id: z.number({ error: "UOM ID is required" }),
  quantity: z.number().positive("Quantity must be greater than 0"),
  gross_unit_price: z.number().min(0),
  gross_amount: z.number().min(0),
  discount_rate: z.number().min(0).max(100),
  discount_amount: z.number().min(0),
  net_amount: z.number().min(0),
  item_remarks: z.string().default(""),
  return_type_id: z.number().nullable().optional(),
  rfid_tag: z.string().optional(),
});

/** Schema for the full create/update transaction payload. */
export const createReturnSchema = z.object({
  supplier_id: z.number({ error: "Supplier is required" }),
  branch_id: z.number({ error: "Branch is required" }),
  transaction_date: z.string().min(1, "Transaction date is required"),
  remarks: z.string().default(""),
  is_posted: z.number().min(0).max(1).default(0),
  rts_items: z
    .array(createReturnItemSchema)
    .min(1, "At least one item is required"),
});

/** Zod-inferred types for validated payloads. */
export type CreateReturnItemDTO = z.infer<typeof createReturnItemSchema>;
export type CreateReturnDTO = z.infer<typeof createReturnSchema>;

// =============================================================================
// 2. DIRECTUS API RESPONSE INTERFACES — Shapes of raw inbound data
// =============================================================================

/** Raw Directus response for a return_to_supplier parent record. */
export interface API_ReturnToSupplier {
  id: number;
  doc_no: string;
  supplier_id: number | { id: number; supplier_name: string };
  branch_id: number | { id: number; branch_name: string };
  transaction_date: string;
  total_net_amount: string;
  remarks: string;
  is_posted: number;
  date_created: string;
}

/** Raw Directus response for an rts_items child record. */
export interface API_RTS_Item {
  id: number;
  rts_id: number;
  product_id:
    | {
        product_id: number;
        product_name: string;
        product_code: string;
        description: string;
        unit_of_measurement_count?: number;
      }
    | number;
  uom_id: { unit_id: number; unit_shortcut: string } | number;
  quantity: string;
  gross_unit_price: string;
  gross_amount: string;
  discount_rate: string;
  discount_amount: string;
  net_amount: string;
  item_remarks: string | null;
  return_type_id?: number;
}

// =============================================================================
// 3. FRONTEND DOMAIN MODELS — Clean, mapped shapes for the UI
// =============================================================================

/** A supplier reference record. */
export interface Supplier {
  id: number;
  supplier_name: string;
  supplier_shortcut?: string;
  isActive: number;
}

/** A branch reference record. */
export interface Branch {
  id: number;
  branch_name: string;
  branch_code: string;
  isActive: number;
}

/** A product as used in the product picker / price lookup. */
export interface Product {
  id: string;
  code: string;
  name: string;
  price: number; // cost_per_unit
  unit: string;
  uom_id: number;
  unitCount: number;
  parentId: number | null; // parent_id from products table
  stock?: number;
  rawStock?: number;
  discountType?: string;
  supplierDiscount?: number;
}
/** A unit-of-measurement reference record (from Directus `units` table). */
export interface Unit {
  unit_id: number;
  unit_name: string;
  unit_shortcut: string;
  order: number;
}

/** A line discount reference record. */
export interface LineDiscount {
  id: number;
  line_discount: string;
  percentage: string;
}

/** A supplier-product connection (discount mapping). */
export interface ProductSupplier {
  id: number;
  supplier_id: number;
  product_id: number;
  discount_type?: number;
}

/** A return type (e.g., Bad Stock, Expired, Overstock). */
export interface RTSReturnType {
  id: number;
  return_type_name: string;
  return_type_code?: string;
}

/** An item in the shopping cart / return builder. */
export interface CartItem extends Product {
  quantity: number;
  onHand: number;
  discount: number;
  customPrice?: number;
  return_type_id?: number | null;
  rfid_tag?: string;
}

/** A mapped RTS parent record for the list table. */
export interface ReturnToSupplier {
  id: number;
  returnNo: string;
  supplier: string;
  branch: string;
  returnDate: string;
  status: string;
  remarks: string;
  totalAmount: number; // Net Amount
  grossAmount: number;
  discountAmount: number;
}

/** A mapped RTS item record for transaction details. */
export interface RTSItem {
  id: number;
  productId: number;
  uomId: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  unitCount: number;
  returnTypeId?: number;
  rfid_tag?: string;
}

/** A simplified return item used for print/export views. */
export interface ReturnItem {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

// =============================================================================
// 4. INVENTORY VIEW — v_running_inventory_by_unit
// =============================================================================

/** A single row from the v_running_inventory_by_unit Spring Boot view. */
export interface InventoryViewRow {
  id: string;
  productId: number;
  productCode: string;
  productName: string;
  productBarcode: string | null;
  productBrand: string;
  productCategory: string;
  unitName: string;
  unitCount: number;
  branchId: number;
  branchName: string;
  lastCutoff: string;
  lastCountUnit: number;
  movementAfterUnit: number;
  runningInventoryUnit: number;
  supplierShortcut: string;
  supplierId: number;
}

/** Display-ready inventory record after remainder cascade calculation. */
export interface InventoryRecord {
  id: string;
  product_id: number;
  product_code: string;
  product_name: string;
  unit_name: string;
  unit_count: number;
  branch_id: number;
  supplier_id: number;
  running_inventory: number; // Floored display stock
  familyId: number; // parent_id or self
  price: number; // cost_per_unit from products
}

// =============================================================================
// 5. RFID TYPES — rts_item_rfid & v_rfid_onhand (wired for future features)
// =============================================================================

/** An RFID tag linked to a specific return item line. */
export interface RtsItemRfid {
  id: number;
  rts_item_id: number;
  rfid_tag: string;
  status: "PENDING" | "SCANNED" | "RETURNED";
  created_at: string;
  created_by: number | null;
}

/** A row from the v_rfid_onhand view — an RFID tag that is currently on-hand. */
export interface RfidOnhand {
  id: number;
  product_id: number;
  branch_id: number;
  rfid: string;
}

// =============================================================================
// 6. REFERENCE DATA BUNDLE — returned by the references endpoint
// =============================================================================

/** The combined reference data returned by the references API. */
export interface ReferenceData {
  suppliers: Supplier[];
  branches: Branch[];
  products: Product[];
  units: Unit[];
  lineDiscounts: LineDiscount[];
  connections: ProductSupplier[];
  returnTypes: RTSReturnType[];
}

/** Response from the Spring Boot RFID on-hand lookup. */
export interface RfidLookupResult {
  productId: number;
}
