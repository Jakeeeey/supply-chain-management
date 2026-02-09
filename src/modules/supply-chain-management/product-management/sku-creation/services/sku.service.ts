import { SKU, MasterData, PaginatedSKU } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const HEADERS = {
  "Content-Type": "application/json",
  ...(STATIC_TOKEN ? { Authorization: `Bearer ${STATIC_TOKEN}` } : {}),
};

export const skuService = {
  async fetchApproved(limit: number = 10, offset: number = 0): Promise<PaginatedSKU> {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    const response = await fetch(`${API_BASE_URL}/items/products?limit=${limit}&offset=${offset}&meta=total_count,filter_count`, {
      method: "GET",
      headers: HEADERS,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch approved products");
    const data = await response.json();
    return {
      data: data.data || [],
      meta: data.meta || { total_count: 0, filter_count: 0 }
    };
  },

  async fetchDrafts(limit: number = 10, offset: number = 0): Promise<PaginatedSKU> {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    const response = await fetch(`${API_BASE_URL}/items/product_draft?limit=${limit}&offset=${offset}&meta=total_count,filter_count`, {
      method: "GET",
      headers: HEADERS,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch product drafts");
    const data = await response.json();
    console.log("Drafts raw data (first item):", JSON.stringify(data.data[0] || {}, null, 2));
    return {
      data: data.data || [],
      meta: data.meta || { total_count: 0, filter_count: 0 }
    };
  },

  async fetchMasterData(): Promise<MasterData> {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    
    // Using a more resilient fetch approach for multiple tables
    const fetchTable = async (table: string) => {
      try {
        const res = await fetch(`${API_BASE_URL}/items/${table}?limit=-1`, { headers: HEADERS, cache: "no-store" });
        if (!res.ok) return { data: [] };
        return await res.json();
      } catch (e) {
        return { data: [] };
      }
    };

    const fetchResilient = async (names: string[]) => {
      for (const name of names) {
        try {
          const res = await fetchTable(name);
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            return res;
          }
        } catch (e) {
          // Continue to next name
        }
      }
      return { data: [] };
    };

    const [units, categories, brands, suppliers] = await Promise.all([
      fetchResilient(["units", "unit", "product_unit"]),
      fetchResilient(["categories", "category", "product_category"]),
      fetchResilient(["brand", "brands", "product_brand"]),
      fetchResilient(["suppliers", "supplier", "product_supplier", "vendors", "supply_chain_partners"]),
    ]);

    // Normalize IDs: ensure every item has a standard 'id' field even if DB uses 'table_id'
    const normalize = (items: any[], idField: string) => items.map(item => ({
      ...item,
      id: item.id || item[idField]
    }));

    const result = {
      units: normalize(units.data || [], "unit_id"),
      categories: normalize(categories.data || [], "category_id"),
      brands: normalize(brands.data || [], "brand_id"),
      suppliers: (suppliers.data || []).map((s: any) => ({ 
        ...s, 
        id: s.id || s.supplier_id || s.vendor_id || s.partner_id,
        name: s.name || s.supplier_name || s.company_name
      })),
    };

    console.log("Resolved Master Data - Suppliers:", JSON.stringify(result.suppliers.slice(0, 2), null, 2));
    return result;
  },

  async checkDuplicateName(name: string): Promise<boolean> {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    
    const [approved, drafts] = await Promise.all([
      fetch(`${API_BASE_URL}/items/products?filter[product_name][_eq]=${encodeURIComponent(name)}&limit=1`, { headers: HEADERS, cache: "no-store" }).then(res => res.json()),
      fetch(`${API_BASE_URL}/items/product_draft?filter[product_name][_eq]=${encodeURIComponent(name)}&limit=1`, { headers: HEADERS, cache: "no-store" }).then(res => res.json())
    ]);

    return (approved.data?.length > 0) || (drafts.data?.length > 0);
  },

  async createDraft(sku: SKU) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    
    // Check for duplicates first (Business Logic 3.2)
    const existing = await fetch(`${API_BASE_URL}/items/products?filter[product_name][_eq]=${encodeURIComponent(sku.product_name)}`, { 
      headers: HEADERS, cache: "no-store" 
    }).then(res => res.json());

    if (existing.data && existing.data.length > 0) {
      // Potentially throw a custom error or handled warning
    }

    // Auto-generate SKU code for the draft if not provided OR if it's a legacy numeric code OR double dash
    let product_code = sku.product_code;
    const isLegacyCode = product_code && (/^\d+$/.test(product_code) || product_code.includes("--"));
    
    if (!product_code || isLegacyCode) {
      try {
        const masterData = await this.fetchMasterData();
        product_code = await this.generateSKUCode(sku, masterData);
      } catch (e) {
        console.warn("Failed to auto-generate SKU code for draft:", e);
      }
    }

    console.log(`Creating Draft with SKU: ${product_code} | Supplier: ${sku.product_supplier}`);

    const response = await fetch(`${API_BASE_URL}/items/product_draft`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        ...sku,
        product_code,
        status: "Draft"
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Directus Draft Creation Error:", JSON.stringify(errorData, null, 2));
      throw new Error(errorData.errors?.[0]?.message || "Failed to create product draft");
    }
    
    const data = await response.json();
    return data.data as SKU;
  },

  async updateDraft(id: number | string, sku: Partial<SKU>) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    
    // Auto-generate SKU code if missing in the update/record OR if it's purely numeric (legacy) OR double dash
    let product_code = (sku as any).product_code;
    const isLegacyCode = product_code && (/^\d+$/.test(product_code) || product_code.includes("--"));

    if (!product_code || isLegacyCode) {
      try {
        const masterData = await this.fetchMasterData();
        // We need full SKU for generation, merge partial with master-data-informed context
        product_code = await this.generateSKUCode(sku as SKU, masterData);
      } catch (e) {
        console.warn("Failed to generate code during update:", e);
      }
    }
    console.log(`Updating Draft ${id} | SKU: ${product_code} | Supplier: ${sku.product_supplier}`);

    const response = await fetch(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({
        ...sku,
        ...(product_code ? { product_code } : {})
      }),
    });
    if (!response.ok) throw new Error("Failed to update product draft");
    const data = await response.json();
    return data.data as SKU;
  },

  async submitForApproval(id: number | string) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    const response = await fetch(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ status: "For Approval" }),
    });
    if (!response.ok) throw new Error("Failed to submit for approval");
    return true;
  },

  async generateSKUCode(sku: SKU, masterData: MasterData): Promise<string> {
    try {
      console.log(`Generating SKU for: ${sku.product_name} | CatID: ${sku.product_category} | BrandID: ${sku.product_brand}`);
      
      // Helper to extract code from item with fallback fields
      const getCode = (item: any, defaultCode: string) => {
        if (!item) return defaultCode;
        // Priority 1: Explicit Code, sanitized to Alphanumeric
        if (item.code) return item.code.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        
        // Priority 2: Name/Title Fields
        const candidates = [item.name, item.title, item.category_name, item.category, item.brand_name, item.brand, item.description];
        const name = candidates.find(c => c && typeof c === 'string' && c.trim().length > 0);
        
        if (name) return name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        return defaultCode;
      };

      // Helper to extract name for UOM
      const getName = (item: any) => {
        if (!item) return "";
        const candidates = [item.name, item.unit, item.unit_name, item.title, item.code];
        return candidates.find(c => c && typeof c === 'string') || "";
      }

      // 1. Category Abbr
      const cat = masterData.categories.find(c => (c.id == sku.product_category));
      const catCode = getCode(cat, "PROD");
      
      // 2. Brand Abbr
      const brand = masterData.brands.find(b => (b.id == sku.product_brand));
      const brandCode = getCode(brand, "GEN");

      // 3. UOM Mapping (Strictly based on User Excel)
      const uomId = sku.base_unit || sku.unit_of_measurement;
      const uom = masterData.units.find(u => u.id == uomId);
      const uomName = getName(uom).toLowerCase().trim();
      
      let uomCode = "EAC"; // Default to Each
      
      // Excel Mapping
      if (uomName === "milliliters" || uomName === "ml") uomCode = "MIL";
      else if (uomName === "liters" || uomName === "l") uomCode = "LIT";
      else if (uomName === "grams" || uomName === "g") uomCode = "GRA";
      else if (uomName === "inner box" || uomName === "ib") uomCode = "INN";
      else if (uomName === "bag") uomCode = "BAG";
      else if (uomName === "pack" || uomName === "pck") uomCode = "PAC";
      else if (uomName === "tie") uomCode = "TIE";
      else if (uomName === "jar") uomCode = "JAR";
      else if (uomName === "container" || uomName === "con") uomCode = "CON";
      else if (uomName === "box") uomCode = "BOX";
      else if (uomName === "ton") uomCode = "TON";
      else if (uomName === "case" || uomName === "cse") uomCode = "CAS";
      else if (uomName === "each" || uomName === "eac") uomCode = "EAC";
      else if (uomName === "piece" || uomName === "pcs" || uomName === "pieces") uomCode = "EAC";
      else if (uomName === "palette" || uomName === "plt") uomCode = "PAL";
      else if (uomName === "kilograms" || uomName === "kg") uomCode = "KIL";
      else if (uomName === "milligram" || uomName === "mg") uomCode = "MIL1";
      
      // Fuzzy Fallbacks
      else if (uomName.includes("box")) uomCode = "BOX";
      else if (uomName.includes("pack")) uomCode = "PAC";
      else if (uomName.includes("case")) uomCode = "CAS";
      else if (uomName.includes("kilo")) uomCode = "KIL";
      else if (uomName.includes("liter")) uomCode = "LIT";
      else if (uomName.includes("gram")) uomCode = "GRA";

      // 4. Sequence (3 digits) - Count across Approved AND Drafts
      let seq = "001";
      if (API_BASE_URL) {
        // We use limit=0 & meta=filter_count to get efficient counts from Directus
        const [resProd, resDraft] = await Promise.all([
          fetch(`${API_BASE_URL}/items/products?filter[product_category][_eq]=${sku.product_category}&filter[product_brand][_eq]=${sku.product_brand}&limit=0&meta=filter_count`, {
             headers: HEADERS, cache: "no-store" 
          }).then(res => res.json()).catch(() => ({ meta: { filter_count: 0 } })),
          
          fetch(`${API_BASE_URL}/items/product_draft?filter[product_category][_eq]=${sku.product_category}&filter[product_brand][_eq]=${sku.product_brand}&limit=0&meta=filter_count`, {
             headers: HEADERS, cache: "no-store" 
          }).then(res => res.json()).catch(() => ({ meta: { filter_count: 0 } }))
        ]);
        
        const totalCount = (resProd.meta?.filter_count || 0) + (resDraft.meta?.filter_count || 0);
        
        // Use total + 1 for next sequence
        seq = String(totalCount + 1).padStart(3, '0');
      }

      console.log(`Resolved Parts: CAT=${catCode} | BRAND=${brandCode} | SEQ=${seq} | UNIT=${uomCode} | UOMName=${uomName}`);

      // Final Format: [CAT]-[BRAND]-[SEQ][UNIT]
      // Matches example: ELEC-OMNI-001EAC
      const finalCode = `${catCode}-${brandCode}-${seq}${uomCode}`;
      
      return finalCode.toUpperCase();
    } catch (error) {
      console.error("SKU Generation Error:", error);
      return `SKU-${Date.now().toString().slice(-6)}`;
    }
  },


  async approveDraft(id: number | string, masterData: MasterData) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    
    // 1. Fetch draft info
    const draftRes = await fetch(`${API_BASE_URL}/items/product_draft/${id}`, { headers: HEADERS, cache: "no-store" });
    const draft = (await draftRes.json()).data as SKU;

    // 2. Generate SKU Code (Business Logic 3.1)
    const skuCode = await this.generateSKUCode(draft, masterData);

    // 3. Move to products table (PHASE D)
    const createRes = await fetch(`${API_BASE_URL}/items/products`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        ...draft,
        product_code: skuCode,
        status: "Active",
        isActive: true,
        id: undefined, // Remove draft ID
      }),
    });

    if (!createRes.ok) throw new Error("Failed to activate product");

    // 4. Update draft status to Active or Delete it?
    // Usually we update the draft to show it's approved or delete it.
    await fetch(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ status: "Active" }),
    });

    return true;
  },
  
  async deleteDraft(id: number | string) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
    const response = await fetch(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "DELETE",
      headers: HEADERS,
    });
    if (!response.ok) throw new Error("Failed to delete draft");
    return true;
  }
};
