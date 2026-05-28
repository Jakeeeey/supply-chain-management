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
import { CellHelpers } from "../../../sku-creation/utils/sku-helpers";

interface ApproveSegmentModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  masterData: MasterData | null;
}

export function ApproveSegmentModal({
  sku,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  masterData,
}: ApproveSegmentModalProps) {
  if (!sku) return null;

  const proposedClass = (sku as SKU & { _proposed_class?: number })._proposed_class;
  const proposedSegment = (sku as SKU & { _proposed_segment?: number })._proposed_segment;
  const proposedSection = (sku as SKU & { _proposed_section?: number })._proposed_section;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Approve Segment Classification</DialogTitle>
          <DialogDescription>
            You are about to finalize the classification for{" "}
            <span className="font-semibold text-foreground">
              {sku.product_name}
            </span>
            . This action will make the product visible in the official SKU Masterlist.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4 text-sm">
          <div className="grid grid-cols-[100px_1fr] items-center gap-2">
            <span className="text-muted-foreground">Class</span>
            <span className="font-medium">
              {CellHelpers.renderMasterText(proposedClass, masterData?.classes) || "N/A"}
            </span>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-center gap-2">
            <span className="text-muted-foreground">Segment</span>
            <span className="font-medium">
              {CellHelpers.renderMasterText(proposedSegment, masterData?.segments) || "N/A"}
            </span>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-center gap-2">
            <span className="text-muted-foreground">Section</span>
            <span className="font-medium">
              {CellHelpers.renderMasterText(proposedSection, masterData?.sections) || "N/A"}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? "Approving..." : "Approve Segment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
