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

interface RejectSegmentModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function RejectSegmentModal({
  sku,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: RejectSegmentModalProps) {
  if (!sku) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reject Segment Classification</DialogTitle>
          <DialogDescription>
            You are about to reject the segment classification for{" "}
            <span className="font-semibold text-foreground">
              {sku.product_name}
            </span>
            . 
            <br />
            <br />
            This will remove the product from the Masterlist and send it back to the &quot;SKU Approval&quot; queue for review.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Rejecting..." : "Reject Segment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
