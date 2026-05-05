// src/modules/sales-return-summary/type.ts

export interface SummaryFilters {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  status?: string; // Pending/Received/All
  customerCode?: string;
  salesmanId?: string | number;

  // optional item-based filters
  supplierName?: string;
  returnCategory?: string;
}

export interface SummaryCustomerOption {
  value: string;
  label: string;
  store?: string;
}

export interface SummarySalesmanOption {
  value: string;
  label: string;
  code?: string;
  branch?: string;
}

export interface SummarySupplierOption {
  id: string | number;
  name: string;
}

export interface API_SalesReturnType {
  type_id: number | string;
  type_name: string;
}

export interface SummaryReturnItem {
  detailId: string | number;
  returnNo: string;
  invoiceNo?: string;
  productCode: string;
  productName: string;
  brandName: string;

  // 🟢 NEW: Added fields for the new table columns
  productCategory: string; // For "Category A" column
  unit: string; // For "Unit" column

  supplierName: string; // "A, B, C" (group_concat style)
  returnCategory: string; // type_name
  specificReason: string;

  quantity: number;
  unitPrice: number;
  grossAmount: number; // Now strictly Qty * Price
  discountAmount: number; // From DB
  discountApplied: string; // Now handles "Custom/Other" logic
  netAmount: number; // Now strictly Gross - Discount
}

export interface SummaryReturnHeader {
  returnId: number | string;
  returnNumber: string;
  returnDate: string;
  returnStatus: string;

  customerName: string;
  storeName: string;
  salesmanName: string;

  invoiceNo: string;
  netTotal: number;
  remarks: string;

  items: SummaryReturnItem[];
}

export interface SummaryResult {
  data: SummaryReturnHeader[];
  total: number;
}
// ... existing interfaces

export interface SummaryMetricsData {
  totalReturns: number;
  grossAmount: number;
  totalDiscount: number;
  netAmount: number;
  pendingInventory: number;
  receivedInventory: number;
}
