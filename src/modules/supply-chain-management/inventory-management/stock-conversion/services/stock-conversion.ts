import { AppError } from "@/lib/error-handler";
import { StockConversionPayload, StockConversionProduct, RFIDTag } from "../types/stock-conversion.schema";

const DIRECTUS_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

// Helper to use static token for Directus and session token for Spring
function getDirectusHeaders() {
  return {
    "Content-Type": "application/json",
    ...(DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}),
  };
}

function getHeaders() {
  return getDirectusHeaders();
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
    const fields = [
      "product_id",
      "id",
      "product_name",
      "description",
      "product_brand.*",
      "product_category.*",
      "unit_of_measurement.*",
      "unit_of_measurement_count",
      "product_code",
      "parent_id",
      "cost_per_unit",
      "price_per_unit"
    ].join(",");

    console.log("[Stock-Conversion] Starting fast product fetch...");
    const startTime = Date.now();

    const headers = getDirectusHeaders();

    // Fetch essential data in parallel
    const [prodRes, supplierRes, supplierListRes] = await Promise.all([
      fetchWithTimeout(`${DIRECTUS_API}/items/products?limit=-1&fields=${fields}`, { headers, cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/product_per_supplier?limit=-1&fields=product_id,supplier_id`, { headers, cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/suppliers?limit=-1&fields=id,supplier_id,supplier_name`, { headers, cache: "no-store" }),
    ]);

    console.log(`[Stock-Conversion] Fast API requests took ${Date.now() - startTime}ms`);

    if (!prodRes.ok) throw new AppError("FETCH_ERROR", `Failed to fetch products: ${prodRes.statusText}`, 500);
    const products = (await prodRes.json()).data || [];

    const supplierMap = new Map<number, number>();
    if (supplierRes?.ok) {
       const sJson = await supplierRes.json();
       (sJson.data || []).forEach((s: any) => {
          const pId = typeof s.product_id === 'object' ? s.product_id?.id : s.product_id;
          const sId = typeof s.supplier_id === 'object' ? s.supplier_id?.id : s.supplier_id;
          if (pId != null && sId != null) supplierMap.set(Number(pId), Number(sId));
       });
    }

    const supplierIdNameMap = new Map<number, string>();
    if (supplierListRes?.ok) {
        const slJson = await supplierListRes.json();
        (slJson.data || []).forEach((s: any) => {
            supplierIdNameMap.set(Number(s.id || s.supplier_id), s.supplier_name || "Unknown");
        });
    }
 
    // Dictionary to look up parent products quickly
    const parentDict = new Map<number, any>();
    products.forEach((p: any) => {
      if (!p.parent_id) {
        parentDict.set(p.product_id || p.id, p);
      }
    });

    // Create a lookup for product names by ID for parent resolution
    const productNameMap = new Map<number, string>();
    products.forEach((p: any) => {
      const pId = Number(p.product_id || p.id);
      if (!isNaN(pId)) productNameMap.set(pId, p.product_name || p.description || "");
    });

    // Utility to get a base family key by stripping ALL non-alphanumeric noise
    const getBaseFamilyKey = (p: any) => {
      let sourceName = p.product_name || p.description || "";
      if (p.parent_id) {
          const parentName = productNameMap.get(Number(p.parent_id));
          if (parentName) sourceName = parentName;
      }
      
      let name = (sourceName || "").toLowerCase();
      
      name = name
        .replace(/'s/g, 's')
        .replace(/\d+'s/g, '')
        .replace(/\d+s/g, '')
        .replace(/\bx\d+\b/g, '')
        .replace(/\d+x/g, '')
        .replace(/\b(box|pieces|piece|tie|pack|case|bottle|can|jar|pouch|sachet|roll|bundle|set|bucket|tray|bag|drum)\b/gi, '');
      
      const cleanName = name.replace(/[^a-z0-9]/g, '');
      
      return `BASE-${cleanName || 'unknown'}`;
    };

    // Group products (family) by the base name or parent_id
    const productGroups = new Map<string, any[]>();
    products.forEach((p: any) => {
      const key = getBaseFamilyKey(p);
      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key)!.push(p);
    });

    // Phase 1: Identify supplier for each group (Inheritance)
    const groupSupplierMap = new Map<string, number>();
    productGroups.forEach((members, key) => {
      const supplierId = members.reduce((acc, m) => {
        if (acc) return acc;
        const mPId = m.product_id || m.id;
        return supplierMap.get(Number(mPId)) || null;
      }, null as number | null);
      
      if (supplierId) groupSupplierMap.set(key, supplierId);
    });

    const result: StockConversionProduct[] = [];

    products.forEach((p: any) => {
      const parentP = p.parent_id ? parentDict.get(p.parent_id) : null;
      const inheritP = parentP || p;
      
      const pId = Number(p.product_id || p.id);
      const parentId = p.parent_id ? Number(p.parent_id) : null;
      
      const price = Number(p.cost_per_unit || inheritP.cost_per_unit || p.price_per_unit || inheritP.price_per_unit || 0);
      
      const brandName = typeof p.product_brand === 'object' && p.product_brand !== null 
          ? p.product_brand.brand_name 
          : "Unknown Brand";
      
      const categoryName = typeof p.product_category === 'object' && p.product_category !== null 
          ? p.product_category.category_name 
          : "Unknown Category";

      const unitId = typeof p.unit_of_measurement === 'object' && p.unit_of_measurement !== null 
         ? p.unit_of_measurement.unit_id || p.unit_of_measurement.id 
         : p.unit_of_measurement;
         
      const unitName = (typeof p.unit_of_measurement === 'object' && p.unit_of_measurement?.unit_name) 
           ? p.unit_of_measurement.unit_name 
           : "Unknown";

      const key = getBaseFamilyKey(p);
      const familyGroup = productGroups.get(key) || [];
      const availableUnits = familyGroup
        .filter((v: any) => {
             const vUnitId = typeof v.unit_of_measurement === 'object' && v.unit_of_measurement !== null 
                  ? v.unit_of_measurement.unit_id || v.unit_of_measurement.id 
                  : v.unit_of_measurement;
             return Number(vUnitId) !== Number(unitId);
        })
        .map((v: any) => {
             const vUnitId = typeof v.unit_of_measurement === 'object' && v.unit_of_measurement !== null 
                  ? v.unit_of_measurement.unit_id || v.unit_of_measurement.id 
                  : v.unit_of_measurement;
                    
             return {
                 unitId: Number(vUnitId),
                 name: (typeof v.unit_of_measurement === 'object' && v.unit_of_measurement?.unit_name) ? v.unit_of_measurement.unit_name : "Unknown Unit",
                 conversionFactor: v.unit_of_measurement_count || 1,
                 targetProductId: v.product_id || v.id
             };
        });

      const supplierId = supplierMap.get(pId) 
                      || (parentId && supplierMap.get(parentId))
                      || groupSupplierMap.get(key);

      const convFactor = Number(p.unit_of_measurement_count) || 1;

      result.push({
        productId: pId,
        supplierId: supplierId ? Number(supplierId) : undefined,
        supplierName: supplierId ? supplierIdNameMap.get(Number(supplierId)) : "No Supplier",
        brand: brandName,
        category: categoryName,
        productCode: p.product_code || inheritP.product_code,
        productDescription: p.description || p.product_name || inheritP.description || inheritP.product_name || "",
        family: key,
        conversionFactor: convFactor,
        currentUnit: unitName,
        currentUnitId: Number(unitId),
        quantity: 0, // Placeholder
        pricePerUnit: price,
        totalAmount: 0, // Placeholder
        inventoryLoaded: false, // UI knows it needs to fetch inventory
        availableUnits,
      });
    });

    return result;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_ERROR", `Stock fetch failed: ${error.message}`, 500);
  }
}

export async function fetchInventoryMap(token?: string): Promise<Record<number, number>> {
  if (!SPRING_API) return {};
  
  try {
    const start = Date.now();
    const res = await fetchWithTimeout(`${SPRING_API}/api/view-running-inventory/all`, { 
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }, 
      cache: "no-store" 
    }, 25000);
    
    console.log(`[Stock-Conversion] Spring Inventory API took ${Date.now() - start}ms`);
    
    if (!res.ok) throw new Error("Inventory API failed");
    
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.data || []);
    const invMap: Record<number, number> = {};
    
    items.forEach((i: any) => {
      const pId = Number(i.productId || i.product_id);
      const qty = Number(i.runningInventory ?? i.running_inventory ?? 0);
      if (!isNaN(pId)) {
        invMap[pId] = (invMap[pId] || 0) + qty;
      }
    });
    
    return invMap;
  } catch (err: any) {
    console.error("[Stock-Conversion] fetchInventoryMap error:", err.message);
    throw new AppError("FETCH_ERROR", "Could not load inventory data", 500);
  }
}

export async function convertStock(payload: StockConversionPayload) {
  try {
     const docNo = `CONV-${Date.now()}`;
     
      let targetProductId = payload.targetProductId || payload.productId; // Prefer explicit target ID from UI
      
     const remarkStr = `Conversion from ${payload.sourceUnitId} to ${payload.targetUnitId}`;
     const unitPrice = Number(payload.pricePerUnit) || 0;
     const totalAmount = Number((payload.quantityToConvert * unitPrice).toFixed(2)) || 0;

     // 2. Create OUT Header
     const outHeaderPayload = {
        doc_no: docNo,
        type: "OUT",
        branch_id: payload.branchId,
        created_by: payload.userId,
        posted_by: payload.userId,
        amount: totalAmount,
        remarks: remarkStr
     };

     console.log("[Stock-Conversion] Creating OUT header:", JSON.stringify(outHeaderPayload));
     const outHeaderRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment_header`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(outHeaderPayload)
     });
     if (!outHeaderRes.ok) {
        const errorData = await outHeaderRes.json().catch(() => ({}));
        throw new AppError("CREATE_ERROR", `Failed to create OUT header: ${JSON.stringify(errorData)}`, 400);
     }

     // 3. Create OUT adjustment
     const outPayload = {
         doc_no: docNo,
         product_id: payload.productId,
         branch_id: payload.branchId,
         type: "OUT",
         quantity: payload.quantityToConvert,
         created_by: payload.userId,
         remarks: remarkStr
     };
     console.log("[Stock-Conversion] Creating OUT adjustment:", JSON.stringify(outPayload));
     const outRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment`, {
         method: "POST",
         headers: getHeaders(),
         body: JSON.stringify(outPayload)
     });
     if (!outRes.ok) {
        const errorData = await outRes.json().catch(() => ({}));
        throw new AppError("CREATE_ERROR", `Failed to create OUT adjustment: ${JSON.stringify(errorData)}`, 400);
     }

     // 4. Create IN Header
     const inHeaderPayload = {
        doc_no: docNo,
        type: "IN",
        branch_id: payload.branchId,
        created_by: payload.userId,
        posted_by: payload.userId,
        amount: totalAmount,
        remarks: remarkStr
     };

     console.log("[Stock-Conversion] Creating IN header:", JSON.stringify(inHeaderPayload));
     const inHeaderRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment_header`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(inHeaderPayload)
     });
     if (!inHeaderRes.ok) {
        const errorData = await inHeaderRes.json().catch(() => ({}));
        throw new AppError("CREATE_ERROR", `Failed to create IN header: ${JSON.stringify(errorData)}`, 400);
     }

     // 5. Create IN adjustment
     const inPayload = {
         doc_no: docNo,
         product_id: targetProductId,
         branch_id: payload.branchId,
         type: "IN",
         quantity: payload.convertedQuantity,
         created_by: payload.userId,
         remarks: remarkStr
     };
     console.log("[Stock-Conversion] Creating IN adjustment:", JSON.stringify(inPayload));
     const inRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment`, {
         method: "POST",
         headers: getHeaders(),
         body: JSON.stringify(inPayload)
     });
     if (!inRes.ok) {
        const errorData = await inRes.json().catch(() => ({}));
        throw new AppError("CREATE_ERROR", `Failed to create IN adjustment: ${JSON.stringify(errorData)}`, 400);
     }

     const inData = await inRes.json();
     console.log("[Stock-Conversion] IN Adjustment Response:", JSON.stringify(inData));
     const newStockAdjId = inData.data?.id || (Array.isArray(inData.data) ? inData.data[0]?.id : inData.data?.id);

     // 6. Assign RFID tags to the IN adjustment
     if (newStockAdjId && payload.rfidTags && payload.rfidTags.length > 0) {
         console.log(`[Stock-Conversion] Storing ${payload.rfidTags.length} RFID tags for adjustment ID: ${newStockAdjId}`);
         for (const [idx, tag] of payload.rfidTags.entries()) {
             try {
                const rfidPayload = {
                   stock_adjustment_id: Number(newStockAdjId),
                   rfid_tag: tag.rfid_tag,
                   created_by: payload.userId
                };
                console.log(`[Stock-Conversion] RFID Tag [${idx}] Posting:`, JSON.stringify(rfidPayload));
                
                const rRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment_rfid`, {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify(rfidPayload)
                });

                if (!rRes.ok) {
                   const errData = await rRes.json().catch(() => ({}));
                   console.error(`[Stock-Conversion] RFID Tag [${idx}] failed:`, rRes.status, errData);
                } else {
                   const resData = await rRes.json();
                   console.log(`[Stock-Conversion] RFID Tag [${idx}] stored successfully. ID:`, resData.data?.id);
                }
             } catch (err: any) {
                console.error(`[Stock-Conversion] RFID Tag [${idx}] error:`, err.message);
             }
         }
     } else {
         console.log("[Stock-Conversion] Skipping RFID storage. AdjId:", newStockAdjId, "TagsCount:", payload.rfidTags?.length);
     }

     return { success: true, docNo, sourceProductId: payload.productId, targetProductId };
  } catch (error: any) {
      console.error("[Stock-Conversion] Critical Error:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("CONVERT_ERROR", `Conversion failed: ${error.message}`, 500);
  }
}
