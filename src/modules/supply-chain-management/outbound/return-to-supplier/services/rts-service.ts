// =============================================================================
// Return-to-Supplier — Core Service Logic
// =============================================================================
import { getDirectusBase, directusFetch } from "@/lib/directus";
import type { 
  ReturnToSupplier, 
  RTSItem, 
  ReferenceData, 
  Product, 
  Unit, 
  LineDiscount, 
  ProductSupplier, 
  RTSReturnType,
  InventoryViewRow,
  InventoryRecord,
  RfidLookupResult,
  Supplier,
  Branch,
  CreateReturnDTO
} from "../types/rts.schema";

/** Helper for Directus GET requests */
async function directusGetHelper<T>(path: string): Promise<T> {
  const base = getDirectusBase();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  return directusFetch(url, { method: "GET" });
}

/** Helper for Directus POST/PATCH/DELETE requests */
async function directusMutateHelper<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: any): Promise<T> {
  const base = getDirectusBase();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  
  const options: RequestInit = { method };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return directusFetch(url, options);
}

/**
 * Fetches all Return-to-Supplier transactions for the dashboard list.
 */
export async function fetchTransactions(): Promise<ReturnToSupplier[]> {
  const json = await directusGetHelper<{ data: any[] }>(
    "/items/return_to_supplier?limit=-1&fields=id,doc_no,transaction_date,is_posted,remarks,supplier_id.supplier_name,branch_id.branch_name&sort=-date_created"
  );

  const records = json.data || [];
  if (records.length === 0) return [];

  const itemsJson = await directusGetHelper<{ data: any[] }>(
    "/items/rts_items?limit=-1&fields=rts_id,net_amount,gross_amount,discount_amount"
  );
  const allItems = itemsJson.data || [];

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
  const params = new URLSearchParams({
    "filter[rts_id][_eq]": id,
    fields:
      "id,quantity,gross_unit_price,discount_rate,discount_amount,net_amount,return_type_id,product_id.product_name,product_id.product_code,product_id.product_id,product_id.unit_of_measurement_count,uom_id.unit_shortcut,uom_id.unit_id",
  });

  const json = await directusGetHelper<{ data: any[] }>(
    `/items/rts_items?${params}`,
  );

  const items = json.data || [];
  if (items.length === 0) return [];

  const itemIds = items.map((i: any) => i.id);
  const rfidParams = new URLSearchParams({
    "filter[rts_item_id][_in]": itemIds.join(","),
    fields: "rts_item_id,rfid_tag",
  });
  const rfidJson = await directusGetHelper<{ data: any[] }>(
    `/items/rts_item_rfid?${rfidParams}`,
  );
  const rfidMap = new Map<number, string>();
  (rfidJson.data || []).forEach((r: any) => {
    rfidMap.set(Number(r.rts_item_id), r.rfid_tag);
  });

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
      discountRate: Number(i.discount_rate),
      discountAmount: Number(i.discount_amount),
      total: Number(i.net_amount),
      unitCount: Number(rawUnitCount) > 0 ? Number(rawUnitCount) : 1,
      returnTypeId: i.return_type_id ? Number(i.return_type_id) : undefined,
      rfid_tag: rfidMap.get(i.id),
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
  ] = await Promise.all([
    directusGetHelper<{ data: any[] }>("/items/suppliers?limit=-1&filter[supplier_type][_eq]=Trade"),
    directusGetHelper<{ data: any[] }>("/items/branches?limit=-1"),
    directusGetHelper<{ data: any[] }>(
      "/items/products?limit=-1&fields=product_id,product_name,description,product_code,parent_id,unit_of_measurement,unit_of_measurement_count,cost_per_unit",
    ),
    directusGetHelper<{ data: any[] }>("/items/units?limit=-1&fields=unit_id,unit_name,unit_shortcut,order"),
    directusGetHelper<{ data: any[] }>("/items/line_discount?limit=-1"),
    directusGetHelper<{ data: any[] }>(
      "/items/product_per_supplier?limit=-1&fields=id,product_id,supplier_id,discount_type",
    ),
    directusGetHelper<{ data: any[] }>("/items/rts_return_type?limit=-1"),
  ]);

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

export async function fetchInventory(
  branchId: number,
  supplierId: number,
  token: string,
): Promise<InventoryRecord[]> {
  const SPRING_URL = process.env.SPRING_API_BASE_URL;
  if (!SPRING_URL) {
    throw new Error("SPRING_API_BASE_URL is not defined");
  }

  const startDate = "2000-01-01";
  const endDate = "2099-12-31";
  const targetUrl = `${SPRING_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=${startDate}&endDate=${endDate}`;

  try {
    const springRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!springRes.ok) {
       const text = await springRes.text().catch(() => `HTTP ${springRes.status}`);
       throw new Error(`Spring Boot inventory fetch failed (${springRes.status}): ${text}`);
    }

    const allRows: InventoryViewRow[] = await springRes.json();
    
    // Filter by branch and supplier using camelCase names
    const viewRows = allRows.filter((r) => 
      Number(r.branchId) === Number(branchId) && 
      Number(r.supplierId) === Number(supplierId)
    );

    if (viewRows.length === 0) return [];

    // Process real data
    const productIds = [...new Set(viewRows.map((r) => Number(r.productId)))];
    const productFilter = JSON.stringify({ product_id: { _in: productIds } });
    const productsJson = await directusGetHelper<{ data: any[] }>(
      `/items/products?limit=-1&fields=product_id,parent_id,cost_per_unit&filter=${encodeURIComponent(productFilter)}`,
    );
    const productsData = productsJson.data || [];

    const parentMap = new Map<number, number>();
    const priceMap = new Map<number, number>();
    productsData.forEach((p: any) => {
      const pId = Number(p.product_id);
      const familyId = p.parent_id && p.parent_id !== 0 ? Number(p.parent_id) : pId;
      parentMap.set(pId, familyId);
      priceMap.set(pId, Number(p.cost_per_unit ?? 0));
    });

    const families = new Map<number, (InventoryViewRow & { familyId: number })[]>();
    viewRows.forEach((row) => {
      const pId = Number(row.productId);
      const familyId = parentMap.get(pId) || pId;
      if (!families.has(familyId)) families.set(familyId, []);
      families.get(familyId)!.push({ ...row, familyId });
    });

    const result: InventoryRecord[] = [];
    families.forEach((variants) => {
      // Sort by unitCount descending
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
        });
      });
    });

    return result;
  } catch (err: any) {
    console.error("[RTS] Inventory fetch error:", err);
    throw err;
  }
}

/**
 * Looks up an RFID tag to find the associated product.
 */
export async function lookupRfid(
  rfidTag: string,
  branchId: number,
  token: string,
): Promise<RfidLookupResult | null> {
  const SPRING_URL = process.env.SPRING_API_BASE_URL;
  if (!SPRING_URL) {
    throw new Error("SPRING_API_BASE_URL is not defined");
  }

  const targetUrl = `${SPRING_URL.replace(/\/$/, "")}/api/view-rfid-onhand?rfid=${encodeURIComponent(rfidTag)}&branchId=${branchId}`;

  const springRes = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!springRes.ok) {
    const text = await springRes.text().catch(() => `HTTP ${springRes.status}`);
    throw new Error(`RFID lookup failed (${springRes.status}): ${text}`);
  }

  const results: RfidLookupResult[] = await springRes.json();
  return results.length > 0 ? results[0] : null;
}

/**
 * Creates a new Return-to-Supplier transaction.
 */
export async function createTransaction(dto: CreateReturnDTO) {
  const { rts_items, ...header } = dto;
  const docNo = `RTS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

  const parentJson = await directusMutateHelper<{ data: { id: number } }>(
    "/items/return_to_supplier",
    "POST",
    { ...header, doc_no: docNo },
  );
  const parentId = parentJson.data.id;

  for (const item of rts_items) {
    const { rfid_tag, ...itemData } = item;
    const res = await directusMutateHelper<{ data: { id: number } }>(
      "/items/rts_items",
      "POST",
      { ...itemData, rts_id: parentId }
    );
    
    if (rfid_tag) {
      await directusMutateHelper(
        "/items/rts_item_rfid",
        "POST",
        {
          rts_item_id: res.data.id,
          rfid_tag: rfid_tag,
          status: "RETURNED"
        }
      );
    }
  }

  return parentJson.data;
}

/**
 * Updates an existing Return-to-Supplier transaction.
 */
export async function updateTransaction(id: string, dto: CreateReturnDTO) {
  const { rts_items, ...header } = dto;
  await directusMutateHelper(`/items/return_to_supplier/${id}`, "PATCH", header);

  const existingItemsJson = await directusGetHelper<{ data: any[] }>(
    `/items/rts_items?filter[rts_id][_eq] ${id}\u0026fields=id`
  );
  const existingIds = (existingItemsJson.data || []).map((i) => i.id);

  if (existingIds.length > 0) {
    const rfidJson = await directusGetHelper<{ data: any[] }>(
      `/items/rts_item_rfid?filter[rts_item_id][_in]=${existingIds.join(",")}\u0026fields=id`
    );
    const rfidIds = (rfidJson.data || []).map((r) => r.id);
    if (rfidIds.length > 0) {
      await directusMutateHelper("/items/rts_item_rfid", "DELETE", rfidIds);
    }
    await directusMutateHelper("/items/rts_items", "DELETE", existingIds);
  }

  for (const item of rts_items) {
    const { rfid_tag, ...itemData } = item;
    const res = await directusMutateHelper<{ data: { id: number } }>(
      "/items/rts_items",
      "POST",
      { ...itemData, rts_id: Number(id) }
    );

    if (rfid_tag) {
      await directusMutateHelper("/items/rts_item_rfid", "POST", {
        rts_item_id: res.data.id,
        rfid_tag: rfid_tag,
        status: "RETURNED"
      });
    }
  }
}
