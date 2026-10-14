"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Branch } from "../../stock-in/types";
import type { VehiclePart } from "../../registration/types";
import type { PartStock } from "../../stock-monitoring/types";
import { fetchAvailableStock, submitStockOut } from "../provider/fetchProviders";
import { SearchableStockOutSelect } from "./SearchableStockOutSelect";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecordStockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  onSuccess: () => void;
}

export function RecordStockOutDialog({
  open,
  onOpenChange,
  branches,
  onSuccess,
}: RecordStockOutDialogProps) {
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");
  const [availableStock, setAvailableStock] = React.useState<PartStock[]>([]);
  const [loadingStock, setLoadingStock] = React.useState(false);

  const [selectedPartId, setSelectedPartId] = React.useState<string>("");
  const [movementType, setMovementType] = React.useState<"Scrap" | "Damage" | "Disposal" | "Adjustment">("Scrap");
  const [quantity, setQuantity] = React.useState<string>("");
  const [referenceNo, setReferenceNo] = React.useState<string>("");
  const [remarks, setRemarks] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState<boolean>(false);

  // Auto-select first branch if available
  React.useEffect(() => {
    if (open) {
      setSubmitted(false);
      setFieldErrors({});
      setError("");
      if (branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(String(branches[0].id));
      }
    }
  }, [open, branches, selectedBranchId]);

  // Load available stock when branch changes
  React.useEffect(() => {
    if (!selectedBranchId) {
      setAvailableStock([]);
      return;
    }
    setLoadingStock(true);
    fetchAvailableStock(Number(selectedBranchId))
      .then((items) => {
        // Only keep items with positive on-hand stock
        setAvailableStock(items.filter((item) => Number(item.on_hand) > 0));
      })
      .finally(() => setLoadingStock(false));
  }, [selectedBranchId]);

  // Helper to extract VehiclePart safely
  const getPartFromStock = (s: PartStock): VehiclePart | null => {
    return typeof s.part_id === "object" && s.part_id !== null ? (s.part_id as VehiclePart) : null;
  };

  // Find currently selected stock item
  const selectedStockItem = React.useMemo(() => {
    return availableStock.find((item) => {
      const p = getPartFromStock(item);
      const id = p ? p.id : Number(item.part_id);
      return String(id) === selectedPartId;
    });
  }, [availableStock, selectedPartId]);

  const selectedPartObj = selectedStockItem ? getPartFromStock(selectedStockItem) : null;
  const maxAvailable = selectedStockItem ? Number(selectedStockItem.on_hand) : 0;
  const currentUnitCost = selectedPartObj ? Number(selectedPartObj.unit_cost || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");

    const errors: Record<string, string> = {};

    if (!selectedBranchId) {
      errors.branch_id = "Please select a branch.";
    }
    if (!selectedPartId) {
      errors.part_id = "Please select a part to deduct.";
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      errors.quantity = "Please enter a valid quantity greater than 0.";
    } else if (qty > maxAvailable) {
      errors.quantity = `Cannot deduct ${qty}. Only ${maxAvailable} available on-hand.`;
    }

    if (!remarks.trim()) {
      errors.remarks = "Please provide remarks / explanation for this outbound deduction.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please complete all required fields highlighted in red below.");
      return;
    }

    setSubmitting(true);
    try {
      await submitStockOut({
        branch_id: Number(selectedBranchId),
        part_id: Number(selectedPartId),
        movement_type: movementType,
        quantity: qty,
        unit_cost: currentUnitCost,
        reference_no: referenceNo.trim() || undefined,
        remarks: remarks.trim(),
      });

      onSuccess();
      onOpenChange(false);
      // Reset
      setSelectedPartId("");
      setQuantity("");
      setReferenceNo("");
      setRemarks("");
      setSubmitted(false);
      setFieldErrors({});
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to record stock out");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Record Stock Out / Disposal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Deduct parts from branch inventory due to scrap, damage, write-offs, or audit adjustments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Branch <span className="text-destructive font-bold">*</span>
              </Label>
              <SearchableStockOutSelect
                options={branches.map((b) => ({ value: String(b.id), label: b.branch_name }))}
                value={selectedBranchId}
                onValueChange={(val) => {
                  setSelectedBranchId(val);
                  setSelectedPartId("");
                  if (submitted && fieldErrors.branch_id) {
                    setFieldErrors((prev) => ({ ...prev, branch_id: "" }));
                  }
                }}
                placeholder="Select Branch"
                contentWidth="w-[280px]"
                className={submitted && fieldErrors.branch_id ? "border-destructive text-destructive" : ""}
              />
              {submitted && fieldErrors.branch_id && (
                <p className="text-[11px] text-destructive">{fieldErrors.branch_id}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Outbound Reason <span className="text-destructive font-bold">*</span>
              </Label>
              <SearchableStockOutSelect
                options={[
                  { value: "Scrap", label: "Scrap / Waste" },
                  { value: "Damage", label: "Damaged / Defective" },
                  { value: "Disposal", label: "Disposal / Expired" },
                  { value: "Adjustment", label: "Inventory Audit Write-Off" },
                ]}
                value={movementType}
                onValueChange={(val) => setMovementType(val as "Scrap" | "Damage" | "Disposal" | "Adjustment")}
                placeholder="Select Reason"
                contentWidth="w-[240px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Part to Deduct <span className="text-destructive font-bold">*</span>
              </Label>
              {loadingStock && <span className="text-[11px] text-muted-foreground animate-pulse">Loading stock...</span>}
            </div>
            <SearchableStockOutSelect
              options={availableStock.map((s) => {
                const p = getPartFromStock(s);
                const id = p ? p.id : Number(s.part_id);
                const code = p?.part_code || `PRT-${id}`;
                const name = p?.part_name || "Unknown Part";
                const unit = p?.unit || "pc";
                return {
                  value: String(id),
                  label: `${code} — ${name} (Avail: ${s.on_hand} ${unit})`,
                };
              })}
              value={selectedPartId}
              onValueChange={(val) => {
                setSelectedPartId(val);
                if (submitted && fieldErrors.part_id) {
                  setFieldErrors((prev) => ({ ...prev, part_id: "" }));
                }
              }}
              disabled={loadingStock || availableStock.length === 0}
              placeholder={availableStock.length === 0 ? "No available parts in this branch" : "Search part to deduct..."}
              contentWidth="w-[360px]"
              className={submitted && fieldErrors.part_id ? "border-destructive text-destructive" : ""}
            />
            {submitted && fieldErrors.part_id && (
              <p className="text-[11px] text-destructive">{fieldErrors.part_id}</p>
            )}
          </div>

          {selectedStockItem && (
            <div className="p-2.5 rounded-md bg-muted/60 text-xs flex items-center justify-between border">
              <div>
                <span className="text-muted-foreground">Available on-hand:</span>{" "}
                <span className="font-bold text-foreground">{maxAvailable} {selectedPartObj?.unit || "pc"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Unit Cost:</span>{" "}
                <span className="font-semibold text-foreground">₱{currentUnitCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Quantity to Deduct <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                max={maxAvailable > 0 ? maxAvailable : undefined}
                placeholder="e.g. 2"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (submitted && fieldErrors.quantity) {
                    setFieldErrors((prev) => ({ ...prev, quantity: "" }));
                  }
                }}
                className={`h-9 text-xs font-mono ${
                  submitted && fieldErrors.quantity ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              {submitted && fieldErrors.quantity && (
                <p className="text-[11px] text-destructive">{fieldErrors.quantity}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference No. (Optional)</Label>
              <Input
                placeholder="e.g. DISPOSAL-2026-001"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Remarks / Explanation <span className="text-destructive font-bold">*</span>
            </Label>
            <Textarea
              placeholder="State the reason for scrap or write-off (e.g. broken casing, water damage)..."
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (submitted && fieldErrors.remarks) {
                  setFieldErrors((prev) => ({ ...prev, remarks: "" }));
                }
              }}
              className={`text-xs min-h-[64px] ${
                submitted && fieldErrors.remarks ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            {submitted && fieldErrors.remarks && (
              <p className="text-[11px] text-destructive">{fieldErrors.remarks}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !selectedPartId}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Recording...
                </>
              ) : (
                "Confirm Stock Out"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
