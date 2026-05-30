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
import { MasterData, SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { AlertCircle } from "lucide-react";
import { CellHelpers } from "../../../sku-creation/utils/sku-helpers";

interface BulkApproveSegmentModalProps {
  selectedSKUs: SKU[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  masterData: MasterData | null;
}

export function BulkApproveSegmentModal({
  selectedSKUs,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  masterData,
}: BulkApproveSegmentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <DialogTitle>Bulk Approve Segments</DialogTitle>
          </div>
          <DialogDescription>
            You are about to approve segment classification for{" "}
            <span className="font-bold text-foreground">
              {selectedSKUs.length}
            </span>{" "}
            selected items. Each item will be finalized with its proposed
            Class, Segment, and Section values.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg border p-4 max-h-[250px] overflow-y-auto">
            <ul className="space-y-2">
              {selectedSKUs.map((sku) => {
                const proposed = sku as SKU & {
                  _proposed_class?: number;
                  _proposed_segment?: number;
                  _proposed_section?: number;
                };
                return (
                  <li
                    key={sku.id || sku.product_id}
                    className="text-sm p-2 rounded-md border bg-background"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="truncate pr-4 font-medium">
                        {sku.product_name}
                      </span>
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border shrink-0">
                        {sku.product_code || "NEW"}
                      </code>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>
                        Class:{" "}
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {CellHelpers.renderMasterText(proposed._proposed_class, masterData?.classes) || "N/A"}
                        </span>
                      </span>
                      <span>
                        Segment:{" "}
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {CellHelpers.renderMasterText(proposed._proposed_segment, masterData?.segments) || "N/A"}
                        </span>
                      </span>
                      <span>
                        Section:{" "}
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {CellHelpers.renderMasterText(proposed._proposed_section, masterData?.sections) || "N/A"}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-900/50">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Note: This action will finalize the classification for all
              selected items. They will become visible in the SKU Masterlist
              with the proposed values.
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
