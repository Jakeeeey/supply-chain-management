// =============================================================================
// Return-to-Supplier — Server-Side Service Layer
// Pure TypeScript. No React. Runs in Next.js API Routes only.
// =============================================================================

import type {
  ReturnToSupplier,
  RTSItem,
  InventoryViewRow,
  InventoryRecord,
  RfidLookupResult,
  Product,
  Supplier,
  Branch,
  Unit,
  LineDiscount,
  ProductSupplier,
  RTSReturnType,
  ReferenceData,
  CreateReturnDTO,
} from "../types/rts.schema";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Builds authorized headers for Directus API requests.
 * Uses the server-side static token — never exposed to the browser.
 */
function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  };
}

/**
 * Makes a GET request to a Directus endpoint and returns parsed JSON.
 * @param endpoint - The Directus items path (e.g., "/items/return_to_supplier")
 * @throws Error with descriptive message on failure.
 */
async function directusGet<T = any>(endpoint: string): Promise<T> {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: getHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Directus GET failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Makes a POST/PATCH/DELETE request to a Directus endpoint.
 * @param endpoint - The Directus items path.
 * @param method - HTTP method.
 * @param body - Optional request body.
 */
async function directusMutate<T = any>(
  endpoint: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: getHeaders(),
    cache: "no-store",
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Directus ${method} failed (${res.status}): ${text}`);
  }
  // DELETE might return no body
  if (method === "DELETE") return {} as T;
  return res.json();
}

// =============================================================================
// 1. FETCH TRANSACTIONS (List View)
// =============================================================================

/**
 * Fetches all Return-to-Supplier transactions with calculated totals.
 * Uses a dual-fetch strategy: parent records + child items in parallel,
 * then calculates Gross, Discount, and Net amounts from the children.
 * @returns Array of mapped ReturnToSupplier records sorted by newest first.
 */
export async function fetchTransactions(): Promise<ReturnToSupplier[]> {
  const parentParams = new URLSearchParams({
    limit: "-1",
    sort: "-date_created",
    fields:
      "id,doc_no,transaction_date,is_posted,remarks,supplier_id.supplier_name,branch_id.branch_name,total_net_amount",
  });

  const childParams = new URLSearchParams({
    limit: "-1",
    fields: "rts_id,gross_amount,discount_amount,net_amount",
  });

  const [parentJson, childJson] = await Promise.all([
    directusGet<{ data: any[] }>(
      `/items/return_to_supplier?${parentParams}`,
    ),
    directusGet<{ data: any[] }>(`/items/rts_items?${childParams}`),
  ]);

  const parents = parentJson.data || [];
  const children = childJson.data || [];

  // Map children by parent ID for O(1) lookup
  const itemsMap = new Map<string, any[]>();
  children.forEach((item: any) => {
    const rawRtsId =
      typeof item.rts_id === "object" ? item.rts_id.id : item.rts_id;
    const pId = String(rawRtsId);
    if (!itemsMap.has(pId)) itemsMap.set(pId, []);
    itemsMap.get(pId)!.push(item);
  });

  return parents.map((r: any) => {
    const pId = String(r.id);
    const items = itemsMap.get(pId) || [];

    const calculatedGross = items.reduce(
      (sum: number, i: any) => sum + Number(i.gross_amount || 0),
      0,
    );
    const calculatedDiscount = items.reduce(
      (sum: number, i: any) => sum + Number(i.discount_amount || 0),
      0,
    );
    const calculatedNet = items.reduce(
      (sum: number, i: any) => sum + Number(i.net_amount || 0),
      0,
    );
    const finalNet =
      items.length > 0 ? calculatedNet : Number(r.total_net_amount || 0);

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

// =============================================================================
// 2. FETCH TRANSACTION DETAILS (Single Record Items)
// =============================================================================

/**
 * Fetches the line items for a specific RTS transaction.
 * @param id - The return_to_supplier record ID.
 * @returns Array of mapped RTSItem records.
 */
export async function fetchTransactionDetails(
  id: string,
): Promise<RTSItem[]> {
  const params = new URLSearchParams({
    "filter[rts_id][_eq]": id,
    fields:
      "id,quantity,gross_unit_price,discount_rate,discount_amount,net_amount,return_type_id,product_id.product_name,product_id.product_code,product_id.product_id,product_id.unit_of_measurement_count,uom_id.unit_shortcut,uom_id.unit_id",
  });

  const json = await directusGet<{ data: any[] }>(
    `/items/rts_items?${params}`,
  );

  const items = json.data || [];
  if (items.length === 0) return [];

  // Fetch RFIDs for these items
  const itemIds = items.map((i: any) => i.id);
  const rfidParams = new URLSearchParams({
    "filter[rts_item_id][_in]": itemIds.join(","),
    fields: "rts_item_id,rfid_tag",
  });
  const rfidJson = await directusGet<{ data: any[] }>(
    `/items/rts_item_rfid?${rfidParams}`,
  );
  const rfidMap = new Map<number, string>();
  (rfidJson.data || []).forEach((r: any) => {
    rfidMap.set(Number(r.rts_item_id), r.rfid_tag);
  });

  return items.map((i: any) => {
    const rawProductId =
      typeof i.product_id === "object"
        ? i.product_id.product_id
        : i.product_id;
    const rawUomId =
      typeof i.uom_id === "object" ? i.uom_id.unit_id : i.uom_id;
    const rawUnitCount =
      typeof i.product_id === "object"
        ? i.product_id.unit_of_measurement_count
        : 1;

    return {
      id: i.id,
      productId: Number(rawProductId),
      uomId: Number(rawUomId),
      code:
        typeof i.product_id === "object" ? i.product_id.product_code : "N/A",
      name:
        typeof i.product_id === "object"
          ? i.product_id.product_name
          : "Unknown",
      unit:
        typeof i.uom_id === "object" ? i.uom_id.unit_shortcut : "UNIT",
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

// =============================================================================
// 3. FETCH REFERENCES (Dropdowns & Lookup Data)
// =============================================================================

/**
 * Fetches all reference data needed for the Create/Edit return forms.
 * Parallel-fetches suppliers, branches, products, units, discounts,
 * product-supplier connections, and return types.
 * @returns A ReferenceData bundle with all lookup arrays.
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
    directusGet<{ data: any[] }>("/items/suppliers?limit=-1"),
    directusGet<{ data: any[] }>("/items/branches?limit=-1"),
    directusGet<{ data: any[] }>(
      "/items/products?limit=-1&fields=product_id,product_name,description,product_code,parent_id,unit_of_measurement,unit_of_measurement_count,cost_per_unit",
    ),
    directusGet<{ data: any[] }>("/items/units?limit=-1&fields=unit_id,unit_name,unit_shortcut,order"),
    directusGet<{ data: any[] }>("/items/line_discount?limit=-1"),
    directusGet<{ data: any[] }>(
      "/items/product_per_supplier?limit=-1&fields=id,product_id,supplier_id,discount_type",
    ),
    directusGet<{ data: any[] }>("/items/rts_return_type?limit=-1"),
  ]);

  // Build unit name lookup
  const unitMap = new Map<string, string>();
  (unitsJson.data || []).forEach((u: any) => {
    unitMap.set(String(u.unit_id), u.unit_name);
  });

  // Map products to frontend shape
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

// =============================================================================
// 4. FETCH INVENTORY (v_running_inventory_by_unit + Remainder Cascade)
// =============================================================================



/**
 * Fetches running inventory from the Spring Boot v_running_inventory_by_unit
 * view endpoint, then applies a "remainder cascade" to handle fractional stock.
 *
 * Logic: Products in the same family (sharing a parent_id) are sorted by
 * unitCount descending. Each variant gets floor(inventory). The fractional
 * remainder is converted to pieces and cascaded to the next smaller variant.
 *
 * @param branchId - The branch to filter by.
 * @param supplierId - The supplier to filter by.
 * @param token - JWT access token for Spring Boot authentication.
 * @returns Display-ready InventoryRecord array with floored stock values.
 */
export async function fetchInventory(
  branchId: number,
  supplierId: number,
  token: string,
): Promise<InventoryRecord[]> {
  const SPRING_URL = process.env.SPRING_API_BASE_URL;
  if (!SPRING_URL) {
    throw new Error("SPRING_API_BASE_URL is not defined in environment variables");
  }

  // 1. Fetch ALL inventory from Spring Boot view endpoint
  const now = new Date();
  const startDate = `${now.getFullYear()}-01-01`;
  const endDate = `${now.getFullYear()}-12-31`;

  const targetUrl = `${SPRING_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=${startDate}&endDate=${endDate}`;

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

  // 2. Filter by branchId AND supplierId
  const viewRows = allRows.filter(
    (row) => row.branchId === branchId && row.supplierId === supplierId,
  );

  if (viewRows.length === 0) return [];

  // 3. Fetch product parent_id + cost_per_unit from Directus for family grouping & pricing
  const productIds = [...new Set(viewRows.map((r) => r.productId))];
  const productFilter = JSON.stringify({
    product_id: { _in: productIds },
  });
  const productsJson = await directusGet<{ data: any[] }>(
    `/items/products?limit=-1&fields=product_id,parent_id,cost_per_unit&filter=${encodeURIComponent(productFilter)}`,
  );
  const productsData = productsJson.data || [];

  // Build lookup maps
  const parentMap = new Map<number, number>(); // productId -> familyId
  const priceMap = new Map<number, number>(); // productId -> cost_per_unit

  productsData.forEach((p: any) => {
    const familyId =
      p.parent_id && p.parent_id !== 0 ? p.parent_id : p.product_id;
    parentMap.set(p.product_id, familyId);
    priceMap.set(p.product_id, Number(p.cost_per_unit ?? 0));
  });

  // 4. Group by family
  const families = new Map<number, (InventoryViewRow & { familyId: number })[]>();

  viewRows.forEach((row) => {
    const familyId = parentMap.get(row.productId) || row.productId;
    if (!families.has(familyId)) families.set(familyId, []);
    families.get(familyId)!.push({ ...row, familyId });
  });

  // 5. Apply remainder cascade per family
  const result: InventoryRecord[] = [];

  families.forEach((variants) => {
    // Sort by unitCount descending (largest unit first)
    variants.sort((a, b) => b.unitCount - a.unitCount);

    let remainderPieces = 0;

    variants.forEach((variant) => {
      const safeUnitCount = Math.max(variant.unitCount, 1);

      // Add remainder pieces from the previous (larger) unit
      const adjustedInventory =
        variant.runningInventoryUnit + remainderPieces / safeUnitCount;

      // Floor for display
      const displayStock = Math.floor(adjustedInventory);

      // Calculate new remainder in pieces
      remainderPieces = (adjustedInventory - displayStock) * safeUnitCount;

      result.push({
        id: variant.id,
        product_id: variant.productId,
        product_code: variant.productCode,
        product_name: variant.productName,
        unit_name: variant.unitName,
        unit_count: safeUnitCount,
        branch_id: variant.branchId,
        supplier_id: variant.supplierId,
        running_inventory: displayStock,
        familyId: variant.familyId,
        price: priceMap.get(variant.productId) ?? 0,
      });
    });
  });

  return result;
}

// =============================================================================
// 5. RFID LOOKUP (v_rfid_onhand via Spring Boot)
// =============================================================================

/**
 * Looks up an RFID tag to find the associated product.
 * Calls the Spring Boot v_rfid_onhand endpoint.
 * @param rfidTag - The scanned RFID tag string.
 * @param branchId - The branch to filter by.
 * @param token - JWT access token for Spring Boot authentication.
 * @returns The productId, or null if the tag is not on-hand.
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

// =============================================================================
// 6. CREATE TRANSACTION
// =============================================================================

/**
 * Creates a new Return-to-Supplier transaction with line items.
 * Generates a document number, creates the parent record, then bulk-creates
 * child items and patches the parent with the calculated total.
 * @param dto - The validated CreateReturnDTO payload.
 * @returns The created parent record's data.
 */
export async function createTransaction(dto: CreateReturnDTO) {
  const { rts_items, ...header } = dto;

  // Generate document number
  const docNo = `RTS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

  // Create parent record
  const parentJson = await directusMutate<{ data: { id: number } }>(
    "/items/return_to_supplier",
    "POST",
    { ...header, doc_no: docNo },
  );
  const parentId = parentJson.data.id;

  // Create child items sequentially to get IDs for RFID linking
  for (const item of rts_items) {
    const { rfid_tag, ...itemData } = item;
    const itemJson = await directusMutate<{ data: { id: number } }>(
      "/items/rts_items",
      "POST",
      { ...itemData, rts_id: parentId },
    );

    // If this item has an RFID tag, create the rts_item_rfid record
    if (rfid_tag) {
      await directusMutate("/items/rts_item_rfid", "POST", {
        rts_item_id: itemJson.data.id,
        rfid_tag: rfid_tag,
        status: "SCANNED",
      });
    }
  }

  // Patch parent with total net amount
  const totalNet = rts_items.reduce((s, i) => s + i.net_amount, 0);
  await directusMutate(`/items/return_to_supplier/${parentId}`, "PATCH", {
    total_net_amount: totalNet,
  });

  return parentJson.data;
}

// =============================================================================
// 6. UPDATE TRANSACTION
// =============================================================================

/**
 * Updates an existing Return-to-Supplier transaction.
 * Patches the parent header, deletes all existing items, then re-creates
 * the items from the new payload.
 * @param id - The return_to_supplier record ID.
 * @param dto - The validated CreateReturnDTO payload.
 */
export async function updateTransaction(
  id: string,
  dto: CreateReturnDTO,
) {
  const { rts_items, ...header } = dto;

  // Patch parent header
  await directusMutate(`/items/return_to_supplier/${id}`, "PATCH", header);

  // Delete existing items (cascade deletes rts_item_rfid via FK constraint)
  const existingItems = await fetchTransactionDetails(id);
  if (existingItems.length > 0) {
    await Promise.all(
      existingItems.map((i) =>
        directusMutate(`/items/rts_items/${i.id}`, "DELETE"),
      ),
    );
  }

  // Recreate items with RFID linking
  for (const item of rts_items) {
    const { rfid_tag, ...itemData } = item;
    const itemJson = await directusMutate<{ data: { id: number } }>(
      "/items/rts_items",
      "POST",
      { ...itemData, rts_id: Number(id) },
    );

    if (rfid_tag) {
      await directusMutate("/items/rts_item_rfid", "POST", {
        rts_item_id: itemJson.data.id,
        rfid_tag: rfid_tag,
        status: "SCANNED",
      });
    }
  }

  // Patch parent with total net amount
  const totalNet = rts_items.reduce((s, i) => s + i.net_amount, 0);
  await directusMutate(`/items/return_to_supplier/${id}`, "PATCH", {
    total_net_amount: totalNet,
  });
}
