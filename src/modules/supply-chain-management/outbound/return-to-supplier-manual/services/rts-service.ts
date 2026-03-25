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

interface RawHeader {
  id: number;
  doc_no?: string;
  transaction_date?: string;
  is_posted?: boolean;
  remarks?: string;
  supplier_id?: { supplier_name: string };
  branch_id?: { branch_name: string };
}

interface RawItem {
  id: number;
  product_id?: { id: number; product_id: number; product_code: string; product_name: string; unit_of_measurement_count: number } | number | null;
  uom_id?: { id: number; unit_id: number; unit_shortcut: string } | number | null;
  quantity?: number;
  unit_price?: number;
  gross_unit_price?: number;
  discount_rate?: number;
  discount_type?: number;
  discount_amount?: number;
  net_amount?: number;
  gross_amount?: number;
  return_type_id?: number;
  rts_id?: { id: number } | number | null;
}

interface RawProduct {
  product_id: string | number;
  product_code?: string;
  product_name?: string;
  description?: string;
  unit_price?: number;
  cost_per_unit?: number;
  unit_of_measurement?: string | number;
  unit_of_measurement_count?: number;
  parent_id?: number | null;
}

interface RawInventoryVariant {
  id: string;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  unitCount: number;
  branchId: number;
  supplierId: number;
  runningInventoryUnit: number;
  familyId: number;
  productBarcode: string | null;
}

/**
 * Fetches all Return-to-Supplier transactions for the dashboard list.
 */
export async function fetchTransactions(): Promise<ReturnToSupplier[]> {
  const [headerRes, itemsRes] = await Promise.all([
    repo.getRawRtsHeaders(),
    repo.getRawRtsAllItems()
  ]);

  const records = (headerRes.data || []) as unknown as RawHeader[];
  if (records.length === 0) return [];

  const allItems = (itemsRes.data || []) as unknown as RawItem[];

  return records.map((r) => {
    const parentItems = allItems.filter((i) => {
      const rts_id_val = typeof i.rts_id === 'object' ? i.rts_id?.id : i.rts_id;
      return rts_id_val === r.id;
    });
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
    } as ReturnToSupplier;
  });
}

/**
 * Fetches the line items for a specific RTS transaction.
 */
export async function fetchTransactionDetails(
  id: string,
): Promise<RTSItem[]> {
  const itemsJson = await repo.getRawItemsByRtsId(id);
  const items = (itemsJson.data || []) as unknown as RawItem[];
  if (items.length === 0) return [];

  return items.map((i) => {
    const p_obj = typeof i.product_id === "object" ? i.product_id : null;
    const u_obj = typeof i.uom_id === "object" ? i.uom_id : null;
    const rawProductId = p_obj ? p_obj.product_id : i.product_id;
    const rawUomId = u_obj ? u_obj.unit_id : i.uom_id;
    const rawUnitCount = p_obj ? p_obj.unit_of_measurement_count : 1;

    return {
      id: i.id,
      productId: Number(rawProductId),
      uomId: Number(rawUomId),
      code: p_obj?.product_code || "N/A",
      name: p_obj?.product_name || "Unknown",
      unit: u_obj?.unit_shortcut || "UNIT",
      quantity: Number(i.quantity || 0),
      price: Number(i.gross_unit_price || 0),
      discountRate: Number(i.discount_rate || 0) / 100,
      discountAmount: Number(i.discount_amount || 0),
      total: Number(i.net_amount || 0),
      unitCount: Number(rawUnitCount) > 0 ? Number(rawUnitCount) : 1,
      returnTypeId: i.return_type_id ? Number(i.return_type_id) : undefined,
    } as RTSItem;
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
  (unitsJson.data || []).forEach((u) => {
    const raw = u as unknown as { unit_id: number; unit_name: string };
    unitMap.set(String(raw.unit_id), raw.unit_name);
  });

  const products: Product[] = (productsJson.data || []).map((p) => {
    const raw = p as unknown as RawProduct;
    return {
      id: String(raw.product_id),
      code: raw.product_code || "N/A",
      name: raw.description || raw.product_name || "Unknown",
      price: Number(raw.cost_per_unit ?? 0),
      unit: unitMap.get(String(raw.unit_of_measurement)) || "Units",
      uom_id: Number(raw.unit_of_measurement || 0),
      unitCount: Number(raw.unit_of_measurement_count || 1),
      parentId: raw.parent_id && raw.parent_id !== 0 ? raw.parent_id : null,
    } as Product;
  });

  return {
    suppliers: (suppliersJson.data || []) as unknown as Supplier[],
    branches: (branchesJson.data || []) as unknown as Branch[],
    products,
    units: (unitsJson.data || []) as unknown as Unit[],
    lineDiscounts: (discountsJson.data || []) as unknown as LineDiscount[],
    connections: (connectionsJson.data || []) as unknown as ProductSupplier[],
    returnTypes: (returnTypesJson.data || []) as unknown as RTSReturnType[],
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
    const rawViewRows = allRows.filter((r: any) => 
      Number(r.branchId) === Number(branchId) && 
      Number(r.supplierId) === Number(supplierId)
    );

    if (rawViewRows.length === 0) return [];

    // Aggregate inventory by productId to prevent duplicate batches in UI
    const aggregatedRowsMap = new Map<number, any>();
    rawViewRows.forEach((r: any) => {
      const pId = Number(r.productId);
      if (aggregatedRowsMap.has(pId)) {
        const existing = aggregatedRowsMap.get(pId);
        existing.runningInventoryUnit = Number(existing.runningInventoryUnit || 0) + Number(r.runningInventoryUnit || 0);
      } else {
        aggregatedRowsMap.set(pId, { ...r, runningInventoryUnit: Number(r.runningInventoryUnit || 0) });
      }
    });

    const viewRows = Array.from(aggregatedRowsMap.values());

    // Get prices and parents to calculate families
    const productIds = [...new Set(viewRows.map((r) => Number(r.productId)))];
    const productsJson = await repo.getRawProductsByIds(productIds);
    const productsData = (productsJson.data || []) as unknown as RawProduct[];

    const parentMap = new Map<number, number>();
    const priceMap = new Map<number, number>();
    productsData.forEach((p) => {
      const pId = Number(p.product_id);
      const familyId = p.parent_id && p.parent_id !== 0 ? Number(p.parent_id) : pId;
      parentMap.set(pId, familyId);
      priceMap.set(pId, Number(p.cost_per_unit ?? 0));
    });

    const families = new Map<number, unknown[]>();
    viewRows.forEach((row) => {
      const pId = Number(row.productId);
      const familyId = parentMap.get(pId) || pId;
      if (!families.has(familyId)) families.set(familyId, []);
      families.get(familyId)!.push(row);
    });

    const result: InventoryRecord[] = [];
    families.forEach((variants, familyId) => {
      // Sort by unitCount descending for remainder cascading
      const castVariants = variants as RawInventoryVariant[];
      castVariants.sort((a, b) => b.unitCount - a.unitCount);
      
      let remainderPieces = 0;
      castVariants.forEach((variant) => {
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
          familyId: Number(familyId),
          price: priceMap.get(Number(variant.productId)) ?? 0,
          product_barcode: variant.productBarcode ?? undefined,
        });
      });
    });

    return result;
  } catch (err: unknown) {
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
