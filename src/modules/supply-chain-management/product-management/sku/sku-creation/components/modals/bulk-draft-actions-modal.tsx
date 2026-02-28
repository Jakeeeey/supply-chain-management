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
import { AlertCircle, Send, Trash2 } from "lucide-react";

interface BulkDraftActionsModalProps {
  selectedSKUs: SKU[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  type: "submit" | "delete";
}

export function BulkDraftActionsModal({
  selectedSKUs,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  type,
}: BulkDraftActionsModalProps) {
  const isSubmit = type === "submit";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {isSubmit ? (
              <Send className="h-5 w-5 text-primary" />
            ) : (
              <Trash2 className="h-5 w-5 text-destructive" />
            )}
            <DialogTitle>
              {isSubmit ? "Bulk Submit for Approval" : "Bulk Delete Drafts"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isSubmit
              ? `You are about to submit ${selectedSKUs.length} items for manager approval. Once submitted, they will be moved to the approval queue.`
              : `You are about to permanently delete ${selectedSKUs.length} items. This action cannot be undone.`}
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
                    {sku.product_code || "DRAFT"}
                  </code>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`mt-4 flex items-start gap-2 p-3 rounded-lg border ${
              isSubmit
                ? "bg-primary/5 border-primary/20"
                : "bg-destructive/5 border-destructive/20"
            }`}
          >
            <AlertCircle
              className={`h-4 w-4 shrink-0 mt-0.5 ${
                isSubmit ? "text-primary" : "text-destructive"
              }`}
            />
            <p
              className={`text-[11px] ${
                isSubmit ? "text-primary/80" : "text-destructive/80"
              }`}
            >
              {isSubmit
                ? "Items will be locked for editing while pending approval."
                : "All associated data for these drafts will be permanently removed."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isSubmit ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={isLoading || selectedSKUs.length === 0}
            className="px-8"
          >
            {isLoading
              ? "Processing..."
              : isSubmit
                ? `Submit ${selectedSKUs.length} Items`
                : `Delete ${selectedSKUs.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
