/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppError } from "@/lib/error-handler";
import { StockConversionPayload, StockConversionProduct } from "../types/stock-conversion.schema";

const DIRECTUS_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchWithTimeout(url: string, options: any = {}, timeout = 15000) {
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

// Global cache for master data dictionaries to prevent fetching on every page navigation
const masterCache: any = {
    units: null,
    brands: null,
    cats: null,
    suppliers: null,
    supplierNames: null,
    lastFetched: 0
};

const CACHE_TTL = 1000 * 60 * 60; // 1 hour TTL

async function getMasterData(headers: any) {
    const now = Date.now();
    if (masterCache.lastFetched > now - CACHE_TTL && masterCache.units) {
        return masterCache;
    }

    console.log("[Stock-Conversion] Fetching Master Dictionaries (Units, Brands, Categories, Suppliers) - CACHE MISS");
    const [unitRes, brandRes, catRes, supplierRes, supplierListRes] = await Promise.all([
      fetchWithTimeout(`${DIRECTUS_API}/items/units?limit=-1&fields=unit_id,unit_name`, { headers }),
      fetchWithTimeout(`${DIRECTUS_API}/items/brand?limit=-1&fields=brand_id,brand_name`, { headers }),
      fetchWithTimeout(`${DIRECTUS_API}/items/categories?limit=-1&fields=category_id,category_name`, { headers }),
      fetchWithTimeout(`${DIRECTUS_API}/items/product_per_supplier?limit=-1&fields=product_id,supplier_id`, { headers }),
      fetchWithTimeout(`${DIRECTUS_API}/items/suppliers?limit=-1&fields=id,supplier_name,supplier_shortcut`, { headers })
    ]);

    masterCache.units = unitRes.ok ? (await unitRes.json()).data : [];
    masterCache.brands = brandRes.ok ? (await brandRes.json()).data : [];
    masterCache.cats = catRes.ok ? (await catRes.json()).data : [];
    masterCache.suppliers = supplierRes.ok ? (await supplierRes.json()).data : [];
    masterCache.supplierNames = supplierListRes.ok ? (await supplierListRes.json()).data : [];
    masterCache.lastFetched = now;

    return masterCache;
}

export async function fetchStockList(
  limit: number = 20,
  offset: number = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filters?: InventoryFilters
): Promise<{ data: StockConversionProduct[]; totalCount: number }> {
  try {
    console.log(`[Stock-Conversion] Starting API fetches (limit=${limit}, offset=${offset})...`);
    const startTime = Date.now();
    const headers = getHeaders();

    // 1. Fetch products with limit and offset (Cached for 60 seconds because inventory is handled entirely dynamically elsewhere)
    const prodRes = await fetchWithTimeout(`${DIRECTUS_API}/items/products?limit=${limit}&offset=${offset}&meta=filter_count&fields=product_id,product_name,description,product_code,parent_id,unit_of_measurement,product_brand,product_category,cost_per_unit,price_per_unit`, { headers, next: { revalidate: 120 } });

    // 2. Fetch or retrieve cached master dictionaries
    const cache = await getMasterData(headers);
    console.log(`[Stock-Conversion] API fetches took ${Date.now() - startTime}ms`);

    if (!prodRes.ok) {
        const err = await prodRes.json().catch(() => ({}));
        throw new AppError("FETCH_ERROR", `Failed to fetch products: ${prodRes.statusText} ${JSON.stringify(err)}`, 500);
    }
    const prodJson = await prodRes.json();
    const products = prodJson.data || [];
    const totalCount = prodJson.meta?.filter_count || 0;

    // Helper Maps for O(1) correlation rebuilt quickly from cache
    const unitMap = new Map();
    cache.units?.forEach((u: any) => unitMap.set(Number(u.unit_id), u.unit_name));

    const brandMap = new Map();
    cache.brands?.forEach((b: any) => brandMap.set(Number(b.brand_id), b.brand_name));

    const catMap = new Map();
    cache.cats?.forEach((c: any) => catMap.set(Number(c.category_id), c.category_name));

    const supplierMap = new Map<number, number[]>();
    cache.suppliers?.forEach((s: any) => {
        const pId = Number(s.product_id);
        const sId = Number(s.supplier_id);
        if (!isNaN(pId) && !isNaN(sId)) {
            if (!supplierMap.has(pId)) supplierMap.set(pId, []);
            supplierMap.get(pId)!.push(sId);
        }
    });

    const supplierNameMap = new Map();
    cache.supplierNames?.forEach((s: any) => {
        const sId = Number(s.id);
        if (!isNaN(sId)) {
            supplierNameMap.set(sId, { name: s.supplier_name, shortcut: s.supplier_shortcut });
        }
    });

    // 2. Strict Grouping logic to prevent JSON explosion (No more name-based fuzzy grouping)
    // We only group products that are explicitly parts of a parent-child relationship.
    const productGroups = new Map<number, any[]>();
    products.forEach((p: any) => {
        const pId = Number(p.product_id);
        const parentId = p.parent_id ? Number(p.parent_id) : pId;
        if (!productGroups.has(parentId)) productGroups.set(parentId, []);
        productGroups.get(parentId)!.push(p);
    });

    const result: StockConversionProduct[] = [];

    products.forEach((p: any) => {
      const pId = Number(p.product_id);
      const parentId = p.parent_id ? Number(p.parent_id) : pId;
      const group = productGroups.get(parentId) || [p];

      // Safe extraction of IDs handling both number and object (Directus behavior)
      const brandId = Number(typeof p.product_brand === 'object' ? p.product_brand?.brand_id : p.product_brand);
      const categoryId = Number(typeof p.product_category === 'object' ? p.product_category?.category_id : p.product_category);
      const unitId = Number(typeof p.unit_of_measurement === 'object' ? p.unit_of_measurement?.unit_id : p.unit_of_measurement);

      const availableUnits = group
        .filter((v: any) => {
            const vUnitId = Number(typeof v.unit_of_measurement === 'object' ? v.unit_of_measurement?.unit_id : v.unit_of_measurement);
            return vUnitId !== unitId;
        })
        .map((v: any) => {
            const vUnitId = Number(typeof v.unit_of_measurement === 'object' ? v.unit_of_measurement?.unit_id : v.unit_of_measurement);
            return {
                unitId: vUnitId,
                name: unitMap.get(vUnitId) || "Unknown",
                conversionFactor: Number(v.unit_of_measurement_count) || 1,
                targetProductId: Number(v.product_id)
            };
        });

      // Robust supplier lookup: check product then parent, try to find a named one
      const sIds = [...(supplierMap.get(pId) || []), ...(supplierMap.get(parentId) || [])];
      let finalSupplierId = sIds[0];
      let finalSupplierName = "No Supplier";
      let finalSupplierShortcut = "";

      for (const sId of sIds) {
          const supInfo = supplierNameMap.get(sId);
          if (supInfo) {
              finalSupplierId = sId;
              finalSupplierName = supInfo.name;
              finalSupplierShortcut = supInfo.shortcut;
              break;
          }
      }

      result.push({
        productId: pId,
        supplierId: finalSupplierId ? Number(finalSupplierId) : undefined,
        supplierName: finalSupplierName,
        supplierShortcut: finalSupplierShortcut,
        brand: brandMap.get(brandId) || "Unknown",
        category: catMap.get(categoryId) || "Unknown",
        productCode: p.product_code || "",
        productDescription: p.description || p.product_name || "",
        family: `FAM-${parentId}`,
        currentUnit: unitMap.get(unitId) || "Unknown",
        currentUnitId: unitId,
        quantity: 0,
        pricePerUnit: Number(p.cost_per_unit || p.price_per_unit || 0),
        totalAmount: 0,
        inventoryLoaded: false,
        availableUnits,
      });
    });

    const choicesCount = result.filter(r => (r.availableUnits?.length || 0) > 0).length;
    console.log(`[Stock-Conversion] Processed ${result.length} products. Products with choices: ${choicesCount}`);
    
    return { data: result, totalCount };
  } catch (error: any) {
    console.error("[Stock-Conversion] fetchStockList Critical Error:", error.message);
    throw new AppError("FETCH_ERROR", `Stock fetch failed: ${error.message}`, 500);
  }
}

export interface InventoryFilters {
  supplierShortcut?: string;
  productCategory?: string;
  unitName?: string;
  productBrand?: string;
  productIds?: number[];
}

export async function fetchInventoryMap(token?: string, branchId?: number, filters?: InventoryFilters): Promise<Record<number, number>> {
  if (!SPRING_API) return {};
  try {
    const start = Date.now();
    let url = "";

    const clean = (val: string | undefined) => (val === "all" ? undefined : val);
    const sShortcut = clean(filters?.supplierShortcut);
    const pCategory = clean(filters?.productCategory);
    const uName = clean(filters?.unitName);
    const pBrand = clean(filters?.productBrand);
    const pIds = filters?.productIds;

    if (sShortcut || pCategory || uName || pBrand || (pIds && pIds.length > 0)) {
      const sp = new URLSearchParams();
      if (sShortcut) sp.set("supplierShortcut", sShortcut);
      if (pCategory) sp.set("productCategory", pCategory);
      if (uName) sp.set("unitName", uName);
      if (pBrand) sp.set("productBrand", pBrand);
      if (pIds && pIds.length > 0) sp.set("productIds", pIds.join(","));
      if (branchId !== undefined) sp.set("branch_id", String(branchId));
      
      url = `${SPRING_API}/api/view-running-inventory/filter?${sp.toString()}`;
    } else {
      url = `${SPRING_API}/api/view-running-inventory/all${branchId !== undefined ? `?branch_id=${branchId}` : ""}`;
    }
    console.log(`[Stock-Conversion] Fetching inventory from: ${url}`);
    
    const res = await fetchWithTimeout(url, { 
      headers: springHeaders(token), 
      next: { revalidate: 60 } // NextJS ISR cache for 60s
    }, 120000);
    
    if (!res.ok) {
        const status = res.status;
        const body = await res.text().catch(() => "No body");
        
        if (status === 401 || status === 403) {
            console.warn(`[Stock-Conversion] Spring API Unauthorized (${status}). Token was: ${token ? 'present' : 'missing'}`);
            // Throw a user-visible error instead of silently returning empty data
            throw new AppError("AUTH_ERROR", "Your session may have expired. Please log out and log in again to reload inventory.", 401);
        }

        // If /filter failed (e.g. 404 or 400), try falling back to /all as a last resort
        if (url.includes("/filter")) {
          console.warn(`[Stock-Conversion] /filter failed (${status}). Falling back to /all...`);
          const fallbackUrl = `${SPRING_API}/api/view-running-inventory/all${branchId !== undefined ? `?branch_id=${branchId}` : ""}`;
          const fallbackRes = await fetchWithTimeout(fallbackUrl, { 
            headers: springHeaders(token), 
            next: { revalidate: 60 } // NextJS ISR cache for 60s
          }, 120000);
          
          if (fallbackRes.ok) {
            const json = await fallbackRes.json();
            const items = Array.isArray(json) ? json : (json.data || []);
            const invMap: Record<number, number> = {};
            items.forEach((i: any) => {
              const pId = Number(i.productId || i.product_id);
              const qty = Number(i.runningInventory ?? i.running_inventory ?? 0);
              if (!isNaN(pId)) invMap[pId] = (invMap[pId] || 0) + qty;
            });
            return invMap;
          }
        }

        console.error(`[Stock-Conversion] Inventory API failed. Status: ${status}, Body: ${body}`);
        throw new Error(`Inventory API failed with status ${status}: ${body.substring(0, 100)}`);
    }
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.data || []);
    const invMap: Record<number, number> = {};
    
    items.forEach((i: any) => {
      const pId = Number(i.productId || i.product_id);
      const qty = Number(i.runningInventory ?? i.running_inventory ?? 0);
      if (!isNaN(pId)) invMap[pId] = (invMap[pId] || 0) + qty;
    });
    
    console.log(`[Stock-Conversion] Inventory Map built in ${Date.now() - start}ms`);
    return invMap;
  } catch (err: any) {
    console.error("[Stock-Conversion] fetchInventoryMap error:", err.message);
    throw new AppError("FETCH_ERROR", `Inventory load failed: ${err.message}`, 500);
  }
}

export async function convertStock(payload: StockConversionPayload) {
  try {
     const docNo = `CONV-${Date.now()}`;
     const targetProductId = payload.targetProductId || payload.productId;
     const headers = getHeaders();

     const remarkStr = `Conversion from ${payload.sourceUnitId} to ${payload.targetUnitId}`;
     const totalAmount = Number((payload.quantityToConvert * (payload.pricePerUnit || 0)).toFixed(2)) || 0;

     const createAdj = async (type: "IN" | "OUT", pId: number, qty: number) => {
         // Create Header
         const hRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment_header`, {
             method: "POST", headers, body: JSON.stringify({
                 doc_no: docNo, type, branch_id: payload.branchId, created_by: payload.userId, 
                 posted_by: payload.userId, amount: totalAmount, remarks: remarkStr
             })
         });
         if (!hRes.ok) throw new Error(`Failed to create ${type} header`);

         // Create Item
         const iRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment`, {
             method: "POST", headers, body: JSON.stringify({
                 doc_no: docNo, product_id: pId, branch_id: payload.branchId, 
                 type, quantity: qty, created_by: payload.userId, remarks: remarkStr
             })
         });
         if (!iRes.ok) throw new Error(`Failed to create ${type} item`);
         return iRes.json();
     };

     await createAdj("OUT", payload.productId, payload.quantityToConvert);
     const inData = await createAdj("IN", targetProductId, payload.convertedQuantity);
     
     const newStockAdjId = inData.data?.id || (Array.isArray(inData.data) ? inData.data[0]?.id : inData.data?.id);

     if (newStockAdjId && payload.rfidTags?.length) {
         for (const tag of payload.rfidTags) {
             await fetch(`${DIRECTUS_API}/items/stock_adjustment_rfid`, {
                 method: "POST", headers, body: JSON.stringify({
                     stock_adjustment_id: Number(newStockAdjId), rfid_tag: tag.rfid_tag, created_by: payload.userId
                 })
             }).catch(e => console.error("RFID tag storage failed:", e.message));
         }
     }

     return { success: true, docNo };
  } catch (error: any) {
      console.error("[Stock-Conversion] Conversion Error:", error);
      throw new AppError("CONVERT_ERROR", `Conversion failed: ${error.message}`, 500);
  }
}
