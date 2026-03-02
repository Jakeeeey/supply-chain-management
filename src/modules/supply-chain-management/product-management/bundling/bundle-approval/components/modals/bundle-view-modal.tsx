"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BundleDraft, BundleMasterData } from "../../../types/bundle.schema";
import { Package, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface BundleViewModalProps {
  open: boolean;
  onClose: () => void;
  draft: BundleDraft | null;
  masterData: BundleMasterData | null;
  onApprove: (id: number | string) => Promise<void>;
  onReject: (id: number | string) => Promise<void>;
  fetchDetails: (id: number | string) => Promise<any>;
}

/**
 * Modal for viewing a bundle's details during the approval workflow.
 * Shows bundle info, product list, and approve/reject buttons
 * with confirmation step.
 */
export function BundleViewModal({
  open,
  onClose,
  draft,
  masterData,
  onApprove,
  onReject,
  fetchDetails,
}: BundleViewModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const id = draft?.id;
    if (open && id) {
      setIsLoadingDetails(true);
      setDetails(null);
      setConfirmAction(null);
      fetchDetails(id)
        .then((d) => setDetails(d))
        .catch(() => setDetails(null))
        .finally(() => setIsLoadingDetails(false));
    }
  }, [open, draft?.id, fetchDetails]);

  const handleAction = async () => {
    if (!confirmAction || !draft) return;
    setIsProcessing(true);
    const id = draft.id;
    try {
      if (confirmAction === "approve") {
        await onApprove(id);
      } else {
        await onReject(id);
      }
      onClose();
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const getTypeName = () => {
    const raw = draft?.bundle_type_id;
    if (typeof raw === "object" && raw !== null) return raw.name || "-";
    const found = masterData?.bundleTypes.find((t) => t.id == raw);
    return found?.name || "-";
  };

  const getProductName = (productId: number) => {
    const p = masterData?.products.find(
      (prod) => prod.product_id === productId,
    );
    return p
      ? `${p.product_name} (${p.product_code})`
      : `Product #${productId}`;
  };

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[90vw] sm:w-fit min-w-[min(100vw-2rem,500px)] max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Bundle Details
          </DialogTitle>
        </DialogHeader>

        {/* Confirmation View */}
        {confirmAction ? (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              {confirmAction === "approve" ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
              )}
              <h3 className="text-lg font-semibold">
                {confirmAction === "approve"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {confirmAction === "approve"
                  ? `Are you sure you want to approve "${draft.bundle_name}"? This will create a master record.`
                  : `Are you sure you want to reject "${draft.bundle_name}"? It will return to draft status.`}
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmAction(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant={
                  confirmAction === "approve" ? "default" : "destructive"
                }
                onClick={handleAction}
                disabled={isProcessing}
              >
                {isProcessing
                  ? "Processing..."
                  : confirmAction === "approve"
                    ? "Yes, Approve"
                    : "Yes, Reject"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {/* Bundle Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Bundle Code
                  </p>
                  <p className="font-mono text-sm font-semibold text-primary">
                    {draft.bundle_sku}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Status
                  </p>
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/10 text-amber-600 capitalize"
                  >
                    {draft.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Bundle Name
                  </p>
                  <p className="font-medium">{draft.bundle_name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Bundle Type
                  </p>
                  <p className="text-sm">{getTypeName()}</p>
                </div>
              </div>

              <Separator />

              {/* Product Items List */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Bundled Products</h4>
                <ScrollArea className="max-h-[30vh]">
                  {isLoadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : details?.items?.length ? (
                    <div className="space-y-2">
                      {details.items.map((item: any, idx: number) => {
                        const productId =
                          typeof item.product_id === "object"
                            ? item.product_id?.product_id || item.product_id?.id
                            : item.product_id;
                        return (
                          <div
                            key={item.id || idx}
                            className="flex items-center justify-between p-3 border rounded-lg bg-background/50"
                          >
                            <span className="text-sm font-medium">
                              {getProductName(productId)}
                            </span>
                            <Badge variant="outline">
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No products found for this bundle.
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmAction("reject")}
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button onClick={() => setConfirmAction("approve")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
