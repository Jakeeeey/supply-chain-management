"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BundleDraft } from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

interface BulkActionsModalProps {
  open: boolean;
  onClose: () => void;
  type: "submit" | "delete";
  items: BundleDraft[];
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

/**
 * Confirmation modal for bulk operations (submit or delete).
 * Displays the list of affected bundles with code and name.
 */
export function BulkActionsModal({
  open,
  onClose,
  type,
  items,
  onConfirm,
  loading,
}: BulkActionsModalProps) {
  const isDelete = type === "delete";
  const Icon = isDelete ? Trash2 : Send;
  const title = isDelete
    ? "Delete Selected Bundles"
    : "Submit Selected for Approval";
  const description = isDelete
    ? "The following bundles will be permanently deleted. This action cannot be undone."
    : "The following bundles will be submitted for manager approval.";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDelete && <AlertTriangle className="h-5 w-5 text-destructive" />}
            <Icon className={`h-5 w-5 ${isDelete ? "text-destructive" : ""}`} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[40vh]">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30"
              >
                <Badge variant="outline" className="font-mono text-xs">
                  {item.bundle_sku}
                </Badge>
                <span className="text-sm font-medium truncate">
                  {item.bundle_name}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={isDelete ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : isDelete
                ? `Delete ${items.length} Bundle(s)`
                : `Submit ${items.length} Bundle(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
