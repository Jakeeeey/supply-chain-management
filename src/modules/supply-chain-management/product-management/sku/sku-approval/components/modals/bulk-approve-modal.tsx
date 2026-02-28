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
import { CheckCircle, AlertCircle } from "lucide-react";

interface BulkApproveModalProps {
  selectedSKUs: SKU[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function BulkApproveModal({
  selectedSKUs,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: BulkApproveModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <DialogTitle>Bulk Approve SKUs</DialogTitle>
          </div>
          <DialogDescription>
            You are about to approve and activate{" "}
            <span className="font-bold text-foreground">
              {selectedSKUs.length}
            </span>{" "}
            selected items. This will create permanent master records for all of
            them.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg border p-4 max-h-[200px] overflow-y-auto">
            <ul className="space-y-2">
              {selectedSKUs.map((sku) => (
                <li
                  key={(sku as any).id || sku.product_id}
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

          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-900/50">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Note: This action cannot be undone. Activated records will be
              visible in the SKU Masterlist immediately.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || selectedSKUs.length === 0}
            className="px-8"
          >
            {isLoading
              ? "Processing..."
              : `Approve ${selectedSKUs.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
