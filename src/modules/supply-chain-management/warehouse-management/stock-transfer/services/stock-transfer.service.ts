import * as repo from "./stock-transfer.repo";
import * as helpers from "./stock-transfer.helpers";
import type { 
  StockTransferRow, 
  EnrichedProduct,
  CreateTransferPayload,
  UpdateTransferPayload,
  StockTransferInsertPayload
} from "../types/stock-transfer.types";
import { CreateStockTransferSchema, UpdateStockTransferSchema } from "../types/stock-transfer.schema";

/**
 * Service to orchestrate stock transfer business logic.
 * Higher-level than the repo; used by the API route handlers.
 */

/**
 * Fetches transfers by status and enriches them with dispatched RFID data.
 */
export async function getEnrichedTransfers(status?: string): Promise<StockTransferRow[]> {
  const transfers = await repo.fetchStockTransfers(status);
  
  if (transfers.length === 0) return [];

  // Fetch all RFIDs for these transfers to attach 'dispatched_rfids'
  const transferIds = transfers.map(t => t.id);
  const rfidRecords = await repo.fetchDispatchedRfids(transferIds);

  // Group RFIDs by transfer_id
  const rfidMap: Record<number, string[]> = {};
  rfidRecords.forEach(r => {
    if (!rfidMap[r.stock_transfer_id]) rfidMap[r.stock_transfer_id] = [];
    rfidMap[r.stock_transfer_id].push(r.rfid_tag);
  });

  // Attach RFIDs to each row
  return transfers.map(t => ({
    ...t,
    dispatched_rfids: rfidMap[t.id] || []
  }));
}

/**
 * Fetches products and enriches them with branch-specific inventory quantities.
 */
export async function getEnrichedProducts(
  branchId: number, 
  search?: string, 
  token?: string
): Promise<EnrichedProduct[]> {
  const [products, inventory] = await Promise.all([
    repo.fetchProducts(search),
    repo.fetchBranchInventory(branchId, token)
  ]);

  // Build inventory map for faster lookup: productId -> total rfid count
  const invMap: Record<number, number> = {};
  inventory.forEach((i: { productId?: number; product_id?: number; runningInventory?: number; running_inventory?: number }) => {
    const pId = Number(i.productId || i.product_id);
    const qty = Number(i.runningInventory || i.running_inventory || 0);
    if (!isNaN(pId)) invMap[pId] = (invMap[pId] || 0) + qty;
  });

  return products.map(p => {
    const rfidCount = invMap[p.product_id] || 0;
    const unitCount = Number(p.unit_of_measurement_count || 1) || 1;
    
    // Formula for available unit quantity: rfid_count / unit_multiplier
    return {
      ...p,
      qtyAvailable: Math.floor(rfidCount / unitCount)
    } as EnrichedProduct;
  });
}

/**
 * Handles the creation of a new stock transfer request.
 */
export async function createTransfer(payload: CreateTransferPayload): Promise<{ success: boolean; orderNo: string }> {
  // 1. Validate payload
  const validated = CreateStockTransferSchema.parse(payload);
  
  const orderNo = helpers.generateOrderNo(validated.sourceBranch, validated.targetBranch);
  const now = new Date().toISOString();

  // 2. Prepare Directus payloads
  const insertPayloads: StockTransferInsertPayload[] = validated.scannedItems
    .filter(item => item.productId > 0)
    .map(item => ({
      order_no: orderNo,
      source_branch: Number(validated.sourceBranch),
      target_branch: Number(validated.targetBranch),
      lead_date: validated.leadDate,
      product_id: item.productId,
      ordered_quantity: item.unitQty,
      received_quantity: 0,
      amount: item.totalAmount,
      status: "Requested",
      remarks: item.rfid, // RFID stored in remarks for the request stage
      date_requested: now,
      date_encoded: now,
    }));

  if (insertPayloads.length === 0) {
    throw new Error("No valid products provided for transfer");
  }

  // 3. Persist
  await repo.createStockTransfers(insertPayloads);

  return { success: true, orderNo };
}

/**
 * Updates status and handles optional RFID tracking logic.
 */
export async function updateTransferStatus(payload: UpdateTransferPayload): Promise<{ success: boolean }> {
  // 1. Validate payload
  const validated = UpdateStockTransferSchema.parse(payload);
  
  // 2. Normalize updates (handle both 'items' and 'ids' formats)
  const updates = validated.items || (validated.ids || []).map(id => ({
    id,
    status: validated.status || "Unknown"
  }));

  if (updates.length === 0) return { success: true };

  // 3. Update main table statuses
  await repo.updateTransfersStatus(updates);

  // 4. Record RFID tracking if provided
  if (validated.rfids && validated.rfids.length > 0 && validated.scanType) {
    const trackingEntries = validated.rfids.map(r => ({
      stock_transfer_id: r.stock_transfer_id,
      rfid_tag: r.rfid_tag,
      scan_type: validated.scanType!
    }));
    await repo.insertRfidTracking(trackingEntries);
  }

  return { success: true };
}

/**
 * Specifically handles manual receiving where received_quantity is auto-filled.
 */
export async function manualReceiveItems(ids: number[], status: string): Promise<{ success: boolean }> {
<<<<<<< HEAD
  // Fetch ONLY the rows we need instead of the entire table
  const targetItems = await repo.fetchStockTransfersByIds(ids);

  if (targetItems.length === 0) return { success: true };

  // Build update payloads
=======
  const transfers = await repo.fetchStockTransfers(); // Ideally we'd filter by IDs here
  const targetItems = transfers.filter(t => ids.includes(t.id));

>>>>>>> origin/master
  const updates = targetItems.map(item => ({
    id: item.id,
    status: status,
    received_quantity: item.allocated_quantity ?? item.ordered_quantity ?? 0
  }));

<<<<<<< HEAD
  // Use bulk update — one request per unique payload shape
  await repo.updateTransfersStatus(updates.map(u => ({
    id: u.id,
    status: u.status,
    allocated_quantity: u.received_quantity
  })));

  // Also set received_quantity individually where it varies per row
  await Promise.all(
    updates.map(u =>
      repo.updateTransfer(u.id, {
        status: u.status,
        received_quantity: u.received_quantity
      })
    )
  );
=======
  if (updates.length > 0) {
    await Promise.all(
      updates.map(u => 
        repo.updateTransfer(u.id, {
          status: u.status,
          received_quantity: u.received_quantity
        })
      )
    );
  }
>>>>>>> origin/master

  return { success: true };
}
