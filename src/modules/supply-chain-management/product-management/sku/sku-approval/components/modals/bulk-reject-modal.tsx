"use client";

import React, { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { AlertCircle, XCircle } from "lucide-react";

interface BulkRejectModalProps {
  selectedSKUs: SKU[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    rejections: { id: number | string; remarks: string }[],
  ) => Promise<void>;
  isLoading?: boolean;
}

export function BulkRejectModal({
  selectedSKUs,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: BulkRejectModalProps) {
  const [applySameReason, setApplySameReason] = useState(true);
  const [commonRemarks, setCommonRemarks] = useState("");
  const [individualRemarks, setIndividualRemarks] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setCommonRemarks("");
        setIndividualRemarks({});
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Update individual remarks when selectedSKUs filter/selection changes
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      selectedSKUs.forEach((sku) => {
        const id = String((sku as any).id || sku.product_id);
        initial[id] = individualRemarks[id] || "";
      });
      const timer = setTimeout(() => {
        setIndividualRemarks(initial);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedSKUs]);

  const handleIndividualChange = (id: string, value: string) => {
    setIndividualRemarks((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirm = async () => {
    const rejections = selectedSKUs.map((sku) => {
      const id = String((sku as any).id || sku.product_id);
      return {
        id,
        remarks: applySameReason ? commonRemarks : individualRemarks[id] || "",
      };
    });
    await onConfirm(rejections);
    onClose();
  };

  const isComplete = applySameReason
    ? commonRemarks.trim().length >= 12
    : selectedSKUs.every((sku) => {
        const id = String((sku as any).id || sku.product_id);
        return (individualRemarks[id] || "").trim().length >= 12;
      });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>
              Confirm Rejection ({selectedSKUs.length} items)
            </DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to{" "}
            <span className="text-destructive font-bold uppercase">Reject</span>{" "}
            the selected SKU registration requests?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm">
                Apply the same reason to all items
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Toggle to provide individual reasons
              </p>
            </div>
            <Switch
              checked={applySameReason}
              onCheckedChange={setApplySameReason}
              disabled={isLoading}
            />
          </div>

          {applySameReason ? (
            <div className="space-y-2">
              <Label
                htmlFor="common-remarks"
                className="text-[10px] font-bold uppercase text-muted-foreground"
              >
                Reason for Rejection
              </Label>
              <Textarea
                id="common-remarks"
                placeholder="Why are these being rejected?"
                className="min-h-[120px]"
                value={commonRemarks}
                onChange={(e) => setCommonRemarks(e.target.value)}
                disabled={isLoading}
              />
              <p
                className={`text-[10px] ${commonRemarks.trim().length >= 12 ? "text-muted-foreground" : "text-destructive font-medium"}`}
              >
                {commonRemarks.trim().length < 12
                  ? `Minimum 12 characters required (${commonRemarks.trim().length}/12)`
                  : "Requirement met."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[250px] pr-4 border rounded-lg p-2 bg-muted/10">
              <div className="space-y-4 pt-1">
                {selectedSKUs.map((sku) => {
                  const id = String((sku as any).id || sku.product_id);
                  const remark = individualRemarks[id] || "";
                  return (
                    <div
                      key={id}
                      className="space-y-2 p-3 border rounded-md bg-background"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary truncate max-w-[200px]">
                          {sku.product_name}
                        </span>
                        <code className="text-[9px] bg-muted px-1.5 py-0.5 rounded">
                          {sku.product_code || "NEW"}
                        </code>
                      </div>
                      <Textarea
                        placeholder="Specific reason..."
                        className="text-sm min-h-[80px]"
                        value={remark}
                        onChange={(e) =>
                          handleIndividualChange(id, e.target.value)
                        }
                        disabled={isLoading}
                      />
                      <p
                        className={`text-[9px] ${remark.trim().length >= 12 ? "text-muted-foreground" : "text-destructive font-medium"}`}
                      >
                        {remark.trim().length < 12
                          ? `Minimum 12 characters: ${remark.trim().length}/12`
                          : "Requirement met."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="flex items-start gap-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px] text-destructive/80">
              Rejection will return these items to &quot;Draft&quot; status.
              Users will see your remarks as the reason for rejection.
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
            disabled={isLoading || !isComplete}
            className="px-8"
          >
            {isLoading ? "Rejecting..." : `Confirm Rejection`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
