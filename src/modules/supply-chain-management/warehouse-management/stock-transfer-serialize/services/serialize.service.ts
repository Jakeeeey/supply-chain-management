import * as repo from "./serialize.repo";
import { fetchProductById } from "../../stock-transfer/services/stock-transfer.repo";
import { UpdateSerializeTransferSchema } from "../types/serialize.schema";
import type { SerialLookupResponse } from "../types/serialize.types";
import type { UpdateSerializeTransferValues } from "../types/serialize.schema";

/**
 * Service to orchestrate serialized stock transfer business logic.
 */

/**
 * Validates a serial number against the on-hand inventory view.
 */
export async function lookupSerial(serialNumber: string, branchId?: number): Promise<SerialLookupResponse> {
  const matches = await repo.fetchSerialAvailability(serialNumber, branchId);
  
  if (matches.length === 0) {
    throw new Error(`Serial number ${serialNumber} not found in inventory.`);
  }

  const match = matches[0];
  const productId = match.product_id;

  if (!productId) {
    throw new Error(`Serial ${serialNumber} exists but has no associated product ID.`);
  }

  // Fetch full product details
  const product = await fetchProductById(productId);
  if (!product) {
    throw new Error(`Product details for serial ${serialNumber} not found.`);
  }

  return {
    serialNumber: match.serial_number,
    productId: product.product_id,
    productName: product.product_name,
    barcode: product.barcode || product.product_code || String(product.product_id),
    unitPrice: product.price_per_unit || product.cost_per_unit || 0,
    branchId: match.branch_id,
    qtyAvailable: match.qty_onhand || 0, 
  };
}

/**
 * Updates transfer statuses and records serial tracking.
 */
export async function updateTransferWithSerials(payload: UpdateSerializeTransferValues, userId?: number): Promise<{ success: boolean }> {
  // 1. Validate payload
  const validated = UpdateSerializeTransferSchema.parse(payload);

  // 2. Prepare tracking entries if provided
  if (validated.serials && validated.serials.length > 0 && validated.scanType) {
    const trackingEntries = validated.serials.map(s => ({
      stock_transfer_id: s.stock_transfer_id,
      serial_number: s.serial_number,
      scan_type: validated.scanType as "DISPATCH" | "RECEIVE",
      created_by: userId,
    }));
    await repo.insertSerialTracking(trackingEntries);
  }

  // 3. Prepare main table updates
  const transferUpdates = validated.items.map(item => ({
    id: item.id,
    status: validated.status,
    ...(item.received_quantity !== undefined ? { received_quantity: item.received_quantity } : {}),
    ...(validated.scanType === "DISPATCH" ? { date_encoded: new Date().toISOString() } : {}),
    ...(validated.scanType === "RECEIVE" ? { date_received: new Date().toISOString(), receiver_id: userId } : {}),
  }));

  // 4. Execute updates
  await repo.bulkUpdateTransfers(transferUpdates);

  return { success: true };
}
