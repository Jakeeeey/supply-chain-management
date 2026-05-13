import { fetchItems, createItems, updateItem, bulkUpdateItems } from "../../stock-transfer/services/api";
import type { 
  StockTransferSerialRow,
} from "../types/serialize.types";
import type { 
  StockTransferRow,
  ProductRow,
  OrderGroup,
} from "../../stock-transfer/types/stock-transfer.types";

/**
 * Fetches current serial availability from v_serial_onhand view.
 */
export async function fetchSerialAvailability(serialNumber: string, branchId?: number): Promise<StockTransferSerialRow[]> {
  const params: Record<string, string | number> = {
    "filter[serial_number][_eq]": serialNumber,
    limit: 1,
  };

  if (branchId) {
    params["filter[branch_id][_eq]"] = branchId;
  }

  // Assuming v_serial_onhand is exposed as a Directus collection/view
  const res = await fetchItems<StockTransferSerialRow>("items/v_serial_onhand", params);
  return res.data;
}

/**
 * Records serial tracking entries in the stock_transfer_serial table.
 */
export async function insertSerialTracking(entries: StockTransferSerialRow[]): Promise<void> {
  if (entries.length === 0) return;
  await createItems("items/stock_transfer_serial", entries);
}

/**
 * Fetches recorded serials for a set of stock transfer IDs.
 */
export async function fetchRecordedSerials(transferIds: number[]): Promise<StockTransferSerialRow[]> {
  if (transferIds.length === 0) return [];

  const res = await fetchItems<StockTransferSerialRow>("items/stock_transfer_serial", {
    "filter[stock_transfer_id][_in]": transferIds.join(","),
    limit: -1,
  });
  
  return res.data;
}

interface TransferUpdatePayload {
  id: number;
  status?: string;
  received_quantity?: number;
  date_encoded?: string;
  date_received?: string;
  receiver_id?: number;
}

/**
 * Updates status and other fields for a batch of transfers.
 */
export async function bulkUpdateTransfers(items: TransferUpdatePayload[]): Promise<void> {
  if (items.length === 0) return;

  // Group by update payload to use bulk PATCH
  const grouped: Record<string, number[]> = {};
  items.forEach((item) => {
    const { id, ...data } = item;
    const key = JSON.stringify(data);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(id);
  });

  await Promise.all(
    Object.entries(grouped).map(([dataJson, ids]) =>
      bulkUpdateItems("items/stock_transfer", ids, JSON.parse(dataJson))
    )
  );
}

/**
 * Fetches stock transfers grouped by order_no with pagination and search support.
 * This version paginates by unique order numbers to ensure the sidebar fills correctly.
 */
export async function fetchStockTransferGroups(params: {
  status: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: OrderGroup[]; hasMore: boolean }> {
  const { status, search, limit = 10, offset = 0 } = params;

  // 1. Fetch unique order numbers matching the criteria
  // We use a larger limit for the inner fetch if needed, but the primary goal 
  // is to get the set of order_nos for this 'page' of orders.
  const distinctQueryParams: Record<string, any> = {
    "filter[status][_in]": status,
    // "filter[source_branch][division_id][_eq]": 1,
    "fields": "order_no,date_encoded",
    "sort": "-date_encoded",
    "limit": -1, // We'll handle the unique slicing in JS for simplicity with Directus
  };

  if (search) {
    distinctQueryParams["_or"] = [
      { order_no: { _icontains: search } },
      { source_branch: { branch_name: { _icontains: search } } },
      { target_branch: { branch_name: { _icontains: search } } },
    ];
  }

  const distinctRes = await fetchItems<any>("items/stock_transfer", distinctQueryParams);
  const allRows = distinctRes.data || [];
  
  // Get unique order numbers in order of date_encoded
  const uniqueOrderNos: string[] = [];
  const seen = new Set<string>();
  for (const row of allRows) {
    if (!seen.has(row.order_no)) {
      seen.add(row.order_no);
      uniqueOrderNos.push(row.order_no);
    }
  }

  // Slice for the current page of GROUPS
  const pagedOrderNos = uniqueOrderNos.slice(offset, offset + limit);
  const hasMore = uniqueOrderNos.length > offset + limit;

  if (pagedOrderNos.length === 0) {
    return { data: [], hasMore: false };
  }

  // 2. Fetch full details for the specific order numbers on this page
  const detailsQueryParams: Record<string, any> = {
    "filter[order_no][_in]": pagedOrderNos.join(","),
    "limit": -1,
    "sort": "-date_encoded",
    "fields": "*,product_id.*,product_id.is_serialized,source_branch.*,target_branch.*",
  };

  const detailsRes = await fetchItems<StockTransferRow>("items/stock_transfer", detailsQueryParams);
  const rawData = detailsRes.data || [];

  // Use the helper to group the details
  const { groupByOrderNo } = await import("../../stock-transfer/services/stock-transfer.helpers");
  const groups = groupByOrderNo(rawData);

  // Sort groups to match the order of pagedOrderNos
  const sortedGroups = pagedOrderNos.map(no => groups.find(g => g.orderNo === no)).filter(Boolean) as OrderGroup[];

  return {
    data: sortedGroups,
    hasMore,
  };
}
