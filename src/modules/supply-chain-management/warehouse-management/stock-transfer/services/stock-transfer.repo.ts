import { fetchItems, createItems, updateItem, bulkUpdateItems } from "./api";
import { getCached, setCache } from "../../../transfers/stock-conversion/utils/cache";
import type { 
  BranchRow, 
  StockTransferRow, 
  StockTransferRfidRow, 
  ProductRow,
  StockTransferInsertPayload
} from "../types/stock-transfer.types";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

/**
 * Fetches stock transfer rows from Directus with relational expansion.
 */
export async function fetchStockTransfers(status?: string): Promise<StockTransferRow[]> {
  const params: Record<string, unknown> = {
    fields: [
      "*",
      "product_id.product_id",
      "product_id.product_name",
      "product_id.description",
      "product_id.barcode",
      "product_id.product_code",
      "product_id.cost_per_unit",
      "product_id.price_per_unit",
      "product_id.unit_of_measurement.unit_id",
      "product_id.unit_of_measurement.unit_name",
      "product_id.unit_of_measurement_count",
      "product_id.product_brand.brand_id",
      "product_id.product_brand.brand_name",
      "product_id.product_category.category_id",
      "product_id.product_category.category_name",
      "product_id.product_per_supplier.supplier_id.supplier_shortcut",
    ].join(","),
    limit: -1,
  };

  if (status) {
    params["filter[status][_in]"] = status;
  }

  const res = await fetchItems<StockTransferRow>("items/stock_transfer", params);
  return res.data;
}

/**
 * Fetches all active branches.
 */
export async function fetchBranches(): Promise<BranchRow[]> {
  const res = await fetchItems<BranchRow>("items/branches", {
    limit: -1,
  });
  return res.data;
}

/**
 * Fetches RFID tracking records for a set of stock transfer IDs.
 */
export async function fetchDispatchedRfids(transferIds: number[]): Promise<StockTransferRfidRow[]> {
  if (transferIds.length === 0) return [];
  
  const CHUNK_SIZE = 100;
  const allRfids: StockTransferRfidRow[] = [];

  for (let i = 0; i < transferIds.length; i += CHUNK_SIZE) {
    const chunk = transferIds.slice(i, i + CHUNK_SIZE);
    const res = await fetchItems<StockTransferRfidRow>("items/stock_transfer_rfid", {
      "filter[stock_transfer_id][_in]": chunk.join(","),
      limit: -1,
    });
    allRfids.push(...res.data);
  }

  return allRfids;
}

/**
 * Fetches products for the transfer request view, including relational fields.
 */
export async function fetchProducts(search?: string, limit: number = 100, offset: number = 0): Promise<ProductRow[]> {
  const params: Record<string, unknown> = {
    fields: [
      "product_id",
      "product_name",
      "description",
      "barcode",
      "product_code",
      "cost_per_unit",
      "price_per_unit",
      "unit_of_measurement.unit_id",
      "unit_of_measurement.unit_name",
      "unit_of_measurement_count",
      "product_brand.brand_id",
      "product_brand.brand_name",
      "product_category.category_id",
      "product_category.category_name",
      "product_per_supplier.supplier_id.supplier_shortcut",
    ].join(","),
    limit,
    offset,
  };

  if (search) {
    params["filter[_or][0][product_name][_icontains]"] = search;
    params["filter[_or][1][product_code][_icontains]"] = search;
    params["filter[_or][2][barcode][_icontains]"] = search;
  }

  const res = await fetchItems<ProductRow>("items/products", params);
  return res.data;
}

/**
 * Fetches a single product by its ID with full details.
 */
export async function fetchProductById(id: number): Promise<ProductRow | null> {
  const params: Record<string, unknown> = {
    fields: [
      "product_id",
      "product_name",
      "description",
      "barcode",
      "product_code",
      "cost_per_unit",
      "price_per_unit",
      "unit_of_measurement.unit_id",
      "unit_of_measurement.unit_name",
      "unit_of_measurement_count",
      "product_brand.brand_id",
      "product_brand.brand_name",
      "product_category.category_id",
      "product_category.category_name",
      "product_per_supplier.supplier_id.supplier_shortcut",
    ].join(","),
    limit: 1,
  };

  const res = await fetchItems<ProductRow>(`items/products/${id}`, params);
  
  // Directus returns a single object if ID is provided in path, but if we used filter it would be an array.
  // Our fetchItems likely expects data to be an array or object based on internal implementation.
  // Let's assume it handles single record fetch correctly based on the common pattern.
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) as ProductRow : null;
}

/**
 * Fetches real-time inventory from the Spring Boot API.
 * Cached for 60 seconds per branch to prevent redundant slow calls.
 */
export async function fetchBranchInventory(branchId: number, token?: string, bypassCache: boolean = false): Promise<Record<string, unknown>[]> {
  if (!SPRING_API_BASE_URL) return [];

  // Check cache first
  const CACHE_KEY = `st_inventory_${branchId}`;
  const TTL = 60 * 1000; // 60 seconds
  if (!bypassCache) {
    const cached = getCached<Record<string, unknown>[]>(CACHE_KEY);
    if (cached) {
      console.log(`[Stock Transfer Repo] Inventory cache HIT for branch ${branchId}`);
      return cached;
    }
  }

  const url = `${SPRING_API_BASE_URL}/api/view-rfid-onhand?branch_id=${branchId}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = await res.json();
    const result = Array.isArray(data) ? data : (data.data || []);
    
    setCache(CACHE_KEY, result, TTL);
    return result;
  } catch (err) {
    console.error("[Stock Transfer Repo] Spring Inventory Fetch Failed:", err);
    return [];
  }
}

/**
 * Batch creates stock transfer records.
 */
export async function createStockTransfers(payloads: StockTransferInsertPayload[]): Promise<StockTransferRow[]> {
  const res = await createItems<StockTransferRow[]>("items/stock_transfer", payloads);
  return res.data;
}

/**
 * Updates status and allocated quantity for a batch of items.
 */
export async function updateTransfersStatus(items: { id: number; status: string; allocated_quantity?: number }[]): Promise<void> {
  if (items.length === 0) return;

  // Group items by their update payload shape so we can batch them
  const grouped: Record<string, number[]> = {};
  items.forEach((item) => {
    const key = JSON.stringify({
      status: item.status,
      ...(item.allocated_quantity !== undefined ? { allocated_quantity: item.allocated_quantity } : {}),
    });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item.id);
  });

  // Execute one bulk PATCH per unique payload shape
  await Promise.all(
    Object.entries(grouped).map(([dataJson, ids]) =>
      bulkUpdateItems("items/stock_transfer", ids, JSON.parse(dataJson) as Record<string, unknown>)
    )
  );
}

/**
 * Updates a single stock transfer record.
 */
export async function updateTransfer(id: number, data: Partial<StockTransferRow>): Promise<void> {
  await updateItem("items/stock_transfer", id, data);
}

/**
 * Records RFID scan events in the tracking table.
 */
export async function insertRfidTracking(entries: { stock_transfer_id: number; rfid_tag: string; scan_type: string }[]): Promise<void> {
  if (entries.length === 0) return;
  await createItems("items/stock_transfer_rfid", entries);
}

/**
 * Fetches stock transfers filtered by specific IDs.
 * Avoids fetching the entire table when only a subset is needed.
 */
export async function fetchStockTransfersByIds(ids: number[]): Promise<StockTransferRow[]> {
  if (ids.length === 0) return [];

  const CHUNK_SIZE = 100;
  const allRows: StockTransferRow[] = [];

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const res = await fetchItems<StockTransferRow>("items/stock_transfer", {
      "filter[id][_in]": chunk.join(","),
      fields: "*,product_id.product_id,product_id.product_name",
      limit: -1,
    });
    allRows.push(...res.data);
  }

  return allRows;
}

/**
 * Fallback for RFID lookup using Directus receiving records when Spring Boot is unavailable.
 */
export async function fallbackRfidLookup(rfid: string): Promise<ProductRow | null> {
  interface DirectusRfidRecord {
    product_id?: ProductRow;
    stock_adjustment_id?: { product_id?: ProductRow };
  }

  // 1. Check Receiving records
  const receivingRes = await fetchItems<DirectusRfidRecord>("items/purchase_order_receiving_items", {
    "filter[rfid_tag][_eq]": rfid,
    fields: "product_id.*",
    limit: 1,
  });
  if (receivingRes.data?.[0]?.product_id) return receivingRes.data[0].product_id as ProductRow;

  // 2. Check Stock Adjustment records (from conversions)
  const adjustmentRes = await fetchItems<DirectusRfidRecord>("items/stock_adjustment_rfid", {
    "filter[rfid_tag][_eq]": rfid,
    fields: "stock_adjustment_id.product_id.*",
    limit: 1,
  });
  if (adjustmentRes.data?.[0]?.stock_adjustment_id?.product_id) {
    return adjustmentRes.data[0].stock_adjustment_id.product_id as ProductRow;
  }

  return null;
}
