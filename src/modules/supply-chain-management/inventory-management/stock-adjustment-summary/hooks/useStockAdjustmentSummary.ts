import { useStockAdjustmentSummaryContext } from "../providers/StockAdjustmentSummaryProvider";

export function useStockAdjustmentSummary() {
  return useStockAdjustmentSummaryContext();
}
export type UseStockAdjustmentSummaryReturn = ReturnType<typeof useStockAdjustmentSummary>;
