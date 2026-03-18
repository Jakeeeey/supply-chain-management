// =============================================================================
// Return-to-Supplier — Core Service Logic
// =============================================================================
import type { 
  ReturnToSupplier, 
  RTSItem, 
  ReferenceData, 
  Product, 
  Unit, 
  LineDiscount, 
  ProductSupplier, 
  RTSReturnType,
  InventoryRecord,
  Supplier,
  Branch,
  CreateReturnDTO
} from "../types/rts.schema";

import * as repo from "../repositories/rts-repository";

/**
 * Fetches all Return-to-Supplier transactions for the dashboard list.
 * Decoupled from Directus via Repository.
 */
export async function fetchTransactions(): Promise<ReturnToSupplier[]> {
  const [headerRes, itemsRes] = await Promise.all([
    repo.getRawRtsHeaders(),
    repo.getRawRtsAllItems()
  ]);

  const records = headerRes.data || [];
  if (records.length === 0) return [];

  const allItems = itemsRes.data || [];

  return records.map((r: any) => {
    const parentItems = allItems.filter((i) => (typeof i.rts_id === 'object' ? i.rts_id.id : i.rts_id) === r.id);
    const finalNet = parentItems.reduce((sum, item) => sum + Number(item.net_amount || 0), 0);
    const calculatedGross = parentItems.reduce((sum, item) => sum + Number(item.gross_amount || 0), 0);
    const calculatedDiscount = parentItems.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0);

    return {
      id: r.id,
      returnNo: r.doc_no || "N/A",
      supplier: r.supplier_id?.supplier_name || "Unknown",
      branch: r.branch_id?.branch_name || "Unknown",
      returnDate: r.transaction_date,
      status: r.is_posted ? "Posted" : "Pending",
      remarks: r.remarks,
      totalAmount: finalNet,
      grossAmount: calculatedGross,
      discountAmount: calculatedDiscount,
    };
  });
}

/**
 * Fetches the line items for a specific RTS transaction.
 */
export async function fetchTransactionDetails(
  id: string,
): Promise<RTSItem[]> {
  const itemsJson = await repo.getRawItemsByRtsId(id);
  const items = itemsJson.data || [];
  if (items.length === 0) return [];

  const itemIds = items.map((i: any) => i.id);

  return items.map((i: any) => {
    const rawProductId = typeof i.product_id === "object" ? i.product_id.product_id : i.product_id;
    const rawUomId = typeof i.uom_id === "object" ? i.uom_id.unit_id : i.uom_id;
    const rawUnitCount = typeof i.product_id === "object" ? i.product_id.unit_of_measurement_count : 1;

    return {
      id: i.id,
      productId: Number(rawProductId),
      uomId: Number(rawUomId),
      code: typeof i.product_id === "object" ? i.product_id.product_code : "N/A",
      name: typeof i.product_id === "object" ? i.product_id.product_name : "Unknown",
      unit: typeof i.uom_id === "object" ? i.uom_id.unit_shortcut : "UNIT",
      quantity: Number(i.quantity),
      price: Number(i.gross_unit_price),
      discountRate: Number(i.discount_rate) / 100,
      discountAmount: Number(i.discount_amount),
      total: Number(i.net_amount),
      unitCount: Number(rawUnitCount) > 0 ? Number(rawUnitCount) : 1,
      returnTypeId: i.return_type_id ? Number(i.return_type_id) : undefined,
    };
  });
}

/**
 * Fetches all reference data.
 */
export async function fetchReferences(): Promise<ReferenceData> {
  const [
    suppliersJson,
    branchesJson,
    productsJson,
    unitsJson,
    discountsJson,
    connectionsJson,
    returnTypesJson,
  ] = await repo.getRawReferences();

  const unitMap = new Map<string, string>();
  (unitsJson.data || []).forEach((u: any) => {
    unitMap.set(String(u.unit_id), u.unit_name);
  });

  const products: Product[] = (productsJson.data || []).map((p: any) => ({
    id: String(p.product_id),
    code: p.product_code || "N/A",
    name: p.description || p.product_name || "Unknown",
    price: Number(p.cost_per_unit ?? 0),
    unit: unitMap.get(String(p.unit_of_measurement)) || "Units",
    uom_id: p.unit_of_measurement || 0,
    unitCount: Number(p.unit_of_measurement_count || 1),
    parentId: p.parent_id && p.parent_id !== 0 ? p.parent_id : null,
  }));

  return {
    suppliers: (suppliersJson.data || []) as Supplier[],
    branches: (branchesJson.data || []) as Branch[],
    products,
    units: (unitsJson.data || []) as Unit[],
    lineDiscounts: (discountsJson.data || []) as LineDiscount[],
    connections: (connectionsJson.data || []) as ProductSupplier[],
    returnTypes: (returnTypesJson.data || []) as RTSReturnType[],
  };
}

/**
 * Fetches running inventory from the Spring Boot VOS API.
 * Uses the Repository to handle network integration.
 */
export async function fetchInventory(
  branchId: number,
  supplierId: number,
  token: string,
): Promise<InventoryRecord[]> {
  try {
    const allRows = await repo.getSpringInventory(branchId, supplierId, token);
    
    // Filter by branch and supplier using camelCase names (Standardized in Repo/Schema)
    const viewRows = allRows.filter((r) => 
      Number(r.branchId) === Number(branchId) && 
      Number(r.supplierId) === Number(supplierId)
    );

    if (viewRows.length === 0) return [];

    // Get prices and parents to calculate families
    const productIds = [...new Set(viewRows.map((r) => Number(r.productId)))];
    const productsJson = await repo.getRawProductsByIds(productIds);
    const productsData = productsJson.data || [];

    const parentMap = new Map<number, number>();
    const priceMap = new Map<number, number>();
    productsData.forEach((p: any) => {
      const pId = Number(p.product_id);
      const familyId = p.parent_id && p.parent_id !== 0 ? Number(p.parent_id) : pId;
      parentMap.set(pId, familyId);
      priceMap.set(pId, Number(p.cost_per_unit ?? 0));
    });

    const families = new Map<number, any[]>();
    viewRows.forEach((row) => {
      const pId = Number(row.productId);
      const familyId = parentMap.get(pId) || pId;
      if (!families.has(familyId)) families.set(familyId, []);
      families.get(familyId)!.push({ ...row, familyId });
    });

    const result: InventoryRecord[] = [];
    families.forEach((variants) => {
      // Sort by unitCount descending for remainder cascading
      variants.sort((a, b) => b.unitCount - a.unitCount);
      
      let remainderPieces = 0;
      variants.forEach((variant) => {
        const safeUnitCount = Math.max(variant.unitCount, 1);
        const stockValue = Number(variant.runningInventoryUnit || 0);
        
        const adjustedInventory = stockValue + (remainderPieces / safeUnitCount);
        const displayStock = Math.floor(adjustedInventory);
        remainderPieces = (adjustedInventory - displayStock) * safeUnitCount;

        result.push({
          id: variant.id,
          product_id: Number(variant.productId),
          product_code: variant.productCode || "N/A",
          product_name: variant.productName || "Unknown",
          unit_name: variant.unitName || "Unit",
          unit_count: safeUnitCount,
          branch_id: Number(variant.branchId),
          supplier_id: Number(variant.supplierId),
          running_inventory: displayStock,
          familyId: Number(variant.familyId),
          price: priceMap.get(Number(variant.productId)) ?? 0,
          product_barcode: variant.productBarcode ?? undefined,
        });
      });
    });

    return result;
  } catch (err: any) {
    console.error("[RTS] Service Inventory fetch error:", err);
    throw err;
  }
}

/**
 * Creates a new Return-to-Supplier transaction.
 */
export async function createTransaction(dto: CreateReturnDTO) {
  const { rts_items, ...header } = dto;
  const docNo = `RTS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

  const parentJson = await repo.createRtsHeader({ ...header, doc_no: docNo });
  const parentId = parentJson.data.id;

  for (const item of rts_items) {
    await repo.createRtsItem({ ...item, rts_id: parentId });
  }

  return parentJson.data;
}

/**
 * Updates an existing Return-to-Supplier transaction.
 * Cleans up old items before creating new ones.
 */
export async function updateTransaction(id: string, dto: CreateReturnDTO) {
  const { rts_items, ...header } = dto;
  
  // 1. Update header
  await repo.updateRtsHeader(id, header);

  // 2. Cleanup old items
  const { itemIds } = await repo.getExistingRelatedIds(id);
  
  if (itemIds.length > 0) {
    await repo.deleteRecords("rts_items", itemIds);
  }

  // 3. Create new items
  for (const item of rts_items) {
    await repo.createRtsItem({ ...item, rts_id: Number(id) });
  }
}
