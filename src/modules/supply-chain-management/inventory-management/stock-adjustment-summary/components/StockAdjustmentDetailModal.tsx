"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockAdjustmentDetailView } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/components/StockAdjustmentDetailView";
import { X } from "lucide-react";

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
      <DialogContent showCloseButton={false} className="max-w-6xl w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-border shadow-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Stock Adjustment Details</DialogTitle>
        </DialogHeader>
        {id !== null && (
          <div className="relative w-full flex flex-col min-h-0">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-xs hover:bg-muted text-muted-foreground transition-all hover:scale-105 focus:outline-hidden"
              title="Close Details"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <StockAdjustmentDetailView
              id={id}
              onBack={onClose}
              mode="creation"
              isModal={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
