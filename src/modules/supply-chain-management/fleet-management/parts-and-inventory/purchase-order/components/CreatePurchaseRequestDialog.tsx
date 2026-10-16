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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch } from "../../stock-in/types";
import type { VehiclePart } from "../../registration/types";
import type { ReorderTriggerItem, PurchaseRequestPriority } from "../types";
import { createPurchaseRequest } from "../provider/fetchProviders";
import { SearchableSelect } from "./SearchableSelect";
import { AlertCircle, Loader2, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreatePurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  parts: VehiclePart[];
  initialTrigger?: ReorderTriggerItem | null;
  onSuccess: () => void;
}

export function CreatePurchaseRequestDialog({
  open,
  onOpenChange,
  branches,
  parts,
  initialTrigger,
  onSuccess,
}: CreatePurchaseRequestDialogProps) {
  const [branchId, setBranchId] = React.useState<string>("");
  const [partId, setPartId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<string>("10");
  const [priority, setPriority] = React.useState<PurchaseRequestPriority>("Normal");
  const [supplierName, setSupplierName] = React.useState<string>("");
  const [expectedDate, setExpectedDate] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState<boolean>(false);

  // Populate from trigger if passed, or default
  React.useEffect(() => {
    if (open) {
      setSubmitted(false);
      setFieldErrors({});
      setError("");

      if (initialTrigger) {
        setBranchId(String(initialTrigger.branch_id));
        setPartId(String(initialTrigger.part_id));
        setQuantity(String(initialTrigger.suggested_quantity || 10));
        setPriority(initialTrigger.on_hand <= 0 ? "Critical" : "Urgent");
        setNotes(`Replenishment triggered by low stock alert (On-hand: ${initialTrigger.on_hand}, Reorder Point: ${initialTrigger.reorder_point})`);
      } else {
        setBranchId((prev) => (prev ? prev : branches[0] ? String(branches[0].id) : ""));
        setPartId((prev) => (prev ? prev : parts[0] ? String(parts[0].id) : ""));
        setQuantity("10");
        setPriority("Normal");
        setSupplierName("");
        setExpectedDate("");
        setNotes("");
      }
    }
  }, [open, initialTrigger, branches, parts]);

  // Selected part for unit cost calculation
  const selectedPart = React.useMemo(() => {
    return parts.find((p) => String(p.id) === partId);
  }, [parts, partId]);

  const unitCost = selectedPart ? Number(selectedPart.unit_cost || 0) : 0;
  const estimatedCost = (Number(quantity) || 0) * unitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");

    const errors: Record<string, string> = {};

    if (!branchId) {
      errors.branch_id = "Please select a branch.";
    }
    if (!partId) {
      errors.part_id = "Please select a part.";
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      errors.quantity = "Please enter a valid quantity greater than 0.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please complete all required fields highlighted in red below.");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchaseRequest({
        branch_id: Number(branchId),
        part_id: Number(partId),
        quantity: qty,
        estimated_cost: estimatedCost,
        priority,
        supplier_name: supplierName.trim() || undefined,
        expected_delivery_date: expectedDate || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onOpenChange(false);
      setSubmitted(false);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to create purchase request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Create Purchase Request / Replenishment
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate an official purchase request to replenish low stock parts across branches.
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
              <SearchableSelect
                options={branches.map((b) => ({ value: String(b.id), label: b.branch_name }))}
                value={branchId}
                onValueChange={(val) => {
                  setBranchId(val);
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
              <Label className="text-xs font-semibold">Priority</Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as PurchaseRequestPriority)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal" className="text-xs">
                    Normal
                  </SelectItem>
                  <SelectItem value="Urgent" className="text-xs font-semibold text-amber-600">
                    Urgent
                  </SelectItem>
                  <SelectItem value="Critical" className="text-xs font-bold text-rose-600">
                    Critical Stockout
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Part to Order <span className="text-destructive font-bold">*</span>
            </Label>
            <SearchableSelect
              options={parts.map((p) => ({
                value: String(p.id),
                label: `${p.part_code} — ${p.part_name} (${p.unit})`,
              }))}
              value={partId}
              onValueChange={(val) => {
                setPartId(val);
                if (submitted && fieldErrors.part_id) {
                  setFieldErrors((prev) => ({ ...prev, part_id: "" }));
                }
              }}
              placeholder="Select Part to Order"
              contentWidth="w-[360px]"
              className={submitted && fieldErrors.part_id ? "border-destructive text-destructive" : ""}
            />
            {submitted && fieldErrors.part_id && (
              <p className="text-[11px] text-destructive">{fieldErrors.part_id}</p>
            )}
          </div>

          {selectedPart && (
            <div className="p-2.5 rounded-md bg-muted/60 text-xs flex items-center justify-between border">
              <div>
                <span className="text-muted-foreground">Catalog Unit Cost:</span>{" "}
                <span className="font-semibold text-foreground">₱{unitCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Est. Total Cost:</span>{" "}
                <span className="font-bold text-foreground">₱{estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Order Quantity <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 10"
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
              <Label className="text-xs font-semibold">Preferred Supplier (Optional)</Label>
              <Input
                placeholder="e.g. Acme Auto Parts Supply"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Delivery Date (Optional)</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Notes / Purpose</Label>
              <Textarea
                placeholder="Add purchase justification or fleet maintenance details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[56px]"
              />
            </div>
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
              disabled={submitting || !partId}
              className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Submitting...
                </>
              ) : (
                "Submit Purchase Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
