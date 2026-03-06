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
    const [prodRes, unitRes, brandRes, catRes, supplierRes, invRes] = await Promise.all([
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
        : Promise.resolve(null)
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
          if (s.product_id && s.supplier_id) supplierMap.set(Number(s.product_id), Number(s.supplier_id));
       });
    }

    const invMap = new Map<number, number>();
    if (invRes && invRes.ok) {
       const invJson = await invRes.json();
       const items = Array.isArray(invJson) ? invJson : (invJson.data || []);
       
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
    }
 
    // Process mapping...
    console.log("[Stock-Conversion] Starting mapping processing...");
    // ... the rest of the logic follows


    // Map into StockConversionProduct
    // Dictionary to look up parent products quickly
    const parentDict = new Map<number, any>();
    products.forEach((p: any) => {
      if (!p.parent_id) {
        parentDict.set(p.product_id || p.id, p);
      }
    });

    // Group products (family) by the parent's product_id
    const productGroups = new Map<string, any[]>();
    products.forEach((p: any) => {
      const key = p.parent_id ? String(p.parent_id) : String(p.product_id || p.id);
      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key)!.push(p);
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
      
      // Strict priority for cost_per_unit
      const price = Number(p.cost_per_unit || inheritP.cost_per_unit || p.price_per_unit || inheritP.price_per_unit || 0);
      
      const rawBrand = p.product_brand || inheritP.product_brand;
      const rawCategory = p.product_category || inheritP.product_category;

      const brandId = typeof rawBrand === 'object' && rawBrand !== null 
         ? rawBrand.brand_id || rawBrand.id || rawBrand
         : rawBrand;
         
      const categoryId = typeof rawCategory === 'object' && rawCategory !== null 
         ? rawCategory.category_id || rawCategory.id || rawCategory
         : rawCategory;
      
      // Determine available target units from variants (the whole family)
      const key = p.parent_id ? String(p.parent_id) : String(p.product_id || p.id);
      const familyGroup = productGroups.get(key) || [];
      const availableUnits = familyGroup
        .filter((v: any) => {
             const vUnitId = typeof v.unit_of_measurement === 'object' && v.unit_of_measurement !== null 
                  ? v.unit_of_measurement.unit_id || v.unit_of_measurement.id 
                  : v.unit_of_measurement;
             const pUnitId = typeof p.unit_of_measurement === 'object' && p.unit_of_measurement !== null 
                  ? p.unit_of_measurement.unit_id || p.unit_of_measurement.id 
                  : p.unit_of_measurement;
             return vUnitId !== pUnitId;
        })
        .map((v: any) => {
             const vUnitId = typeof v.unit_of_measurement === 'object' && v.unit_of_measurement !== null 
                  ? v.unit_of_measurement.unit_id || v.unit_of_measurement.id 
                  : v.unit_of_measurement;
                  
             return {
                 unitId: vUnitId,
                 name: unitMap.get(Number(vUnitId)) || "Unknown Unit",
                 conversionFactor: v.unit_of_measurement_count || 1,
                 targetProductId: v.product_id || v.id
             };
        });

      // Determine supplier. Inherit from parent if null.
      const supplierId = supplierMap.get(p.product_id || p.id) || supplierMap.get(inheritP.product_id || inheritP.id);

      const unitId = typeof p.unit_of_measurement === 'object' && p.unit_of_measurement !== null 
         ? p.unit_of_measurement.unit_id || p.unit_of_measurement.id 
         : p.unit_of_measurement;
         
      const unitName = (typeof p.unit_of_measurement === 'object' && p.unit_of_measurement?.unit_name) 
           ? p.unit_of_measurement.unit_name 
           : unitMap.get(Number(unitId)) || "Unknown";

      result.push({
        productId: p.product_id || p.id,
        supplierId: supplierId,
        brand: brandMap.get(Number(brandId)) || (typeof rawBrand === 'object' && rawBrand?.brand_name ? rawBrand.brand_name : "Unknown Brand"),
        category: catMap.get(Number(categoryId)) || (typeof rawCategory === 'object' && rawCategory?.category_name ? rawCategory.category_name : "Unknown Category"),
        productCode: p.product_code || inheritP.product_code,
        productDescription: p.description || p.product_name || inheritP.description || inheritP.product_name || "",
        unitOfBox: familyGroup.find(v => {
           const vu = typeof v.unit_of_measurement === 'object' ? v.unit_of_measurement.unit_id : v.unit_of_measurement; 
           return unitMap.get(Number(vu))?.toLowerCase() === 'box'
        })?.unit_of_measurement_count || p.unit_of_measurement_count || 24,
        pieces: familyGroup.find(v => {
           const vu = typeof v.unit_of_measurement === 'object' ? v.unit_of_measurement.unit_id : v.unit_of_measurement;
           return unitMap.get(Number(vu))?.toLowerCase() === 'pieces'
        })?.unit_of_measurement_count || 0,
        tie: 0,
        pack: familyGroup.find(v => {
           const vu = typeof v.unit_of_measurement === 'object' ? v.unit_of_measurement.unit_id : v.unit_of_measurement;
           return unitMap.get(Number(vu))?.toLowerCase() === 'pack'
        })?.unit_of_measurement_count || 0,
        currentUnit: unitName,
        currentUnitId: unitId,
        quantity: qty,
        pricePerUnit: price,
        totalAmount: qty * price,
        availableUnits,
      });
    });

    return result;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_ERROR", `Stock fetch failed: ${error.message}`, 500);
  }
}

export async function convertStock(payload: StockConversionPayload) {
  try {
     const docNo = `CONV-${Date.now()}`;
     
     // 1. Fetch matching product variants to find the target product ID
     const prodRes = await fetch(`${DIRECTUS_API}/items/products/${payload.productId}`, {
       headers: getHeaders(),
       cache: "no-store",
     });
     if (!prodRes.ok) throw new AppError("NOT_FOUND", "Source product not found.", 404);
     const sourceProductData = (await prodRes.json()).data;
     
     const key = sourceProductData.parent_id ? String(sourceProductData.parent_id) : sourceProductData.product_name;
     const allVariantsRes = await fetch(`${DIRECTUS_API}/items/products?filter[_or][0][parent_id][_eq]=${key}&filter[_or][1][product_name][_eq]=${key}`, {
        headers: getHeaders(),
        cache: "no-store"
     });
     
     let targetProductId = payload.productId; // Fallback
     if (allVariantsRes.ok) {
         const variants = (await allVariantsRes.json()).data || [];
         const targetP = variants.find((v:any) => v.unit_of_measurement === payload.targetUnitId);
         if (targetP) targetProductId = targetP.product_id || targetP.id;
     }

     const remarkStr = `Conversion from ${payload.sourceUnitId} to ${payload.targetUnitId}`;

     // 2. Create Header
     const headerPayload = {
        doc_no: docNo,
        type: "CONV",
        branch_id: payload.branchId,
        created_by: payload.userId,
        posted_by: payload.userId,
        amount: payload.quantityToConvert * payload.pricePerUnit,
        remarks: remarkStr
     };

     const headerRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment_header`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(headerPayload)
     });
     if (!headerRes.ok) throw new AppError("CREATE_ERROR", "Failed to create conversion header", 400);

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
     const outRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment`, {
         method: "POST",
         headers: getHeaders(),
         body: JSON.stringify(outPayload)
     });
     if (!outRes.ok) throw new AppError("CREATE_ERROR", "Failed to deduct source stock", 400);

     // 4. Create IN adjustment
     const inPayload = {
         doc_no: docNo,
         product_id: targetProductId,
         branch_id: payload.branchId,
         type: "IN",
         quantity: payload.convertedQuantity,
         created_by: payload.userId,
         remarks: remarkStr
     };
     const inRes = await fetch(`${DIRECTUS_API}/items/stock_adjustment`, {
         method: "POST",
         headers: getHeaders(),
         body: JSON.stringify(inPayload)
     });
     if (!inRes.ok) throw new AppError("CREATE_ERROR", "Failed to add target stock", 400);
     const inData = await inRes.json();
     const newStockAdjId = inData.data.id;

     // 5. Assign RFID tags to the IN adjustment
     if (payload.rfidTags && payload.rfidTags.length > 0) {
         const rfidPromises = payload.rfidTags.map((tag: RFIDTag) => {
            return fetch(`${DIRECTUS_API}/items/stock_adjustment_rfid`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    stock_adjustment_id: newStockAdjId,
                    rfid_tag: tag.rfid_tag,
                    created_by: payload.userId
                })
            });
         });
         await Promise.all(rfidPromises);
     }

     return { success: true, docNo, sourceProductId: payload.productId, targetProductId };
  } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError("CONVERT_ERROR", `Conversion failed: ${error.message}`, 500);
  }
}
