import { AppError } from "@/lib/error-handler";
import { StockConversionPayload, StockConversionProduct, RFIDTag } from "../types/stock-conversion.schema";

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

export async function fetchStockList(): Promise<StockConversionProduct[]> {
  try {
    console.log("[Stock-Conversion] Starting separate API fetches (Authorized Mode)...");
    const startTime = Date.now();
    const headers = getHeaders();

    // 1. Fetch collections separately. AVOIDING "id" field as it triggers 403 on this static token.
    // Using explicit PK fields like product_id, unit_id, etc.
    const [prodRes, unitRes, brandRes, catRes, supplierRes, supplierListRes] = await Promise.all([
      fetchWithTimeout(`${DIRECTUS_API}/items/products?limit=-1&fields=product_id,product_name,description,product_code,parent_id,unit_of_measurement,product_brand,product_category,cost_per_unit,price_per_unit`, { headers, cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/units?limit=-1&fields=unit_id,unit_name`, { headers, cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/brand?limit=-1&fields=brand_id,brand_name`, { headers, cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/categories?limit=-1&fields=category_id,category_name`, { headers, cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/product_per_supplier?limit=-1&fields=product_id,supplier_id`, { headers, cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/suppliers?limit=-1&fields=id,supplier_name`, { headers, cache: "no-store" })
    ]);

    console.log(`[Stock-Conversion] API fetches took ${Date.now() - startTime}ms`);

    if (!prodRes.ok) {
        const err = await prodRes.json().catch(() => ({}));
        throw new AppError("FETCH_ERROR", `Failed to fetch products: ${prodRes.statusText} ${JSON.stringify(err)}`, 500);
    }
    const products = (await prodRes.json()).data || [];

    // Helper Maps for O(1) correlation
    const unitMap = new Map();
    if (unitRes.ok) (await unitRes.json()).data?.forEach((u: any) => unitMap.set(Number(u.unit_id), u.unit_name));

    const brandMap = new Map();
    if (brandRes.ok) (await brandRes.json()).data?.forEach((b: any) => brandMap.set(Number(b.brand_id), b.brand_name));

    const catMap = new Map();
    if (catRes.ok) (await catRes.json()).data?.forEach((c: any) => catMap.set(Number(c.category_id), c.category_name));

    const supplierMap = new Map<number, number[]>();
    if (supplierRes.ok) {
        const juncJson = await supplierRes.json();
        const juncData = juncJson.data || [];
        console.log(`[Stock-Conversion] Fetched ${juncData.length} junction rows`);
        juncData.forEach((s: any) => {
            const pId = Number(s.product_id);
            const sId = Number(s.supplier_id);
            if (!isNaN(pId) && !isNaN(sId)) {
                if (!supplierMap.has(pId)) supplierMap.set(pId, []);
                supplierMap.get(pId)!.push(sId);
            }
        });
    }

    const supplierNameMap = new Map();
    if (supplierListRes.ok) {
        const supJson = await supplierListRes.json();
        const supData = supJson.data || [];
        console.log(`[Stock-Conversion] Fetched ${supData.length} suppliers`);
        supData.forEach((s: any) => {
            const sId = Number(s.id);
            if (!isNaN(sId)) supplierNameMap.set(sId, s.supplier_name);
        });
    }

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

      for (const sId of sIds) {
          const name = supplierNameMap.get(sId);
          if (name) {
              finalSupplierId = sId;
              finalSupplierName = name;
              break;
          }
      }

      result.push({
        productId: pId,
        supplierId: finalSupplierId ? Number(finalSupplierId) : undefined,
        supplierName: finalSupplierName,
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
    
    return result;
  } catch (error: any) {
    console.error("[Stock-Conversion] fetchStockList Critical Error:", error.message);
    throw new AppError("FETCH_ERROR", `Stock fetch failed: ${error.message}`, 500);
  }
}

export async function fetchInventoryMap(token?: string, branchId?: number): Promise<Record<number, number>> {
  if (!SPRING_API) return {};
  try {
    const start = Date.now();
    const url = `${SPRING_API}/api/view-running-inventory/all${branchId !== undefined ? `?branch_id=${branchId}` : ""}`;
    console.log(`[Stock-Conversion] Fetching inventory from: ${url}`);
    
    const res = await fetchWithTimeout(url, { 
      headers: springHeaders(token), 
      cache: "no-store" 
    }, 45000);
    
    if (!res.ok) {
        const status = res.status;
        const body = await res.text().catch(() => "No body");
        
        if (status === 401 || status === 403) {
            console.warn(`[Stock-Conversion] Spring API Unauthorized (401/403). Returning empty inventory.`);
            return {}; // Graceful fallback
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
    throw new AppError("FETCH_ERROR", "Inventory load failed", 500);
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
