import { fetchItems, createItems, updateItem, bulkUpdateItems } from "../../stock-transfer/services/api";
import type { 
  StockTransferSerialRow,
} from "../types/serialize.types";
import type { 
  StockTransferRow,
  ProductRow 
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
