"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SKU } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";

interface RejectRemarksModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number | string, remarks: string) => Promise<void>;
  isLoading?: boolean;
}

export function RejectRemarksModal({
  sku,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: RejectRemarksModalProps) {
  const [remarks, setRemarks] = useState("");

  const handleConfirm = async () => {
    if (!sku) return;
    const id = (sku as any).id || (sku as any).product_id;
    await onConfirm(id, remarks);
    setRemarks("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reject SKU Registration</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting <span className="font-semibold text-foreground">{sku?.product_name}</span>. This will be visible to the requester.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="remarks">Rejection Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="e.g. Incorrect pricing, missing barcode details..."
              className="min-h-[100px]"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isLoading}
            />
            <p className={`text-[11px] ${remarks.trim().length >= 12 ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>
              {remarks.trim().length < 12 
                ? `Please provide more detail (minimum 12 characters: ${remarks.trim().length}/12)` 
                : "Requirement met."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm} 
            disabled={isLoading || remarks.trim().length < 12} 
          >
            {isLoading ? "Rejecting..." : "Reject SKU"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

