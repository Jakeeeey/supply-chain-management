export interface SummaryFilters {
  search: string;
  branchId?: number;
  supplierId?: number;
  type?: "IN" | "OUT";
  status?: "Posted" | "Unposted";
  fromDate?: string;
  toDate?: string;
}

export interface SummaryKPIs {
  totalAdjustments: number;
  postedCount: number;
  unpostedCount: number;
  postingRate: number;
  totalStockInValue: number;
  totalStockOutValue: number;
  netImpact: number;
  grossValue: number;
  totalItemsCount: number;
}

export interface TrendItem {
  dateStr: string;
  inValue: number;
  outValue: number;
  count: number;
}

export interface BranchItem {
  name: string;
  inValue: number;
  outValue: number;
  total: number;
  count: number;
}

export interface ProductItem {
  name: string;
  code: string;
  quantity: number;
  value: number;
}

export interface SupplierItem {
  name: string;
  value: number;
  count: number;
}

export interface BranchLookup {
  id: number;
  branch_name: string;
  branch_code: string;
}

export interface SupplierLookup {
  id: number;
  supplier_name: string;
  supplier_shortcut?: string;
}
