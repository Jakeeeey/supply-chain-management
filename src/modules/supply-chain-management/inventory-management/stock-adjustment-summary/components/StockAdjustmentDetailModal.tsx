"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockAdjustmentDetailView } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/components/StockAdjustmentDetailView";

interface StockAdjustmentDetailModalProps {
  id: number | null;
  onClose: () => void;
}

export function StockAdjustmentDetailModal({
  id,
  onClose,
}: StockAdjustmentDetailModalProps) {
  return (
    <Dialog open={id !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-border shadow-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Stock Adjustment Details</DialogTitle>
        </DialogHeader>
        {id !== null && (
          <StockAdjustmentDetailView
            id={id}
            onBack={onClose}
            mode="creation"
            isModal={true}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
