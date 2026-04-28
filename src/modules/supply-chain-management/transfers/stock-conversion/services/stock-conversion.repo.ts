import { AppError } from "../utils/error-handler";
import { getCached, setCache } from "../utils/cache";

export const DIRECTUS_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
export const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
export const SPRING_API = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");



function getHeaders() {
  return {
    "Content-Type": "application/json",
    ...(DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}),
  };
}

function springHeaders(token?: string) {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate, br",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const stockConversionRepo = {
  async fetchProducts(limit: number, offset: number, filters?: string) {
    const headers = getHeaders();
    const url = `${DIRECTUS_API}/items/products?limit=${limit}&offset=${offset}&meta=filter_count&fields=product_id,product_name,description,product_code,parent_id,unit_of_measurement,unit_of_measurement_count,product_brand,product_category,cost_per_unit,price_per_unit,product_supplier.supplier_name,product_supplier.supplier_shortcut,product_per_supplier.supplier_id.supplier_name,product_per_supplier.supplier_id.supplier_shortcut&sort=product_name${filters ? `&${filters}` : ""}`;
    
    console.log(`[Repo] Fetching products from Directus: ${url}`);
    const res = await fetchWithTimeout(url, { headers, cache: "no-store" });
    if (!res.ok) {
      console.error(`[Repo] Directus fetch failed: ${res.status} ${res.statusText}`);
      throw new AppError("FETCH_ERROR", `Failed to fetch products: ${res.statusText}`, 500);
    }
    return res.json();
  },

  async fetchItemsInChunks<T>(endpoint: string, field: string, ids: (number | string)[], fields: string = "*", sort?: string) {
    const headers = getHeaders();
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (!uniqueIds.length) return [];

    const results: T[] = [];
    const chunkSize = 50;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const filter = JSON.stringify({ [field]: { "_in": chunk } });
      const sortParam = sort ? `&sort=${sort}` : "";
      const url = `${DIRECTUS_API}/items/${endpoint}?filter=${filter}&fields=${fields}&limit=-1${sortParam}`;
      const res = await fetchWithTimeout(url, { headers });
      if (res.ok) {
        const json = await res.json();
        results.push(...(json.data || []));
      }
    }
    return results;
  },

  async fetchFilterOptions() {
    const CACHE_KEY = "filter_options";
    const TTL = 5 * 60 * 1000; // 5 minutes — brands/categories/units rarely change

    const cached = getCached<{ brands: { id: number; name: string }[]; categories: { id: number; name: string }[]; units: { id: number; name: string }[]; suppliers: { id: number; name: string; shortcut: string }[] }>(CACHE_KEY);
    if (cached) return cached;

    const headers = getHeaders();
    const [brands, categoriesRes, suppliers, units] = await Promise.all([
      fetchWithTimeout(`${DIRECTUS_API}/items/brand?limit=-1&fields=*`, { headers }),
      fetchWithTimeout(`${DIRECTUS_API}/items/categories?limit=-1&fields=*`, { headers }),
      fetchWithTimeout(`${DIRECTUS_API}/items/suppliers?limit=-1&fields=*`, { headers }),
      fetchWithTimeout(`${DIRECTUS_API}/items/units?limit=-1&fields=*`, { headers })
    ]);

    const result = {
      brands: brands.ok ? (await brands.json()).data.map((b: { brand_id?: number; id?: number; brand_name?: string; name?: string }) => ({ 
        id: b.brand_id || b.id || 0, 
        name: b.brand_name || b.name || "Unknown" 
      })) : [],
      categories: categoriesRes.ok ? (await categoriesRes.json()).data.map((c: { category_id?: number; id?: number; category_name?: string; name?: string }) => ({ 
        id: c.category_id || c.id || 0, 
        name: c.category_name || c.name || "Unknown" 
      })) : [],
      units: units.ok ? (await units.json()).data.map((u: { unit_id?: number; id?: number; unit_name?: string; name?: string }) => ({ 
        id: u.unit_id || u.id || 0, 
        name: u.unit_name || u.name || "Unknown" 
      })) : [],
      suppliers: suppliers.ok ? (await suppliers.json()).data.map((s: { id?: number; supplier_id?: number; supplier_name?: string; name?: string; supplier_shortcut?: string; shortcut?: string }) => ({ 
        id: s.id || s.supplier_id || 0, 
        name: s.supplier_name || s.name || "Unknown", 
        shortcut: s.supplier_shortcut || s.shortcut || "" 
      })) : []
    };

    setCache(CACHE_KEY, result, TTL);
    return result;
  },

  async fetchUnits() {
    const headers = getHeaders();
    const res = await fetchWithTimeout(`${DIRECTUS_API}/items/units?limit=-1&fields=unit_id,unit_name`, { headers });
    return res.ok ? (await res.json()).data : [];
  },

  async fetchInventory(token?: string, branchId?: number, queryParams?: string) {
    if (!SPRING_API) return {};

    // Cache inventory per branch for 60 seconds to prevent redundant slow Spring calls
    const CACHE_KEY = `inventory_${branchId ?? "all"}`;
    const TTL = 60 * 1000; // 60 seconds

    // Only use cache for branch-level fetches (not product-specific queries)
    if (!queryParams) {
      const cached = getCached<Record<number, number>>(CACHE_KEY);
      if (cached) {
        console.log(`[Repo] Inventory cache HIT for branch ${branchId}`);
        return cached;
      }
    }
    
    let url = "";
    if (queryParams || branchId !== undefined) {
      const q = queryParams ? `${queryParams}&` : "";
      const b = branchId !== undefined ? `branch_id=${branchId}` : "";
      url = `${SPRING_API}/api/view-running-inventory/filter?${q}${b}`;
    } else {
      url = `${SPRING_API}/api/view-running-inventory/all`;
    }

    console.log(`[Repo] Fetching inventory: ${url}`);
    const res = await fetchWithTimeout(url, { 
      headers: springHeaders(token), 
      cache: "no-store" 
    }, 300000);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new AppError("AUTH_ERROR", "Session expired. Please log in again.", 401);
      }
      throw new Error(`Inventory API failed: ${res.status}`);
    }

    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.data || []);
    const invMap: Record<number, number> = {};
    
    items.forEach((i: Record<string, unknown>) => {
      const pId = Number(i.productId || i.product_id);
      const qty = Number(i.runningInventory ?? i.running_inventory ?? 0);
      
      // Attempt manual branch filtering since Spring ignores the query parameter
      const itemBranchId = i.branchId ?? i.branch_id;
      if (branchId !== undefined && itemBranchId !== undefined && itemBranchId !== branchId) {
         // Skip if it doesn't match the requested branch
         return;
      }
      
      if (!isNaN(pId)) invMap[pId] = (invMap[pId] || 0) + qty;
    });

    // Cache branch-level results
    if (!queryParams) {
      setCache(CACHE_KEY, invMap, TTL);
    }

    return invMap;
  },

  /**
   * Returns a list of product IDs that have a positive running inventory balance.
   */
  async fetchProductIdsWithBalance(token?: string, branchId?: number): Promise<number[]> {
    const inv = await this.fetchInventory(token, branchId);
    return Object.entries(inv)
      .filter(([, qty]) => (qty as number) > 0)
      .map(([id]) => Number(id));
  },

  async createStockAdjustment(payload: Record<string, unknown>) {
    const headers = getHeaders();
    const res = await fetch(`${DIRECTUS_API}/items/stock_adjustment`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create stock adjustment");
    return res.json();
  },

  async createStockAdjustmentHeader(payload: Record<string, unknown>) {
    const headers = getHeaders();
    const res = await fetch(`${DIRECTUS_API}/items/stock_adjustment_header`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create adjustment header");
    return res.json();
  },

  async insertStockAdjustmentRfids(entries: { rfid_tag: string, stock_adjustment_id: number, created_by: number }[]) {
    if (entries.length === 0) return;
    const headers = getHeaders();
    const res = await fetch(`${DIRECTUS_API}/items/stock_adjustment_rfid`, {
      method: "POST",
      headers,
      body: JSON.stringify(entries),
    });
    if (!res.ok) throw new Error("Failed to insert stock adjustment RFIDs");
    return res.json();
  },

  async updateRfidStatus(rfidTags: string[], status: 'active' | 'inactive') {
    if (rfidTags.length === 0) return;
    const headers = getHeaders();
    
    // 1. Find the database IDs for these tags
    // We check both possible field names for robustness
    const filter = JSON.stringify({
      _or: [
        { rfid_tag: { _in: rfidTags } },
        { rfid: { _in: rfidTags } }
      ]
    });
    
    const searchUrl = `${DIRECTUS_API}/items/rfid_tags?filter=${encodeURIComponent(filter)}&fields=id`;
    const searchRes = await fetch(searchUrl, { headers });
    const { data } = await searchRes.json();
    
    if (data && data.length > 0) {
      const ids = data.map((item: { id: number | string }) => item.id);
      await fetch(`${DIRECTUS_API}/items/rfid_tags`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ keys: ids, data: { status } })
      });
      console.log(`[Repo] Successfully marked ${ids.length} tags as ${status}`);
    } else {
      console.warn(`[Repo] No tags found to update status: ${rfidTags.join(", ")}`);
    }
  }
};
