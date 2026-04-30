import { stockConversionRepo, DIRECTUS_API, DIRECTUS_TOKEN } from "./stock-conversion.repo";
import { normalizeProductName, generateConversionDocNo } from "./stock-conversion.helpers";
import type { StockConversionProduct, StockConversionPayload } from "../types/stock-conversion.types";
import { AppError } from "../utils/error-handler";

interface DirectusProduct {
  id?: string | number;
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
  product_per_supplier?: Array<{ supplier_id?: number | { id?: number; supplier_id?: number; supplier_name?: string; supplier_shortcut?: string } }>;
  product_supplier?: number | { id?: number; supplier_id?: number; supplier_name?: string; supplier_shortcut?: string };
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
    const t0 = Date.now();

    // 1. Resolve filter IDs first to avoid relational Forbidden joins
    const allOptions = await stockConversionRepo.fetchFilterOptions();
    console.log(`[Perf] Step 1 - fetchFilterOptions: ${Date.now() - t0}ms`);
    const finalFilters: string[] = [];

    let filterProductIds: number[] | null = null;

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
          const pIds = (json.data || []).map((d: { product_id: number }) => Number(d.product_id));
          if (pIds.length > 0) {
            filterProductIds = pIds;
          } else {
            return { data: [], totalCount: 0, options: allOptions };
          }
        }
      }
    }

    // 2. Optimization: Handle 'Convertible Only' via branch-wide fetch
    if (hasStock && branchId) {
      try {
        const inv = await stockConversionRepo.fetchInventory(token, branchId);
        preFetchedInventory = inv;
        
        const stockProductIds = Object.entries(inv)
          .filter(([, qty]) => (qty as unknown as number) > 0)
          .map(([id]) => Number(id));

        if (stockProductIds.length > 0) {
          // INTERSECT: Only keep IDs that match BOTH filters (Supplier AND Stock)
          if (filterProductIds !== null) {
            filterProductIds = filterProductIds.filter(id => stockProductIds.includes(id));
          } else {
            filterProductIds = stockProductIds;
          }

          if (filterProductIds.length === 0) {
            return { data: [], totalCount: 0, options: allOptions };
          }
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

    // Finalize ID filter
    if (filterProductIds !== null && filterProductIds.length > 0) {
      // Chunk to prevent massive URLs (capped at ~500 IDs)
      const chunkedIds = filterProductIds.slice(0, 500);
      finalFilters.push(`filter[product_id][_in]=${chunkedIds.join(",")}`);
    }

    const filterString = finalFilters.join("&");

    const t2 = Date.now();
    const fetchLimit = hasStock ? -1 : limit;
    const fetchOffset = hasStock ? 0 : offset;
    const prodJson = await stockConversionRepo.fetchProducts(fetchLimit, fetchOffset, filterString);
    const products = prodJson.data || [];
    const totalCount = prodJson.meta?.filter_count || 0;
    console.log(`[Perf] Step 2 - fetchProducts: ${Date.now() - t2}ms (${products.length} products)`);

    if (products.length === 0) return { data: [], totalCount: 0, options: { brands: [], categories: [], suppliers: [] } };

    // 4. Parallel Enrichment Fetching (only fetch what we DON'T already have)
    // allOptions already has brands, categories, units, suppliers — reuse those!
    const t4 = Date.now();
    const [invRes] = await Promise.all([
      (async () => {
        if (preFetchedInventory) return preFetchedInventory;
        if (!branchId) return {};
        try {
          return await stockConversionRepo.fetchInventory(token, branchId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Parallel inventory fetch failed";
          console.warn("[Service] Parallel inventory fetch failed:", message);
          return {}; 
        }
      })()
    ]);
    console.log(`[Perf] Step 4 - inventory: ${Date.now() - t4}ms`);

    // 4.5 Group Enrichment: Fetch all siblings in the same family to ensure unit conversion is possible
    const currentProductIds = products.map((p: DirectusProduct) => Number(p.product_id));
    const currentParentIds = products.map((p: DirectusProduct) => p.parent_id).filter(Boolean).map(Number) as (number | string)[];
    
    // Optimization: Only fetch parents/siblings for items that actually have a parent or are likely to be a parent
    const allPotentialParentIds = [...new Set([...currentParentIds, ...currentProductIds])].filter(id => id !== 0) as (number | string)[];
    const productNamesToFetch = [...new Set(products.map((p: DirectusProduct) => String(p.product_name)))].filter(name => name && name !== "undefined") as (string)[];

    const t5 = Date.now();
    const [familyByParent, familyBySelf, familyByName] = await Promise.all([
      stockConversionRepo.fetchItemsInChunks<DirectusProduct>("products", "parent_id", allPotentialParentIds, "product_id,product_name,parent_id,unit_of_measurement,unit_of_measurement_count,product_code,cost_per_unit,price_per_unit,product_per_supplier.supplier_id.id,product_per_supplier.supplier_id.supplier_name,product_per_supplier.supplier_id.supplier_shortcut"),
      stockConversionRepo.fetchItemsInChunks<DirectusProduct>("products", "product_id", currentParentIds as (number | string)[], "product_id,product_name,parent_id,unit_of_measurement,unit_of_measurement_count,product_code,cost_per_unit,price_per_unit,product_per_supplier.supplier_id.id,product_per_supplier.supplier_id.supplier_name,product_per_supplier.supplier_id.supplier_shortcut"),
      stockConversionRepo.fetchItemsInChunks<DirectusProduct>("products", "product_name", productNamesToFetch, "product_id,product_name,parent_id,unit_of_measurement,unit_of_measurement_count,product_code,cost_per_unit,price_per_unit,product_per_supplier.supplier_id.id,product_per_supplier.supplier_id.supplier_name,product_per_supplier.supplier_id.supplier_shortcut")
    ]);
    console.log(`[Perf] Step 4.5 - familyEnrichment: ${Date.now() - t5}ms`);
    console.log(`[Perf] TOTAL so far: ${Date.now() - t0}ms`);

    const familyProducts = [...products, ...familyByParent, ...familyBySelf, ...familyByName];
    const uniqueFamilyProducts = Array.from(new Map(familyProducts.map(p => [Number(p.product_id), p])).values());

    const inventory = invRes;

    // Resolve supplier mappings for ALL family members to ensure they show up in the table
    const allFamilyProductIds = uniqueFamilyProducts.map(p => Number(p.product_id));
    const supplierMappings = await stockConversionRepo.fetchItemsInChunks<DirectusLookup>(
      "product_per_supplier", 
      "product_id", 
      allFamilyProductIds, 
      "product_id,supplier_id.id,supplier_id.supplier_name,supplier_id.supplier_shortcut"
    );

    // 5. Build Lookup Maps (reuse allOptions instead of re-fetching)
    const unitMap = new Map<number, string>(allOptions.units.map((u: { id: number; name: string }) => [u.id, u.name]));
    const brandMap = new Map<number, string>(allOptions.brands.map((b: { id: number; name: string }) => [b.id, b.name]));
    const catMap = new Map<number, string>(allOptions.categories.map((c: { id: number; name: string }) => [c.id, c.name]));
    
    // Resolve supplier names from allOptions (no extra API call needed)
    const supplierNameMap = new Map<number, { name: string; shortcut: string }>(
      allOptions.suppliers.map((s: { id: number; name: string; shortcut: string }) => [s.id, { name: s.name, shortcut: s.shortcut }])
    );

    const productSupplierMap = new Map<number, number[]>();
    supplierMappings.forEach((m: DirectusLookup) => {
      // Handle potential relational objects for product_id and supplier_id
      const pId = typeof m.product_id === 'object' ? Number((m.product_id as Record<string, unknown>)?.id || (m.product_id as Record<string, unknown>)?.product_id || 0) : Number(m.product_id);
      const sId = typeof m.supplier_id === 'object' ? Number((m.supplier_id as Record<string, unknown>)?.id || (m.supplier_id as Record<string, unknown>)?.supplier_id || 0) : Number(m.supplier_id);
      
      if (!isNaN(pId) && !isNaN(sId)) {
        if (!productSupplierMap.has(pId)) productSupplierMap.set(pId, []);
        productSupplierMap.get(pId)!.push(sId);
      }
    });

    // 6. Grouping and Mapping (Using full family data)
    const parentIds = new Set(uniqueFamilyProducts.map((p: DirectusProduct) => p.parent_id).filter(Boolean).map(Number));
    const productGroups = new Map<string, DirectusProduct[]>();
    
    uniqueFamilyProducts.forEach((p: DirectusProduct) => {
      const pId = Number(p.product_id);
      const parentId = p.parent_id ? Number(p.parent_id) : undefined;
      const normalizedName = normalizeProductName(p.product_name);
      
      // Grouping logic:
      // 1. If it has a parent, group by Parent ID
      // 2. If it is a parent itself, group by its own ID
      // 3. If it has a name, group by Name
      // 4. Fallback: unique group by ID (prevents nameless items from merging)
      const groupKey = parentId ? `ID-${parentId}` : 
                      (parentIds.has(pId) ? `ID-${pId}` : 
                      (normalizedName ? `NAME-${normalizedName}` : `ID-${pId}`));
                      
      if (!productGroups.has(groupKey)) productGroups.set(groupKey, []);
      productGroups.get(groupKey)!.push(p);
    });

    const result: StockConversionProduct[] = products.map((p: DirectusProduct) => {
      const pId = Number(p.product_id || p.id);
      const parentId = p.parent_id ? Number(p.parent_id) : undefined;
      const normalizedName = normalizeProductName(p.product_name);
      
      const groupKey = parentId ? `ID-${parentId}` : (parentIds.has(pId) ? `ID-${pId}` : `NAME-${normalizedName}`);
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

      // Supplier Logic
      let finalSupplierName = "No Supplier";
      let finalSupplierShortcut = "";

      const findInMap = (id: number) => {
        const ids = productSupplierMap.get(id) || [];
        return ids.map(sid => supplierNameMap.get(sid)).find(Boolean);
      };

      const findInExpanded = (prod: DirectusProduct) => {
        const expanded = Array.isArray(prod.product_per_supplier) ? prod.product_per_supplier : [];
        if (expanded.length > 0) {
          const firstSup = expanded[0]?.supplier_id;
          if (typeof firstSup === 'object' && firstSup !== null) {
            const s = firstSup as Record<string, unknown>;
            const sId = Number(s.id || s.supplier_id || 0);
            return { 
                name: String(s.supplier_name || supplierNameMap.get(sId)?.name || "No Supplier"), 
                shortcut: String(s.supplier_shortcut || supplierNameMap.get(sId)?.shortcut || "") 
            };
          } else if (typeof firstSup === 'number') {
            const mapped = supplierNameMap.get(firstSup);
            return mapped ? { name: mapped.name, shortcut: mapped.shortcut } : null;
          }
        }
        return null;
      };

      const fallbackProduct = parentId ? uniqueFamilyProducts.find(pf => Number(pf.product_id || pf.id) === parentId) : null;
      const supInfo = findInMap(pId) || findInExpanded(p) || (fallbackProduct ? (findInMap(parentId!) || findInExpanded(fallbackProduct)) : null);

      if (supInfo) {
        finalSupplierName = supInfo.name || "No Supplier";
        finalSupplierShortcut = supInfo.shortcut || "";
      }

      const currentUnitName = unitMap.get(unitId) || "Unknown";
      const dbFactor = Number(p.unit_of_measurement_count ?? p.unit_count) || 1;
      const sourceFactor = (currentUnitName.toLowerCase().includes("piece") || currentUnitName.toLowerCase() === "pcs") ? 1 : dbFactor;
      
      const rawQuantity = inventory[pId] || 0;
      const finalQuantity = Math.floor(rawQuantity / sourceFactor);


      return {
        productId: pId,
        supplierName: finalSupplierName,
        supplierShortcut: finalSupplierShortcut,
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

    // 8. Sort by: 1. Product Name (Grouped), 2. Unit Size (Descending: Box > Tie > Piece)
    finalResult.sort((a, b) => {
      const nameCompare = a.productName.localeCompare(b.productName);
      if (nameCompare !== 0) return nameCompare;
      
      // Keep units in a logical order (larger units first)
      return (b.conversionFactor || 0) - (a.conversionFactor || 0);
    });

    // 9. Manual pagination when hasStock is ON (since we fetched all products above)
    if (hasStock) {
      const finalResultSlice = finalResult.slice(offset, offset + limit);
      console.log(`[Perf] Step 9 - final mapping+sort+slice: ${Date.now() - t0}ms (TOTAL)`);
      return {
        data: finalResultSlice,
        totalCount: finalResult.length,
        options: allOptions
      };
    }

    console.log(`[Perf] Step 9 - final mapping+sort: ${Date.now() - t0}ms (TOTAL)`);

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
      const now = new Date().toISOString();
      await stockConversionRepo.createStockAdjustmentHeader({
        doc_no: docNo, 
        type: "OUT", 
        branch_id: payload.branchId, 
        created_by: payload.userId, 
        posted_by: payload.userId, 
        amount: totalAmount, 
        remarks: remarkStr,
        isPosted: true,
        postedAt: now
      });

      // 2. Create the OUT movement (Source Product)
      const outRes = await stockConversionRepo.createStockAdjustment({
        doc_no: docNo, 
        product_id: payload.productId, 
        branch_id: payload.branchId, 
        type: "OUT", 
        quantity: payload.quantityToConvert, 
        created_by: payload.userId, 
        remarks: remarkStr
      });
      const outId = outRes.data?.id;

      // 3. Create the IN movement (Target Product)
      const inRes = await stockConversionRepo.createStockAdjustment({
        doc_no: docNo, 
        product_id: targetProductId, 
        branch_id: payload.branchId, 
        type: "IN", 
        quantity: payload.convertedQuantity, 
        created_by: payload.userId, 
        remarks: remarkStr
      });
      const inId = inRes.data?.id;

      // Handle RFIDs for Traceability - Ensure no duplicates and absolute uniqueness
      const rfidEntries: { rfid_tag: string; stock_adjustment_id: number; created_by: number }[] = [];
      const seenEntries = new Set<string>();
      
      const sourceTags = payload.sourceRfidTags || [];
      const targetTags = payload.rfidTags?.map(t => t.rfid_tag) || [];

      // CROSS-CHECK: Ensure a source tag is not being reused as a target tag in the same transaction
      const overlap = sourceTags.find(tag => targetTags.includes(tag));
      if (overlap) {
        throw new Error(`RFID ${overlap} cannot be used as both source and target in the same transaction.`);
      }

      const addRfidEntry = (tag: string, adjId: number) => {
        const key = `${tag}-${adjId}`;
        if (!seenEntries.has(key)) {
          rfidEntries.push({ 
            rfid_tag: tag, 
            stock_adjustment_id: adjId,
            created_by: payload.userId || 0
          });
          seenEntries.add(key);
        }
      };

      if (sourceTags.length && outId) {
        // 1. Mark existing tags as inactive globally
        await stockConversionRepo.updateRfidStatus(sourceTags, "inactive");
        
        // 2. Link them to the OUT adjustment for the audit trail
        sourceTags.forEach(tag => addRfidEntry(tag, outId));
      }

      if (targetTags.length && inId) {
        // 3. Link new tags to the IN adjustment for the audit trail
        targetTags.forEach(tag => addRfidEntry(tag, inId));
      }

      if (rfidEntries.length > 0) {
        await stockConversionRepo.insertStockAdjustmentRfids(rfidEntries);
      }

      return { success: true, docNo };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error during conversion";
      throw new AppError("CONVERT_ERROR", `Conversion failed: ${message}`, 500);
    }
  }
};
