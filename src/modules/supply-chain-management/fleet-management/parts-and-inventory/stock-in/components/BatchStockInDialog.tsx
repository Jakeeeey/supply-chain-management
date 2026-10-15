"use client";

import * as React from "react";
import type { BatchStockInInput, Branch } from "../types";
import type { VehiclePart } from "../../registration/types";
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
import { SearchableBranchSelect } from "./SearchableBranchSelect";
import { Plus, Trash2, PackagePlus } from "lucide-react";

interface BatchStockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parts: VehiclePart[];
  branches: Branch[];
  saving: boolean;
  onSave: (payload: BatchStockInInput) => Promise<boolean>;
}

interface ItemRowState {
  part_id: string;
  quantity: string;
  unit_cost: string;
  remarks: string;
}

export function BatchStockInDialog({
  open,
  onOpenChange,
  parts,
  branches,
  saving,
  onSave,
}: BatchStockInDialogProps) {
  const [referenceNo, setReferenceNo] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [generalRemarks, setGeneralRemarks] = React.useState("");
  const [items, setItems] = React.useState<ItemRowState[]>([
    { part_id: "", quantity: "1", unit_cost: "0", remarks: "" },
  ]);

  const [errors, setErrors] = React.useState<{
    referenceNo?: string;
    branchId?: string;
    items?: { [index: number]: { part_id?: string; quantity?: string; unit_cost?: string } };
  }>({});
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReferenceNo("");
      setBranchId(branches.length > 0 ? String(branches[0].id) : "");
      setGeneralRemarks("");
      setItems([{ part_id: "", quantity: "1", unit_cost: "0", remarks: "" }]);
      setErrors({});
      setSubmitted(false);
    }
  }, [open, branches]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { part_id: "", quantity: "1", unit_cost: "0", remarks: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRowState, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      if (field === "part_id") {
        const selectedPart = parts.find((p) => String(p.id) === value);
        if (selectedPart) {
          copy[index].unit_cost = String(selectedPart.unit_cost ?? 0);
        }
      }
      return copy;
    });

    if (submitted) {
      setErrors((prev) => {
        if (!prev.items || !prev.items[index]) return prev;
        const copyItems = { ...prev.items };
        delete copyItems[index];
        return { ...prev, items: copyItems };
      });
    }
  };

  const validate = (): boolean => {
    let isValid = true;
    const itemErrors: { [index: number]: { part_id?: string; quantity?: string; unit_cost?: string } } = {};

    let refError: string | undefined;
    if (!referenceNo.trim()) {
      refError = "Reference number is required (PO, DR, or Invoice)";
      isValid = false;
    }

    let bError: string | undefined;
    if (!branchId) {
      bError = "Please select a destination branch";
      isValid = false;
    }

    items.forEach((item, idx) => {
      const rowErr: { part_id?: string; quantity?: string; unit_cost?: string } = {};
      if (!item.part_id) {
        rowErr.part_id = "Select part";
        isValid = false;
      }
      if (!item.quantity || Number(item.quantity) <= 0 || isNaN(Number(item.quantity))) {
        rowErr.quantity = "Qty > 0";
        isValid = false;
      }
      if (item.unit_cost === "" || Number(item.unit_cost) < 0 || isNaN(Number(item.unit_cost))) {
        rowErr.unit_cost = "Cost ≥ 0";
        isValid = false;
      }
      if (Object.keys(rowErr).length > 0) {
        itemErrors[idx] = rowErr;
      }
    });

    setErrors({ referenceNo: refError, branchId: bError, items: itemErrors });
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validate()) return;

    const payload: BatchStockInInput = {
      reference_no: referenceNo.trim(),
      branch_id: Number(branchId),
      remarks: generalRemarks.trim() || undefined,
      items: items.map((i) => ({
        part_id: Number(i.part_id),
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost),
        remarks: i.remarks.trim() || undefined,
      })),
    };

    const success = await onSave(payload);
    if (success) {
      onOpenChange(false);
    }
  };

  const grandTotal = items.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const c = Number(item.unit_cost) || 0;
    return sum + q * c;
  }, 0);

  const branchOptions = React.useMemo(() => {
    return branches.map((b) => ({
      value: String(b.id),
      label: `${b.branch_name}${b.city ? ` (${b.city})` : ""}`,
    }));
  }, [branches]);

  const partOptions = React.useMemo(() => {
    return parts.map((p) => ({
      value: String(p.id),
      label: `${p.part_code} — ${p.part_name} (${p.unit})`,
    }));
  }, [parts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl sm:!max-w-5xl w-[92vw] max-h-[90vh] flex flex-col p-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              Stock In Received Items
            </DialogTitle>
            <DialogDescription>
              Record newly delivered parts and inventory supplies under a Purchase Order / DR reference.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ref_no">
                  PO / DR / Invoice Reference No. <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="ref_no"
                  placeholder="e.g. PO-2026-0812 or DR-99482"
                  value={referenceNo}
                  onChange={(e) => {
                    setReferenceNo(e.target.value);
                    if (submitted && errors.referenceNo) {
                      setErrors((prev) => ({ ...prev, referenceNo: undefined }));
                    }
                  }}
                  className={submitted && errors.referenceNo ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {submitted && errors.referenceNo && (
                  <p className="text-xs text-destructive">{errors.referenceNo}</p>
                )}
              </div>

              <div className="space-y-1.5 relative z-50">
                <Label htmlFor="branch_select">
                  Receiving Branch <span className="text-destructive font-bold">*</span>
                </Label>
                <SearchableBranchSelect
                  options={branchOptions}
                  value={branchId}
                  onValueChange={(val) => {
                    setBranchId(val);
                    if (submitted && errors.branchId) {
                      setErrors((prev) => ({ ...prev, branchId: undefined }));
                    }
                  }}
                  placeholder="Search branch name..."
                  className={`w-full ${
                    submitted && errors.branchId ? "border-destructive text-destructive" : ""
                  }`}
                />
                {submitted && errors.branchId && (
                  <p className="text-xs text-destructive">{errors.branchId}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="general_remarks">Batch Remarks (Optional)</Label>
                <Input
                  id="general_remarks"
                  placeholder="e.g. Delivery from Supplier ABC"
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Delivered Items List</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Another Item
                </Button>
              </div>

              <div className="border rounded-md divide-y bg-background">
                {items.map((item, idx) => {
                  const rowErr = errors.items?.[idx];
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                  const rowZIndex = 40 - idx;

                  return (
                    <div
                      key={idx}
                      style={{ zIndex: rowZIndex }}
                      className="p-3 bg-card/50 flex flex-col md:flex-row gap-3 items-start md:items-center relative"
                    >
                      <div className="flex-1 w-full min-w-[280px] space-y-1 relative">
                        <Label className="text-xs text-muted-foreground">
                          Part <span className="text-destructive font-bold">*</span>
                        </Label>
                        <SearchableBranchSelect
                          options={partOptions}
                          value={item.part_id}
                          onValueChange={(val) => handleItemChange(idx, "part_id", val)}
                          placeholder="Search part code or name..."
                          className={`h-9 text-xs w-full ${
                            submitted && rowErr?.part_id ? "border-destructive text-destructive" : ""
                          }`}
                        />
                        {submitted && rowErr?.part_id && (
                          <p className="text-[11px] text-destructive">{rowErr.part_id}</p>
                        )}
                      </div>

                      <div className="w-28 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Qty <span className="text-destructive font-bold">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className={`h-9 text-xs ${
                            submitted && rowErr?.quantity ? "border-destructive focus-visible:ring-destructive" : ""
                          }`}
                        />
                        {submitted && rowErr?.quantity && (
                          <p className="text-[11px] text-destructive">{rowErr.quantity}</p>
                        )}
                      </div>

                      <div className="w-36 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Unit Cost (₱) <span className="text-destructive font-bold">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_cost}
                          onChange={(e) => handleItemChange(idx, "unit_cost", e.target.value)}
                          className={`h-9 text-xs ${
                            submitted && rowErr?.unit_cost ? "border-destructive focus-visible:ring-destructive" : ""
                          }`}
                        />
                        {submitted && rowErr?.unit_cost && (
                          <p className="text-[11px] text-destructive">{rowErr.unit_cost}</p>
                        )}
                      </div>

                      <div className="flex-1 w-full min-w-[180px] space-y-1">
                        <Label className="text-xs text-muted-foreground">Item Remarks</Label>
                        <Input
                          placeholder="e.g. Batch # or note"
                          value={item.remarks}
                          onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="w-32 text-right self-center pt-3 md:pt-0">
                        <div className="text-[10px] text-muted-foreground">Line Total</div>
                        <div className="font-semibold text-sm">
                          ₱{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 self-center pt-2 md:pt-0"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center py-2 px-3 bg-muted/40 rounded-md border text-sm">
                <span className="font-medium text-muted-foreground">Grand Total Value:</span>
                <span className="font-bold text-base text-foreground">
                  ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-auto pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Processing..." : "Complete Stock In"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
