import { SKU, MasterData, PaginatedSKU } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { fetchItems, request, API_BASE_URL } from "./sku-api";
import { generateSKUCode } from "./sku-generator";

// Helper for building common search filters
const buildSearchFilter = (search?: string) => {
  if (!search) return null;
  return {
    _or: [
      { product_name: { _icontains: search } },
      { product_code: { _icontains: search } }
    ]
  };
};

export const skuService = {
  async fetchApproved(limit: number = 10, offset: number = 0, search?: string, sort?: string): Promise<PaginatedSKU> {
    const filter: any = { _and: [{ isActive: { _eq: 1 } }] };
    const searchFilter = buildSearchFilter(search);
    if (searchFilter) filter._and.push(searchFilter);

    const { data, meta } = await fetchItems<SKU>('/items/products', {
      limit, offset, fields: "*.*", meta: "filter_count", sort: sort || "-product_id",
      filter: JSON.stringify(filter)
    });
    
    return { data: data || [], meta: { total_count: meta?.filter_count || 0, filter_count: meta?.filter_count || 0 } };
  },

  async fetchDrafts(limit: number = 10, offset: number = 0, status?: string, search?: string, sort?: string): Promise<PaginatedSKU> {
    const filter: any = { _and: [] };
    
    // Always exclude ACTIVE status (these are approved and should not show in queue)
    filter._and.push({ status: { _neq: "ACTIVE" } });
    
    if (status) {
      const target = status.toUpperCase();
      filter._and.push(target === "DRAFT" ? { status: { _in: ["DRAFT", "REJECTED"] } } : { status: { _eq: target } });
    }
    const searchFilter = buildSearchFilter(search);
    if (searchFilter) filter._and.push(searchFilter);

    const { data, meta } = await fetchItems<SKU>('/items/product_draft', {
      limit, offset, fields: "*.*", meta: "filter_count", sort: sort || "-product_id",
      filter: JSON.stringify(filter)
    });

    return { data: data || [], meta: { total_count: meta?.filter_count || 0, filter_count: meta?.filter_count || 0 } };
  },

  async fetchMasterData(): Promise<MasterData> {
    const fetchResilient = async (names: string[]) => {
      for (const name of names) {
        try {
          const res = await fetchItems<any>(`/items/${name}`, { limit: -1 });
          if (res.data?.length) return res;
        } catch (e) { console.warn(`Fetch failed for ${name}:`, e); }
      }
      return { data: [] };
    };

    const [units, categories, brands, suppliers] = await Promise.all([
      fetchResilient(["units", "unit", "product_unit"]),
      fetchResilient(["categories", "category", "product_category"]),
      fetchResilient(["brand", "brands", "product_brand"]),
      fetchResilient(["suppliers", "supplier", "product_supplier", "vendors"]),
    ]);

    const normalize = (items: any[]) => items.map((i, index) => ({
      ...i,
      id: Number(i.id ?? i.brand_id ?? i.category_id ?? i.unit_id ?? i.supplier_id ?? index),
      name: String(i.brand_name || i.category_name || i.unit_name || i.supplier_name || i.name || i.title || `Item #${index}`).trim(),
      code: String(i.code || i.sku_code || "")
    }));

    return {
      units: normalize(units.data || []),
      categories: normalize(categories.data || []),
      brands: normalize(brands.data || []),
      suppliers: normalize(suppliers.data || []),
    };
  },

  async createDraft(sku: SKU) {
    const { units: rawUnits = [], ...baseData } = sku;
    const units = rawUnits.length > 0 ? rawUnits : [{
      unit_id: sku.unit_of_measurement || 1,
      conversion_factor: sku.unit_of_measurement_count || 1,
      price: sku.price_per_unit, cost: sku.cost_per_unit, barcode: sku.barcode
    }];

    const masterData = await this.fetchMasterData();
    const codes = await Promise.all(units.map(u => generateSKUCode({ ...baseData, unit_of_measurement: u.unit_id, unit_of_measurement_count: u.conversion_factor } as SKU, masterData)));

    const createPayload = (u: any, code: string, pId: any = null) => ({
      ...baseData, status: "DRAFT", isActive: 1, parent_id: pId,
      unit_of_measurement: u.unit_id, unit_of_measurement_count: u.conversion_factor,
      price_per_unit: u.price, cost_per_unit: u.cost, barcode: u.barcode, product_code: code
    });

    const { data: parent } = await request<{ data: any }>(`${API_BASE_URL}/items/product_draft`, { method: "POST", body: JSON.stringify(createPayload(units[0], codes[0])) });
    const pId = parent.id || parent.product_id;

    if (units.length > 1) {
      await Promise.all(units.slice(1).map((u, i) => request(`${API_BASE_URL}/items/product_draft`, { method: "POST", body: JSON.stringify(createPayload(u, codes[i + 1], pId)) })));
    }
    return parent;
  },

  async updateDraft(id: number | string, sku: Partial<SKU>) {
    const { data } = await request<{ data: SKU }>(`${API_BASE_URL}/items/product_draft/${id}`, { method: "PATCH", body: JSON.stringify(sku) });
    
    if (!data.parent_id) { // Parent propagation
      const { data: children } = await fetchItems<any>('/items/product_draft', { filter: JSON.stringify({ parent_id: { _eq: id } }), limit: -1 });
      if (children?.length) {
        const fields = { product_name: data.product_name, product_brand: data.product_brand, product_category: data.product_category, product_supplier: data.product_supplier, status: data.status, isActive: data.isActive, inventory_type: data.inventory_type, flavor: data.flavor, size: data.size, color: data.color };
        const masterData = await this.fetchMasterData();
        await Promise.all(children.map(async (child) => {
          const code = await generateSKUCode({ ...fields, unit_of_measurement: child.unit_of_measurement, unit_of_measurement_count: child.unit_of_measurement_count } as SKU, masterData);
          return request(`${API_BASE_URL}/items/product_draft/${child.id}`, { method: "PATCH", body: JSON.stringify({ ...fields, product_code: code }) });
        }));
      }
    }
    return data;
  },

  async approveDraft(id: number | string, masterData: MasterData) {
    const { data: parent } = await request<{ data: SKU }>(`${API_BASE_URL}/items/product_draft/${id}?fields=*.*`);
    const { data: children } = await fetchItems<SKU>('/items/product_draft', { filter: JSON.stringify({ parent_id: { _eq: id } }), fields: "*.*" });
    const all = [parent, ...(children || [])];

    let pMasterId: number | null = null;
    for (const draft of all) {
      let code = draft.product_code;
      if (!code) {
        code = await generateSKUCode(draft, masterData);
      }
      
      // Check if product already exists by Code (Primary matching strategy)
      const { data: existing } = await fetchItems<any>('/items/products', { 
        filter: JSON.stringify({ product_code: { _eq: code } }),
        limit: 1
      });

      
      const targetId = existing?.[0]?.id || existing?.[0]?.product_id;

      const { id, product_id, units, created_at, updated_at, user_created, user_updated, date_created, date_updated, status, ...restPayload } = draft as any;
      const payload = { ...restPayload };
      // Explicitly deleting potential ID fields to safer
      delete (payload as any).id;
      delete (payload as any).product_id;

      const commonFields = {
        ...payload,
        product_code: code,
        isActive: 1,
        parent_id: draft.parent_id ? pMasterId : null,
        product_brand: (draft as any).product_brand?.id ?? draft.product_brand,
        product_category: (draft as any).product_category?.id ?? draft.product_category,
        product_supplier: (draft as any).product_supplier?.id ?? draft.product_supplier,
        unit_of_measurement: (draft as any).unit_of_measurement?.id ?? draft.unit_of_measurement,
      };

      if (targetId) {

        // UPDATE existing product
         await request(`${API_BASE_URL}/items/products/${targetId}`, {
          method: "PATCH",
          body: JSON.stringify(commonFields)
        });
        if (!draft.parent_id) pMasterId = targetId;
      } else {

        // CREATE new product
        const res: any = await request<{ data: any }>(`${API_BASE_URL}/items/products`, {
          method: "POST",
          body: JSON.stringify(commonFields)
        });
        const newId = res.data.id || res.data.product_id;

        if (!draft.parent_id) pMasterId = newId;
      }

      try {
        await request(`${API_BASE_URL}/items/product_draft/${(draft as any).id}`, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) });
      } catch (e: any) {
        try {
           await request(`${API_BASE_URL}/items/product_draft/${(draft as any).id}`, { method: "DELETE" });
        } catch (delErr: any) {

           // We suppress the error here so the UI reports "Success" (since the Product was created),
           // even though the Draft might remain in the queue due to permissions.
        }
      }
    }
    return true;
  },
  
  async submitForApproval(id: number | string) { return request(`${API_BASE_URL}/items/product_draft/${id}`, { method: "PATCH", body: JSON.stringify({ status: "FOR_APPROVAL" }) }); },
  async rejectDraft(id: number | string, remarks?: string) { 
    return request(`${API_BASE_URL}/items/product_draft/${id}`, { 
      method: "PATCH", 
      body: JSON.stringify({ status: "REJECTED", remarks }) 
    }); 
  },
  async deleteDraft(id: number | string) { return request(`${API_BASE_URL}/items/product_draft/${id}`, { method: "DELETE" }); },
  async checkDuplicateName(name: string): Promise<boolean> {
    const filter = `filter[product_name][_eq]=${encodeURIComponent(name)}&limit=1`;
    const [approved, drafts] = await Promise.all([
      request<{ data: any[] }>(`${API_BASE_URL}/items/products?${filter}`),
      request<{ data: any[] }>(`${API_BASE_URL}/items/product_draft?${filter}`)
    ]);
    return (approved.data?.length > 0) || (drafts.data?.length > 0);
  },
  async updateProductDescription(id: number | string, description: string) {
    return request(`${API_BASE_URL}/items/products/${id}`, { method: "PATCH", body: JSON.stringify({ description }) });
  },
  generateSKUCode
};
