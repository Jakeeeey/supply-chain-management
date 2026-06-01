"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { AlertCircle, XCircle } from "lucide-react";

interface BulkRejectSegmentModalProps {
  selectedSKUs: SKU[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function BulkRejectSegmentModal({
  selectedSKUs,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: BulkRejectSegmentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>
              Bulk Reject Segments ({selectedSKUs.length} items)
            </DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to{" "}
            <span className="text-destructive font-bold uppercase">Reject</span>{" "}
            the segment classification for the selected items?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted/50 rounded-lg border p-4 max-h-[200px] overflow-y-auto">
            <ul className="space-y-2">
              {selectedSKUs.map((sku) => (
                <li
                  key={sku.id || sku.product_id}
                  className="text-sm flex items-center justify-between"
                >
                  <span className="truncate pr-4">{sku.product_name}</span>
                  <code className="text-[10px] bg-background px-1.5 py-0.5 rounded border">
                    {sku.product_code || "NEW"}
                  </code>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px] text-destructive/80">
              Rejection will remove these items from the Masterlist and send
              them back to the &quot;SKU Approval&quot; queue for review.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading || selectedSKUs.length === 0}
            className="px-8"
          >
            {isLoading ? "Rejecting..." : `Reject ${selectedSKUs.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
