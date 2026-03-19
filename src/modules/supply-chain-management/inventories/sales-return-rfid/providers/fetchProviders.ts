/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// Sales Return — Client-Side Provider (Fetch Bridge)
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
  ProductSupplierConnection,
  API_LineDiscount,
  API_SalesReturnType,
} from "../type";

const API_BASE = "/api/scm/inventories/sales-return-rfid";

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
// PUBLIC API — Matching the old SalesReturnProvider interface
// =============================================================================

export const SalesReturnProvider = {
  // --- 1. MAIN LIST & FILTERING ---
  async getReturns(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    filters: { salesman?: string; customer?: string; status?: string } = {},
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

    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return { data: json.data, total: json.total };
  },

  // --- 2. DROPDOWN HELPERS (Filters) ---
  async getSalesmenList(): Promise<
    { value: string; label: string; code: string; branch: string }[]
  > {
    const refs = await this._getReferences();
    return refs.salesmen;
  },

  async getCustomersList(): Promise<{ value: string; label: string }[]> {
    const refs = await this._getReferences();
    return refs.customers;
  },

  // --- 3. FORM HELPERS (Create/Edit) ---
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

  async getInvoiceReturnList(salesmanId?: string, customerCode?: string): Promise<InvoiceOption[]> {
    const params = new URLSearchParams({ action: "invoices" });
    if (salesmanId) params.set("salesmanId", salesmanId);
    if (customerCode) params.set("customerCode", customerCode);
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    return handleResponse<InvoiceOption[]>(res);
  },

  // --- 4. PRODUCT LOOKUP HELPERS ---
  async getBrands(): Promise<Brand[]> {
    const catalog = await this._getProductCatalog();
    return catalog.brands;
  },

  async getCategories(): Promise<Category[]> {
    const catalog = await this._getProductCatalog();
    return catalog.categories;
  },

  async getSuppliers(): Promise<Supplier[]> {
    const catalog = await this._getProductCatalog();
    return catalog.suppliers;
  },

  async getUnits(): Promise<Unit[]> {
    const catalog = await this._getProductCatalog();
    return catalog.units;
  },

  async getProductSupplierConnections(): Promise<ProductSupplierConnection[]> {
    const catalog = await this._getProductCatalog();
    return catalog.connections;
  },

  async getProducts(): Promise<Product[]> {
    const catalog = await this._getProductCatalog();
    return catalog.products;
  },

  // --- 5. CRUD OPERATIONS ---
  async submitReturn(payload: any): Promise<any> {
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

  async updateStatus(id: number | string, status: string): Promise<any> {
    const params = new URLSearchParams({
      action: "status",
      id: String(id),
      status,
    });
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

  // --- INTERNAL: Cached reference fetcher ---
  _referencesCache: null as any,
  _referencesCacheTime: 0,

  async _getReferences() {
    const now = Date.now();
    // Cache references for 30 seconds to avoid redundant calls
    if (this._referencesCache && now - this._referencesCacheTime < 30000) {
      return this._referencesCache;
    }
    const res = await fetch(`${API_BASE}?action=references`, {
      cache: "no-store",
    });
    const result = await handleResponse<any>(res);
    this._referencesCache = result;
    this._referencesCacheTime = now;
    return result;
  },

  // --- INTERNAL: Cached product catalog fetcher ---
  _productCatalogCache: null as any,
  _productCatalogCacheTime: 0,

  async _getProductCatalog() {
    const now = Date.now();
    // Cache product catalog for 30 seconds
    if (
      this._productCatalogCache &&
      now - this._productCatalogCacheTime < 30000
    ) {
      return this._productCatalogCache;
    }
    const res = await fetch(`${API_BASE}?action=products`, {
      cache: "no-store",
    });
    const result = await handleResponse<any>(res);
    this._productCatalogCache = result;
    this._productCatalogCacheTime = now;
    return result;
  },

  // --- 6. RFID TAGS ---
  async getRfidTags(detailId: number): Promise<{ id: number; rfid_tag: string; created_at?: string }[]> {
    const params = new URLSearchParams({ action: "rfidTags", detailId: String(detailId) });
    const res = await fetch(`${API_BASE}?${params}`, { cache: "no-store" });
    return handleResponse<{ id: number; rfid_tag: string; created_at?: string }[]>(res);
  },
};

// Re-export types for backward compatibility
export type { SalesmanOption, BranchOption, CustomerOption };
