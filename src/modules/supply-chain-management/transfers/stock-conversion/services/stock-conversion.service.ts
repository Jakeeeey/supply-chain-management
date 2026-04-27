import { stockConversionRepo, DIRECTUS_API, DIRECTUS_TOKEN } from "./stock-conversion.repo";
import { normalizeProductName, generateConversionDocNo } from "./stock-conversion.helpers";
import type { StockConversionProduct, StockConversionPayload } from "../types/stock-conversion.types";
import { AppError } from "../utils/error-handler";

interface DirectusProduct {
  product_id: string | number;
  product_name: string;
  parent_id?: string | number | null;
  unit_of_measurement?: string | number | { unit_id: string | number } | null;
  unit_of_measurement_count?: string | number | null;
  unit_count?: string | number | null;
  product_code?: string | null;
  cost_per_unit?: string | number | null;
  price_per_unit?: string | number | null;
  product_brand?: string | number | { brand_id: string | number } | null;
  product_category?: string | number | { category_id: string | number } | null;
  description?: string | null;
}

interface DirectusLookup {
  brand_id?: number;
  brand_name?: string;
  category_id?: number;
  category_name?: string;
  unit_id?: number;
  unit_name?: string;
  id?: number;
  supplier_name?: string;
  supplier_shortcut?: string;
  product_id?: number;
  supplier_id?: number;
}

export const stockConversionService = {
  async getStockList(limit: number, offset: number, branchId?: number, hasStock?: boolean, extraFilters?: Record<string, string>, token?: string) {
    let preFetchedInventory: Record<number, number> | null = null;

    // 1. Resolve filter IDs first to avoid relational Forbidden joins
    const allOptions = await stockConversionRepo.fetchFilterOptions();
    const finalFilters: string[] = [];

    if (extraFilters && typeof extraFilters === 'object') {
      const f = extraFilters as Record<string, string>;
      if (f.productBrand) {
        const found = allOptions.brands.find((b: { id: number; name: string }) => b.name === f.productBrand);
        if (found?.id) finalFilters.push(`filter[product_brand][_eq]=${found.id}`);
      }
      if (f.productCategory) {
        const found = allOptions.categories.find((c: { id: number; name: string }) => c.name === f.productCategory);
        if (found?.id) finalFilters.push(`filter[product_category][_eq]=${found.id}`);
      }
      if (f.unitName) {
        const found = allOptions.units.find((u: { id: number; name: string }) => u.name === f.unitName);
        if (found?.id) finalFilters.push(`filter[unit_of_measurement][_eq]=${found.id}`);
      }
      if (f.search) {
        const s = encodeURIComponent(f.search);
        finalFilters.push(`filter[_or][0][product_name][_icontains]=${s}&filter[_or][1][product_code][_icontains]=${s}`);
      }
      if (f.supplierShortcut) {
        const res = await fetch(`${DIRECTUS_API}/items/product_per_supplier?filter[supplier_id][supplier_shortcut][_eq]=${encodeURIComponent(f.supplierShortcut)}&fields=product_id&limit=-1`, {
          headers: { "Authorization": `Bearer ${DIRECTUS_TOKEN}` }
        });
        if (res.ok) {
          const json = await res.json();
          const pIds = (json.data || []).map((d: { product_id: number }) => d.product_id);
          if (pIds.length > 0) finalFilters.push(`filter[product_id][_in]=${pIds.join(",")}`);
          else return { data: [], totalCount: 0, options: allOptions };
        }
      }
    }

    let filterString = finalFilters.join("&");

    // 2. Optimization: Handle 'Convertible Only' via branch-wide fetch
    if (hasStock && branchId) {
      try {
        const inv = await stockConversionRepo.fetchInventory(token, branchId);
        preFetchedInventory = inv;
        
        const productIds = Object.entries(inv)
          .filter(([, qty]) => (qty as unknown as number) > 0)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .map(([id]) => Number(id))
          .slice(0, 1000);

        if (productIds.length > 0) {
          const idFilter = `filter[product_id][_in]=${productIds.join(",")}`;
          filterString = filterString ? `${filterString}&${idFilter}` : idFilter;
        } else {
          return { data: [], totalCount: 0, options: allOptions };
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        const errCode = (err as { code?: string }).code;
        console.warn("[Service] Inventory optimization failed:", errMsg);
        if (errCode === "AUTH_ERROR") {
          return { data: [], totalCount: 0, options: allOptions, authError: true };
        }
      }
    }

    // 2. Fetch Products
    // When hasStock is ON, we fetch ALL matching products (capped at ~200 IDs) to enable
    // accurate post-filtering and pagination. Otherwise, use normal server-side pagination.
    const fetchLimit = hasStock ? -1 : limit;
    const fetchOffset = hasStock ? 0 : offset;
    const prodJson = await stockConversionRepo.fetchProducts(fetchLimit, fetchOffset, filterString);
    const products = prodJson.data || [];
    const totalCount = prodJson.meta?.filter_count || 0;

    if (products.length === 0) return { data: [], totalCount: 0, options: { brands: [], categories: [], suppliers: [] } };

    // 3. Collect Unique IDs for Enrichment
    const brandIds = [...new Set(products.map((p: DirectusProduct) => p.product_brand).filter(Boolean).map((b: DirectusLookup) => typeof b === 'object' ? b.brand_id : b))] as (string | number)[];
    const categoryIds = [...new Set(products.map((p: DirectusProduct) => p.product_category).filter(Boolean).map((c: DirectusLookup) => typeof c === 'object' ? c.category_id : c))] as (string | number)[];
    const productIds = products.map((p: DirectusProduct) => Number(p.product_id));

    // 4. Parallel Enrichment Fetching
    const [brands, categories, units, supplierMappings, invRes] = await Promise.all([
      stockConversionRepo.fetchItemsInChunks<DirectusLookup>("brand", "brand_id", brandIds, "brand_id,brand_name"),
      stockConversionRepo.fetchItemsInChunks<DirectusLookup>("categories", "category_id", categoryIds, "category_id,category_name"),
      stockConversionRepo.fetchUnits(),
      stockConversionRepo.fetchItemsInChunks<DirectusLookup>("product_per_supplier", "product_id", productIds, "product_id,supplier_id"),
      (async () => {
        if (preFetchedInventory) return preFetchedInventory;
        if (!branchId) return {};
        try {
          const query = productIds.map((id: number) => `productId=${id}`).join("&");
          return await stockConversionRepo.fetchInventory(token, branchId, query);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Parallel inventory fetch failed";
          console.warn("[Service] Parallel inventory fetch failed:", message);
          return {}; 
        }
      })()
    ]);

    // 4.5 Group Enrichment: Fetch all siblings in the same family to ensure unit conversion is possible
    const currentProductIds = products.map((p: DirectusProduct) => Number(p.product_id));
    const currentParentIds = products.map((p: DirectusProduct) => p.parent_id).filter(Boolean).map(Number) as (number | string)[];
    
    // Potential parents could be the parents of items on page, or the items themselves
    const allPotentialParentIds = [...new Set([...currentParentIds, ...currentProductIds])] as (number | string)[];
    const productNamesToFetch = [...new Set(products.map((p: DirectusProduct) => String(p.product_name)))] as (string)[];

    const [familyByParent, familyBySelf, familyByName] = await Promise.all([
      stockConversionRepo.fetchItemsInChunks<DirectusProduct>("products", "parent_id", allPotentialParentIds, "product_id,product_name,parent_id,unit_of_measurement,unit_of_measurement_count,product_code,cost_per_unit,price_per_unit"),
      stockConversionRepo.fetchItemsInChunks<DirectusProduct>("products", "product_id", currentParentIds as (number | string)[], "product_id,product_name,parent_id,unit_of_measurement,unit_of_measurement_count,product_code,cost_per_unit,price_per_unit"),
      stockConversionRepo.fetchItemsInChunks<DirectusProduct>("products", "product_name", productNamesToFetch, "product_id,product_name,parent_id,unit_of_measurement,unit_of_measurement_count,product_code,cost_per_unit,price_per_unit")
    ]);

    const familyProducts = [...products, ...familyByParent, ...familyBySelf, ...familyByName];
    const uniqueFamilyProducts = Array.from(new Map(familyProducts.map(p => [Number(p.product_id), p])).values());

    const inventory = invRes;

    // 5. Build Lookup Maps
    const unitMap = new Map<number, string>(units.map((u: DirectusLookup) => [Number(u.unit_id), String(u.unit_name)] as [number, string]));
    const brandMap = new Map<number, string>(brands.map((b: DirectusLookup) => [Number(b.brand_id), String(b.brand_name)] as [number, string]));
    const catMap = new Map<number, string>(categories.map((c: DirectusLookup) => [Number(c.category_id), String(c.category_name)] as [number, string]));
    
    // Resolve supplier names (we need to fetch specific suppliers found in mapping)
    const supplierIdsOnPage = [...new Set(supplierMappings.map((m: DirectusLookup) => Number(m.supplier_id)))] as number[];
    const supplierDetails = await stockConversionRepo.fetchItemsInChunks<DirectusLookup>("suppliers", "id", supplierIdsOnPage, "id,supplier_name,supplier_shortcut");
    const supplierNameMap = new Map<number, { name: string; shortcut: string }>(
      supplierDetails.map((s: DirectusLookup) => [Number(s.id), { name: String(s.supplier_name), shortcut: String(s.supplier_shortcut) }] as [number, { name: string; shortcut: string }])
    );

    const productSupplierMap = new Map<number, number[]>();
    supplierMappings.forEach((m: DirectusLookup) => {
      const pId = Number(m.product_id);
      const sId = Number(m.supplier_id);
      if (!productSupplierMap.has(pId)) productSupplierMap.set(pId, []);
      productSupplierMap.get(pId)!.push(sId);
    });

    // 6. Grouping and Mapping (Using full family data)
    const parentIds = new Set(uniqueFamilyProducts.map((p: DirectusProduct) => p.parent_id).filter(Boolean).map(Number));
    const productGroups = new Map<string, DirectusProduct[]>();
    
    uniqueFamilyProducts.forEach((p: DirectusProduct) => {
      const pId = Number(p.product_id);
      const parentId = p.parent_id ? Number(p.parent_id) : undefined;
      const groupKey = parentId ? `ID-${parentId}` : (parentIds.has(pId) ? `ID-${pId}` : `NAME-${normalizeProductName(p.product_name)}`);
      if (!productGroups.has(groupKey)) productGroups.set(groupKey, []);
      productGroups.get(groupKey)!.push(p);
    });

    const result: StockConversionProduct[] = products.map((p: DirectusProduct) => {
      const pId = Number(p.product_id);
      const parentId = p.parent_id ? Number(p.parent_id) : undefined;
      const groupKey = parentId ? `ID-${parentId}` : (parentIds.has(pId) ? `ID-${pId}` : `NAME-${normalizeProductName(p.product_name)}`);
      const group = productGroups.get(groupKey) || [p];

      const brandId = Number(typeof p.product_brand === 'object' ? (p.product_brand as DirectusLookup)?.brand_id : p.product_brand);
      const categoryId = Number(typeof p.product_category === 'object' ? (p.product_category as DirectusLookup)?.category_id : p.product_category);
      const unitId = Number(typeof p.unit_of_measurement === 'object' ? (p.unit_of_measurement as DirectusLookup)?.unit_id : p.unit_of_measurement);

      const availableUnits = group
        .filter((v: DirectusProduct) => Number(typeof v.unit_of_measurement === 'object' ? (v.unit_of_measurement as DirectusLookup)?.unit_id : v.unit_of_measurement) !== unitId)
        .map((v: DirectusProduct) => {
          const vUnitId = Number(typeof v.unit_of_measurement === 'object' ? (v.unit_of_measurement as DirectusLookup)?.unit_id : v.unit_of_measurement);
          const dbFactor = Number(v.unit_of_measurement_count) || 1;
          const targetUnitName = unitMap.get(vUnitId) || "Unknown";
          return {
            unitId: vUnitId,
            name: targetUnitName,
            conversionFactor: (targetUnitName.toLowerCase().includes("piece") || targetUnitName.toLowerCase() === "pcs") ? 1 : dbFactor,
            targetProductId: Number(v.product_id)
          };
        });

      const sIds = [...(productSupplierMap.get(pId) || []), ...(parentId ? (productSupplierMap.get(parentId) || []) : [])];
      const supInfo = sIds.map(id => supplierNameMap.get(id)).find(Boolean);

      const currentUnitName = unitMap.get(unitId) || "Unknown";
      const dbFactor = Number(p.unit_of_measurement_count ?? p.unit_count) || 1;
      const sourceFactor = (currentUnitName.toLowerCase().includes("piece") || currentUnitName.toLowerCase() === "pcs") ? 1 : dbFactor;
      
      const rawQuantity = inventory[pId] || 0;
      const finalQuantity = Math.floor(rawQuantity / sourceFactor);


      return {
        productId: pId,
        supplierId: sIds[0],
        supplierName: supInfo?.name || "No Supplier",
        supplierShortcut: supInfo?.shortcut || "",
        brand: brandMap.get(brandId) || "Unknown",
        category: catMap.get(categoryId) || "Unknown",
        productCode: p.product_code || "",
        productName: p.product_name || "",
        productDescription: p.description || p.product_name || "",
        family: `FAM-${parentId || pId}`,
        currentUnit: currentUnitName,
        currentUnitId: unitId,
        quantity: finalQuantity,
        pricePerUnit: Number(p.cost_per_unit || p.price_per_unit || 0),
        totalAmount: Number((finalQuantity * Number(p.cost_per_unit || p.price_per_unit || 0)).toFixed(2)),
        conversionFactor: sourceFactor,
        inventoryLoaded: !!branchId,
        availableUnits,
      };
    });

    // 7. Refined 'Convertible Only' filter: Must have stock AND at least one sibling unit to convert into
    let finalResult = result;
    if (hasStock) {
      finalResult = result.filter(p => p.quantity > 0 && (p.availableUnits?.length ?? 0) > 0);
    }

    // 8. Sort by: 1. Has Available Units (Actionable), 2. Quantity (Highest first)
    finalResult.sort((a, b) => {
      const aCanConvert = (a.availableUnits?.length || 0) > 0 ? 1 : 0;
      const bCanConvert = (b.availableUnits?.length || 0) > 0 ? 1 : 0;
      if (aCanConvert !== bCanConvert) return bCanConvert - aCanConvert;
      return b.quantity - a.quantity;
    });

    // 9. Manual pagination when hasStock is ON (since we fetched all products above)
    if (hasStock) {
      return {
        data: finalResult.slice(offset, offset + limit),
        totalCount: finalResult.length,
        options: allOptions
      };
    }

    return { 
      data: finalResult, 
      totalCount: hasStock ? finalResult.length : totalCount, 
      options: allOptions 
    };
  },

  async executeConversion(payload: StockConversionPayload) {
    const docNo = generateConversionDocNo();
    const targetProductId = payload.targetProductId || payload.productId;
    const remarkStr = `Conversion from ${payload.sourceUnitId} to ${payload.targetUnitId}`;
    const totalAmount = Number((payload.quantityToConvert * payload.pricePerUnit).toFixed(2));

    try {
      // 1. Create a SINGLE header for the entire conversion transaction
      await stockConversionRepo.createStockAdjustmentHeader({
        doc_no: docNo, 
        type: "OUT", 
        branch_id: payload.branchId, 
        created_by: payload.userId, 
        posted_by: payload.userId, 
        amount: totalAmount, 
        remarks: remarkStr
      });

      // 2. Create the OUT movement (Source Product)
      await stockConversionRepo.createStockAdjustment({
        doc_no: docNo, 
        product_id: payload.productId, 
        branch_id: payload.branchId, 
        type: "OUT", 
        quantity: payload.quantityToConvert, 
        created_by: payload.userId, 
        remarks: remarkStr
      });

      // 3. Create the IN movement (Target Product)
      await stockConversionRepo.createStockAdjustment({
        doc_no: docNo, 
        product_id: targetProductId, 
        branch_id: payload.branchId, 
        type: "IN", 
        quantity: payload.convertedQuantity, 
        created_by: payload.userId, 
        remarks: remarkStr
      });

      // Handle RFIDs
      if (payload.sourceRfidTags?.length) {
        // 1. Mark existing tags as inactive globally
        await stockConversionRepo.updateRfidStatus(payload.sourceRfidTags, "inactive");
      }

      if (payload.rfidTags?.length) {
        // 2. We should ideally create these tags in rfid_tags table too if they are new
        // But for now we assume they are being registered as part of this transaction
        // via the Adjustment Link or a direct register.
      }

      return { success: true, docNo };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error during conversion";
      throw new AppError("CONVERT_ERROR", `Conversion failed: ${message}`, 500);
    }
  }
};
