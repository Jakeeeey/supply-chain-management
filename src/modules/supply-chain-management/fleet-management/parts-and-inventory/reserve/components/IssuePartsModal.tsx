"use client";

import * as React from "react";
import type { IssuePartsInput, JobOrderRef, VehicleRef } from "../types";
import type { VehiclePart } from "../../registration/types";
import type { Branch } from "../../stock-in/types";
import { SearchableSelect } from "./SearchableSelect";
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
import { Plus, Trash2, Wrench } from "lucide-react";

interface IssuePartsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrders: JobOrderRef[];
  parts: VehiclePart[];
  branches: Branch[];
  saving: boolean;
  onSave: (payload: IssuePartsInput) => Promise<boolean>;
}

interface ItemRowState {
  part_id: string;
  quantity: string;
  unit_cost: string;
  remarks: string;
}

export function IssuePartsModal({
  open,
  onOpenChange,
  jobOrders,
  parts,
  branches,
  saving,
  onSave,
}: IssuePartsModalProps) {
  const [jobOrderId, setJobOrderId] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [generalRemarks, setGeneralRemarks] = React.useState("");
  const [items, setItems] = React.useState<ItemRowState[]>([
    { part_id: "", quantity: "1", unit_cost: "0", remarks: "" },
  ]);

  const [errors, setErrors] = React.useState<{
    jobOrderId?: string;
    branchId?: string;
    items?: { [index: number]: { part_id?: string; quantity?: string; unit_cost?: string } };
  }>({});
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setJobOrderId("");
      setBranchId(branches.length > 0 ? String(branches[0].id) : "");
      setGeneralRemarks("");
      setItems([{ part_id: "", quantity: "1", unit_cost: "0", remarks: "" }]);
      setErrors({});
      setSubmitted(false);
    }
  }, [open, branches]);

  // When jobOrderId changes, auto-set branch if JO has branch_id
  const handleJoChange = (selectedJoId: string) => {
    setJobOrderId(selectedJoId);
    const jo = jobOrders.find((j) => String(j.id) === selectedJoId);
    if (jo?.branch_id) {
      const bId =
        typeof jo.branch_id === "object" && jo.branch_id !== null
          ? jo.branch_id.id
          : Number(jo.branch_id);
      setBranchId(String(bId));
    }
    if (submitted && errors.jobOrderId) {
      setErrors((prev) => ({ ...prev, jobOrderId: undefined }));
    }
  };

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
    let joError: string | undefined;
    let branchError: string | undefined;
    const itemErrors: { [index: number]: { part_id?: string; quantity?: string; unit_cost?: string } } = {};

    if (!jobOrderId) {
      joError = "Please select a target Job Order";
      isValid = false;
    }
    if (!branchId) {
      branchError = "Please select an issuing branch";
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

    setErrors({ jobOrderId: joError, branchId: branchError, items: itemErrors });
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validate()) return;

    const payload: IssuePartsInput = {
      job_order_id: Number(jobOrderId),
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

  const joOptions = React.useMemo(() => {
    return jobOrders.map((jo) => {
      const v = typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? (jo.vehicle_id as VehicleRef) : null;
      const vLabel = v?.plate_number ? ` [${v.plate_number}]` : "";
      return {
        value: String(jo.id),
        label: `${jo.jo_no}${vLabel} (${jo.status})`,
      };
    });
  }, [jobOrders]);

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

  const grandTotal = items.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const c = Number(item.unit_cost) || 0;
    return sum + q * c;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl sm:!max-w-5xl w-[92vw] max-h-[90vh] flex flex-col p-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Issue Parts to Job Order
            </DialogTitle>
            <DialogDescription>
              Select an approved Job Order to issue parts and automatically deduct from inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 relative z-50">
                <Label htmlFor="jo_select">
                  Select Job Order <span className="text-destructive font-bold">*</span>
                </Label>
                <SearchableSelect
                  options={joOptions}
                  value={jobOrderId}
                  onValueChange={handleJoChange}
                  placeholder="Search Job Order..."
                  className={`w-full ${
                    submitted && errors.jobOrderId ? "border-destructive text-destructive" : ""
                  }`}
                />
                {submitted && errors.jobOrderId && (
                  <p className="text-xs text-destructive">{errors.jobOrderId}</p>
                )}
              </div>

              <div className="space-y-1.5 relative z-50">
                <Label htmlFor="branch_select">
                  Issuing Branch <span className="text-destructive font-bold">*</span>
                </Label>
                <SearchableSelect
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
                <Label htmlFor="remarks">Issuance Notes (Optional)</Label>
                <Input
                  id="remarks"
                  placeholder="e.g. Issued to Mechanic Juan"
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Parts to Issue</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Another Part
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
                        <SearchableSelect
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
                          Qty to Issue <span className="text-destructive font-bold">*</span>
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
                        <Label className="text-xs text-muted-foreground">Part Notes</Label>
                        <Input
                          placeholder="Specific installation notes"
                          value={item.remarks}
                          onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="w-32 text-right self-center pt-3 md:pt-0">
                        <div className="text-[10px] text-muted-foreground">Total Cost</div>
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
                <span className="font-medium text-muted-foreground">Total Parts Value:</span>
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
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
              {saving ? "Processing..." : "Complete Parts Issuance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
