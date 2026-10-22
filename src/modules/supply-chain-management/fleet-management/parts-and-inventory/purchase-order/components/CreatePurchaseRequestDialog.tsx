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
import type { ReorderTriggerItem, PurchaseRequestPriority, Supplier } from "../types";
import { createPurchaseRequest } from "../provider/fetchProviders";
import { SearchableSelect } from "./SearchableSelect";
import { AlertCircle, Calendar as CalendarIcon, Loader2, ShoppingCart, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CreatePurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  parts: VehiclePart[];
  suppliers?: Supplier[];
  initialTrigger?: ReorderTriggerItem | null;
  onSuccess: () => void;
}

export function CreatePurchaseRequestDialog({
  open,
  onOpenChange,
  branches,
  parts,
  suppliers = [],
  initialTrigger,
  onSuccess,
}: CreatePurchaseRequestDialogProps) {
  const [branchId, setBranchId] = React.useState<string>("");
  const [partId, setPartId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<string>("10");
  const [priority, setPriority] = React.useState<PurchaseRequestPriority>("Normal");
  const [supplierId, setSupplierId] = React.useState<string>("");
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
        setSupplierId("");
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

  // Selected supplier object & searchable options
  const supplierOptions = React.useMemo(() => {
    return suppliers.map((s) => ({
      value: String(s.id),
      label: s.supplier_shortcut
        ? `${s.supplier_name} (${s.supplier_shortcut})`
        : s.supplier_name,
    }));
  }, [suppliers]);

  const selectedSupplier = React.useMemo(() => {
    return suppliers.find((s) => String(s.id) === supplierId);
  }, [suppliers, supplierId]);

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

    if (!supplierId) {
      errors.supplier_id = "Please select a supplier.";
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
        supplier_id: Number(supplierId),
        supplier_name: selectedSupplier ? selectedSupplier.supplier_name : undefined,
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
              <Label className="text-xs font-semibold">
                Supplier <span className="text-destructive font-bold">*</span>
              </Label>
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onValueChange={(val) => {
                  setSupplierId(val);
                  if (submitted && fieldErrors.supplier_id) {
                    setFieldErrors((prev) => ({ ...prev, supplier_id: "" }));
                  }
                }}
                placeholder="Select a supplier..."
                contentWidth="w-[300px] sm:w-[350px]"
                className={submitted && fieldErrors.supplier_id ? "border-destructive text-destructive" : ""}
              />
              {submitted && fieldErrors.supplier_id && (
                <p className="text-[11px] text-destructive">{fieldErrors.supplier_id}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Delivery Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-xs px-3",
                      !expectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                    {expectedDate ? (
                      <span className="flex-1 truncate">
                        {format(parseISO(expectedDate), "PPP")}
                      </span>
                    ) : (
                      <span className="flex-1 truncate">Pick target delivery date</span>
                    )}
                    {expectedDate && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpectedDate("");
                        }}
                        className="ml-auto rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg border" align="start">
                  <Calendar
                    mode="single"
                    selected={expectedDate ? parseISO(expectedDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setExpectedDate(format(date, "yyyy-MM-dd"));
                      } else {
                        setExpectedDate("");
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
