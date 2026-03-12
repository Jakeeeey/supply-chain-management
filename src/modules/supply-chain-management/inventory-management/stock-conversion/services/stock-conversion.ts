import { AppError } from "@/lib/error-handler";
import { StockConversionPayload, StockConversionProduct, RFIDTag } from "../types/stock-conversion.schema";

const DIRECTUS_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

/**
 * Utility to decode JWT without a library
 */
function decodeJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, "base64")
        .toString()
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("[Stock-Conversion] JWT Decode failed:", err);
    return null;
  }
}

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

export async function fetchStockList(token?: string): Promise<StockConversionProduct[]> {
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

    console.log("[Stock-Conversion] Starting parallel data fetch...");
    const startTime = Date.now();

    // Fetch all required data in parallel
    const [prodRes, unitRes, brandRes, catRes, supplierRes, invRes, supplierListRes] = await Promise.all([
      fetchWithTimeout(`${DIRECTUS_API}/items/products?limit=-1&fields=*.*`, { headers: getHeaders(), cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/units?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/brand?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/categories?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetchWithTimeout(`${DIRECTUS_API}/items/product_per_supplier?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      SPRING_API 
        ? fetchWithTimeout(`${SPRING_API}/api/view-running-inventory/all`, { headers: springHeaders(token), cache: "no-store" }, 30000).catch(e => {
            console.warn("[Stock-Conversion] Spring Inventory fetch failed:", e.message);
            return null;
          })
        : Promise.resolve(null),
      fetchWithTimeout(`${DIRECTUS_API}/items/suppliers?limit=-1`, { headers: getHeaders(), cache: "no-store" })
    ]);

    console.log(`[Stock-Conversion] All requests returned in ${Date.now() - startTime}ms`);

    // Check critical responses
    if (!prodRes.ok) {
       console.error(`[Stock-Conversion] Products fetch failed: ${prodRes.status} ${prodRes.statusText}`);
       throw new AppError("FETCH_ERROR", `Failed to fetch products: ${prodRes.statusText}`, 500);
    }
    const products = (await prodRes.json()).data || [];
    console.log(`[Stock-Conversion] Fetched ${products.length} products`);

    if (!unitRes.ok) console.warn("[Stock-Conversion] Units fetch failed:", unitRes.statusText);
    const unitMap = new Map<number, string>();
    if (unitRes.ok) {
       const uJson = await unitRes.json();
       (uJson.data || []).forEach((u: any) => unitMap.set(Number(u.unit_id), u.unit_name));
    }

    const brandMap = new Map<number, string>();
    if (brandRes && brandRes.ok) {
       const bJson = await brandRes.json();
       (bJson.data || []).forEach((b: any) => brandMap.set(Number(b.brand_id), b.brand_name));
    }

    const catMap = new Map<number, string>();
    if (catRes && catRes.ok) {
       const cJson = await catRes.json();
       (cJson.data || []).forEach((c: any) => catMap.set(Number(c.category_id), c.category_name));
    }

    const supplierMap = new Map<number, number>();
    if (supplierRes && supplierRes.ok) {
       const sJson = await supplierRes.json();
       (sJson.data || []).forEach((s: any) => {
          // Robustly handle if IDs are objects or numbers
          const pId = (typeof s.product_id === 'object' && s.product_id !== null) ? s.product_id.id || s.product_id.product_id : s.product_id;
          const sId = (typeof s.supplier_id === 'object' && s.supplier_id !== null) ? s.supplier_id.id || s.supplier_id.supplier_id : s.supplier_id;
          
          if (pId != null && sId != null) {
              supplierMap.set(Number(pId), Number(sId));
          }
       });
    }

    const supplierIdNameMap = new Map<number, string>();
    if (supplierListRes && supplierListRes.ok) {
        const slJson = await supplierListRes.json();
        (slJson.data || []).forEach((s: any) => {
            supplierIdNameMap.set(Number(s.id || s.supplier_id), s.supplier_name || s.name || "Unknown");
        });
    }

    const invMap = new Map<number, number>();
    console.log(`[Stock-Conversion] SPRING_API: ${SPRING_API}`);
    if (invRes && invRes.ok) {
       const invJson = await invRes.json();
       const items = Array.isArray(invJson) ? invJson : (invJson.data || []);
       console.log(`[Stock-Conversion] Fetched ${items.length} inventory items`);
       
       items.forEach((i: any) => {
          const rawId = i.productId || i.product_id;
          if (rawId != null) {
              const pId = Number(rawId);
              const qty = i.runningInventory ?? i.running_inventory ?? 0;
              if (!isNaN(pId)) {
                 invMap.set(pId, (invMap.get(pId) || 0) + Number(qty));
              }
          }
       });
       console.log(`[Stock-Conversion] invMap size: ${invMap.size}`);
    } else {
       console.warn(`[Stock-Conversion] invRes failed or null. status: ${invRes?.status}`);
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
      
      let qty = invMap.get(pId) ?? 0;
      if (qty === 0 && parentId !== null) {
          qty = invMap.get(parentId) ?? 0;
      }
      
      const price = Number(p.cost_per_unit || inheritP.cost_per_unit || p.price_per_unit || inheritP.price_per_unit || 0);
      
      const rawBrand = p.product_brand || inheritP.product_brand;
      const rawCategory = p.product_category || inheritP.product_category;

      const brandId = typeof rawBrand === 'object' && rawBrand !== null 
         ? rawBrand.brand_id || rawBrand.id || rawBrand
         : rawBrand;
         
      const categoryId = typeof rawCategory === 'object' && rawCategory !== null 
         ? rawCategory.category_id || rawCategory.id || rawCategory
         : rawCategory;
      
      const key = getBaseFamilyKey(p);
      const familyGroup = productGroups.get(key) || [];
      const availableUnits = familyGroup
        .filter((v: any) => {
             const vUnitId = typeof v.unit_of_measurement === 'object' && v.unit_of_measurement !== null 
                  ? v.unit_of_measurement.unit_id || v.unit_of_measurement.id 
                  : v.unit_of_measurement;
             const pUnitId = typeof p.unit_of_measurement === 'object' && p.unit_of_measurement !== null 
                  ? p.unit_of_measurement.unit_id || p.unit_of_measurement.id 
                  : p.unit_of_measurement;
             return Number(vUnitId) !== Number(pUnitId);
        })
        .map((v: any) => {
             const vUnitId = typeof v.unit_of_measurement === 'object' && v.unit_of_measurement !== null 
                  ? v.unit_of_measurement.unit_id || v.unit_of_measurement.id 
                  : v.unit_of_measurement;
                   
             return {
                 unitId: Number(vUnitId),
                 name: unitMap.get(Number(vUnitId)) || "Unknown Unit",
                 conversionFactor: v.unit_of_measurement_count || 1,
                 targetProductId: v.product_id || v.id
             };
        });

      const supplierId = supplierMap.get(p.product_id || p.id) 
                      || supplierMap.get(inheritP.product_id || inheritP.id)
                      || groupSupplierMap.get(key);

      const unitId = typeof p.unit_of_measurement === 'object' && p.unit_of_measurement !== null 
         ? p.unit_of_measurement.unit_id || p.unit_of_measurement.id 
         : p.unit_of_measurement;
         
      const unitName = (typeof p.unit_of_measurement === 'object' && p.unit_of_measurement?.unit_name) 
           ? p.unit_of_measurement.unit_name 
           : unitMap.get(Number(unitId)) || "Unknown";

      // Precise conversion factors sourced directly from unit_of_measurement_count
      const convFactor = Number(p.unit_of_measurement_count) || 1;

      result.push({
        productId: pId,
        supplierId: supplierId ? Number(supplierId) : undefined,
        supplierName: supplierId ? supplierIdNameMap.get(Number(supplierId)) : "No Supplier",
        brand: brandMap.get(Number(brandId)) || (typeof rawBrand === 'object' && rawBrand?.brand_name ? rawBrand.brand_name : "Unknown Brand"),
        category: catMap.get(Number(categoryId)) || (typeof rawCategory === 'object' && rawCategory?.category_name ? rawCategory.category_name : "Unknown Category"),
        productCode: p.product_code || inheritP.product_code,
        productDescription: p.description || p.product_name || inheritP.description || inheritP.product_name || "",
        family: key,
        conversionFactor: convFactor,
        currentUnit: unitName,
        currentUnitId: Number(unitId),
        quantity: qty,
        pricePerUnit: price,
        totalAmount: Number((qty * price).toFixed(2)),
        availableUnits,
      });
    });

    const withChoicesCount = result.filter(r => r.availableUnits && r.availableUnits.length > 0).length;
    
    console.log(`[Stock-Conversion] Total Products: ${result.length}, with choices: ${withChoicesCount}`);

    return result;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_ERROR", `Stock fetch failed: ${error.message}`, 500);
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
