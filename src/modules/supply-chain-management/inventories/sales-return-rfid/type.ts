// src/modules/sales-returnv3/type.ts

// --- RETURN TYPES ---
export type ReturnType = "Good Order" | "Bad Order" | "Expired" | string;
export type ReturnStatus = "Pending" | "Approved" | "Rejected" | "Received";

export interface SalesReturnItem {
  id?: number | string; // Use string for temp IDs, number for DB IDs
  tempId?: string; // For frontend-only tracking
  productId: number;
  product_id?: number; // DB compatibility
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountType: string | number | null;
  discountAmount: number;
  totalAmount: number;
  reason?: string;
  returnType?: string;
  rfidTags?: string[];
  // 🟢 Fields for Price Type Recalculation
  priceA?: number;
  priceB?: number;
  priceC?: number;
  priceD?: number;
  priceE?: number;
  unitMultiplier?: number;
}

export interface SalesReturn {
  id: number;
  returnNo: string;
  invoiceNo: string;
  customerCode: string;
  customerName?: string; // Existing
  salesmanId: number;
  salesmanName?: string; // 🟢 NEW: Add this field
  returnDate: string;
  totalAmount: number;
  status: string;
  remarks: string;
  orderNo?: string;
  isThirdParty?: boolean;
  priceType?: string;
  createdDate?: string;
  createdAt?: string;
}

// --- BASIC ENTITIES ---
export interface Brand {
  brand_id: number;
  brand_name: string;
}
export interface Category {
  category_id: number;
  category_name: string;
}
export interface Supplier {
  id: number;
  supplier_name: string;
}

export interface Unit {
  unit_id: number;
  unit_name: string;
  unit_shortcut: string;
  order: number;
}

// src/modules/sales-returnv3/type.ts

// ... existing imports ...

export interface Product {
  product_id: number;
  isActive: number;
  product_name: string;
  barcode: string | null;
  product_code: string | null;
  product_image: string | null;
  description: string;
  product_brand: number;
  product_category: number;

  // Critical for Unit Logic
  unit_of_measurement: number;
  unit_of_measurement_count: number;

  // Price fields from products table (A through E)
  priceA: number;
  priceB?: number;
  priceC?: number;
  priceD?: number;
  priceE?: number;
}

// ... rest of the file ...

export interface ProductSupplierConnection {
  id: number;
  supplier_id: number;
  product_id: number;
}

// --- API LOOKUPS ---
export interface API_LineDiscount {
  id: number;
  discount_type: string;
  total_percent: string;
}

export interface API_SalesReturnType {
  type_id: number;
  type_name: string;
  description: string;
}

// --- PRICE TYPE OPTIONS (from price_types table) ---
export interface PriceTypeOption {
  price_type_id: number;
  price_type_name: string;
  sort?: number;
}

export interface API_SalesReturnDetail {
  detail_id: number;
  return_no: string;
  product_id: number;
  quantity: number;
  unit_price: string;
  gross_amount: string;
  discount_type: number;
  discount_amount: string;
  total_amount: string;
  reason: string | null;
  sales_return_type_id: number;
}

// --- FORM OPTIONS ---
export interface SalesmanOption {
  id: number;
  name: string;
  code: string;
  priceType: string;
  branchId: number;
  branchName?: string;
}

// type.ts
export interface CustomerOption {
  id: number;
  name: string; // Changed from 'customer_name' to 'name'
  code?: string; // Optional: Add this if your API returns a customer code
}

// If you need the full object elsewhere, we can keep a separate type for that,
// but for the filter, we only need these two.

export interface BranchOption {
  id: number;
  name: string;
}

// --- STATUS CARD DATA ---
export interface SalesReturnStatusCard {
  returnId: number;
  isApplied: boolean;
  dateApplied: string;
  transactionStatus: string;
  isPosted: boolean;
  isReceived: boolean;
  appliedTo: string;
}

// Invoice Dropdown option (from sales_invoice table)
export interface InvoiceOption {
  id: number | string;
  invoice_no: string;
  order_id: string;
  customerCode: string;
  salesman_id: number;
  amount?: number;
}

// RFID Tag record (sales_return_rfid table)
export interface SalesReturnRfid {
  id: number;
  sales_return_detail_id: number;
  rfid_tag: string;
  created_at?: string;
  created_by?: number;
}
