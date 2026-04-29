import { stockConversionRepo } from "../../stock-conversion/services/stock-conversion.repo";
import { generateConversionDocNo } from "../../stock-conversion/services/stock-conversion.helpers";
import type { StockConversionPayload } from "../types/stock-conversion-manual.types";
import { AppError } from "../../stock-conversion/utils/error-handler";

/**
 * Service to handle manual (Non-RFID) stock conversion business logic.
 * Bypasses all RFID tag tracking and status updates.
 */
export const stockConversionManualService = {
  async executeConversion(payload: StockConversionPayload) {
    const docNo = generateConversionDocNo();
    const targetProductId = payload.targetProductId || payload.productId;
    const remarkStr = `Manual Conversion from ${payload.sourceUnitId} to ${payload.targetUnitId}`;
    const totalAmount = Number((payload.quantityToConvert * payload.pricePerUnit).toFixed(2));

    try {
      // 1. Create a SINGLE header for the entire conversion transaction
      await stockConversionRepo.createStockAdjustmentHeader({
        doc_no: docNo, 
        type: "OUT", 
        branch_id: payload.branchId, 
        created_by: payload.userId, 
        posted_by: payload.userId, 
        amount: totalAmount, 
        remarks: remarkStr
      });

      // 2. Create the OUT movement (Source Product)
      await stockConversionRepo.createStockAdjustment({
        doc_no: docNo, 
        product_id: payload.productId, 
        branch_id: payload.branchId, 
        type: "OUT", 
        quantity: payload.quantityToConvert, 
        created_by: payload.userId, 
        remarks: remarkStr
      });

      // 3. Create the IN movement (Target Product)
      await stockConversionRepo.createStockAdjustment({
        doc_no: docNo, 
        product_id: targetProductId, 
        branch_id: payload.branchId, 
        type: "IN", 
        quantity: payload.convertedQuantity, 
        created_by: payload.userId, 
        remarks: remarkStr
      });

      return { success: true, docNo };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error during manual conversion";
      throw new AppError("CONVERT_ERROR", `Manual conversion failed: ${message}`, 500);
    }
  }
};
