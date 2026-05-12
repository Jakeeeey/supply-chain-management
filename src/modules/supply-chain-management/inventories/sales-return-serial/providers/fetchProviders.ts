/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// Sales Return — Client-Side Provider (Fetch Bridge) - Serial Implementation
// Calls local API routes instead of Directus directly.
// =============================================================================
import type {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatusCard,
  SalesmanOption,
  CustomerOption,
  BranchOption,
  InvoiceOption,
  Brand,
  Category,
  Supplier,
  Unit,
  Product,
  ProductCatalog,
  API_LineDiscount,
  API_SalesReturnType,
  PriceTypeOption,
} from "../types/sales-return.types";

const API_BASE = "/api/scm/inventories/sales-return-serial";

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const errMsg = json.error || json.message || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return json.data as T;
}

// =============================================================================
// PUBLIC API
// =============================================================================

export const SalesReturnProvider = {
  // --- 1. MAIN LIST & FILTERING ---
  async getReturns(
    page: number = 1,
    limit: number = 10,
    filters: { salesman?: string; customer?: string; status?: string; invoiceNo?: string } = {},
  ): Promise<{ data: SalesReturn[]; total: number }> {
    const params = new URLSearchParams({
      action: "list",
      page: String(page),
      limit: String(limit),
    });

    if (filters.salesman && filters.salesman !== "All")
      params.set("salesman", filters.salesman);
    if (filters.customer && filters.customer !== "All")
      params.set("customer", filters.customer);
    if (filters.status && filters.status !== "All")
      params.set("status", filters.status);
    if (filters.invoiceNo)
      params.set("invoiceNo", filters.invoiceNo);

    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return { data: json.data, total: json.total };
  },

  // --- 2. DROPDOWN HELPERS ---
  async getSalesmenList(): Promise<
    { value: string; label: string; code: string; branch: string; branchId: number }[]
  > {
    const refs = await this._getReferences();
    return refs.salesmen;
  },

  async getCustomersList(): Promise<{ value: string; label: string }[]> {
    const refs = await this._getReferences();
    return refs.customers;
  },

  async getFormSalesmen(): Promise<SalesmanOption[]> {
    const refs = await this._getReferences();
    return refs.formSalesmen;
  },

  async getFormCustomers(): Promise<CustomerOption[]> {
    const refs = await this._getReferences();
    return refs.formCustomers;
  },

  async getFormBranches(): Promise<BranchOption[]> {
    const refs = await this._getReferences();
    return refs.branches;
  },

  async getLineDiscounts(): Promise<API_LineDiscount[]> {
    const refs = await this._getReferences();
    return refs.lineDiscounts;
  },

  async getSalesReturnTypes(): Promise<API_SalesReturnType[]> {
    const refs = await this._getReferences();
    return refs.returnTypes;
  },

  async getPriceTypes(): Promise<PriceTypeOption[]> {
    const refs = await this._getReferences();
    return refs.priceTypes || [];
  },

  async getInvoiceReturnList(salesmanId?: string, customerCode?: string): Promise<InvoiceOption[]> {
    const params = new URLSearchParams({ action: "invoices" });
    if (salesmanId) params.set("salesmanId", salesmanId);
    if (customerCode) params.set("customerCode", customerCode);
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    return handleResponse<InvoiceOption[]>(res);
  },

  // --- 3. PRODUCT CATALOG ---
  async getFullCatalog(customerCode?: string): Promise<ProductCatalog> {
    return this._getProductCatalog(customerCode);
  },

  // --- 4. CRUD ---
  async submitReturn(payload: Record<string, any>): Promise<any> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateReturn(payload: {
    returnId: number;
    returnNo: string;
    items: any[];
    remarks: string;
    invoiceNo?: string;
    orderNo?: string;
    appliedInvoiceId?: number;
    isThirdParty?: boolean;
  }): Promise<any> {
    const res = await fetch(API_BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateStatus(
    id: number | string,
    status: string,
    isReceived?: boolean,
    receivedAt?: string,
  ): Promise<any> {
    const params = new URLSearchParams({
      action: "status",
      id: String(id),
      status,
    });
    if (isReceived !== undefined) params.set("isReceived", String(isReceived));
    if (receivedAt) params.set("receivedAt", receivedAt);

    const res = await fetch(`${API_BASE}?${params}`, { method: "PATCH" });
    return handleResponse(res);
  },

  async getProductsSummary(
    id: string | number,
    returnString?: string,
  ): Promise<SalesReturnItem[]> {
    if (!returnString) return [];
    const params = new URLSearchParams({
      action: "details",
      id: String(id),
      returnNo: returnString,
    });
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    return handleResponse<SalesReturnItem[]>(res);
  },

  async getStatusCardData(
    returnId: number,
  ): Promise<SalesReturnStatusCard | null> {
    const params = new URLSearchParams({
      action: "statusCard",
      id: String(returnId),
    });
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) return null;
    return json.data;
  },

  // --- 5. SERIAL VALIDATION ---
  async checkSerialDuplicate(serial: string): Promise<{ isDuplicate: boolean; returnNo?: string }> {
    const params = new URLSearchParams({ action: "check-serial-duplicate", serial });
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    return handleResponse<{ isDuplicate: boolean; returnNo?: string }>(res);
  },

  async checkSerialOnHand(
    serial: string,
    branchId: number,
  ): Promise<{ isOnInventory: boolean; branchId?: number; branchName?: string }> {
    const params = new URLSearchParams({
      action: "check-serial-onhand",
      serial,
      branchId: String(branchId),
    });
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    return handleResponse<{ isOnInventory: boolean; branchId?: number; branchName?: string }>(res);
  },

  // --- INTERNAL CACHES ---
  _referencesCache: null as any,
  _referencesCacheTime: 0,

  async _getReferences() {
    const now = Date.now();
    if (this._referencesCache && now - this._referencesCacheTime < 30000) return this._referencesCache;
    const res = await fetch(`${API_BASE}?action=references`, { cache: "no-store" });
    const result = await handleResponse<any>(res);
    this._referencesCache = result;
    this._referencesCacheTime = now;
    return result;
  },

  _productCatalogCache: {} as Record<string, ProductCatalog>,
  _productCatalogCacheTime: {} as Record<string, number>,

  async _getProductCatalog(customerCode?: string): Promise<ProductCatalog> {
    const now = Date.now();
    const cacheKey = customerCode || "default";
    if (this._productCatalogCache[cacheKey] && now - (this._productCatalogCacheTime[cacheKey] || 0) < 30000) return this._productCatalogCache[cacheKey];
    const params = new URLSearchParams({ action: "products" });
    if (customerCode) params.set("customerCode", customerCode);
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    const result = await handleResponse<any>(res);
    this._productCatalogCache[cacheKey] = result;
    this._productCatalogCacheTime[cacheKey] = now;
    return result;
  },
};

export type { SalesmanOption, BranchOption, CustomerOption, Product, ProductCatalog };
