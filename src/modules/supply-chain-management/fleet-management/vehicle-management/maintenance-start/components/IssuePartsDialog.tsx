"use client";

import * as React from "react";
import type { VehicleJobOrder, VehiclePartOption, IssuePartsPayload } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "./SearchableSelect";
import { Plus, Trash2, AlertTriangle, AlertCircle, Building2, Play, PackageCheck } from "lucide-react";

interface IssuePartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
  parts: VehiclePartOption[];
  onSubmit: (payload: { issuePayload?: IssuePartsPayload; startMaintenance: boolean }) => Promise<void>;
  loading: boolean;
}

interface PartRow {
  part_id: number;
  quantity: number;
  unit_cost: number;
  remarks?: string;
}

export function IssuePartsDialog({
  open,
  onOpenChange,
  jobOrder,
  parts,
  onSubmit,
  loading,
}: IssuePartsDialogProps) {
  const [items, setItems] = React.useState<PartRow[]>([]);

  React.useEffect(() => {
    if (open && jobOrder) {
      if (jobOrder.parts && jobOrder.parts.length > 0) {
        setItems(
          jobOrder.parts.map((p) => {
            const req = Number(p.quantity_requested) || 0;
            const issued = Number(p.quantity_issued) || 0;
            const remaining = Math.max(1, req - issued);
            return {
              part_id: p.part_id,
              quantity: remaining,
              unit_cost: p.unit_cost || 0,
              remarks: p.remarks,
            };
          })
        );
      } else {
        setItems([]);
      }
    }
  }, [open, jobOrder]);

  if (!jobOrder) return null;

  const branch =
    typeof jobOrder.branch_id === "object" && jobOrder.branch_id !== null
      ? jobOrder.branch_id
      : null;
  const branchName =
    branch?.branch_name ||
    (jobOrder.branch_id
      ? `Branch #${typeof jobOrder.branch_id === "object" ? jobOrder.branch_id.id : jobOrder.branch_id}`
      : "Assigned Branch");

  const effectiveBranchId =
    typeof jobOrder.branch_id === "object" && jobOrder.branch_id !== null
      ? Number(jobOrder.branch_id.id)
      : Number(jobOrder.branch_id || 1);

  const partOptions = parts.map((p) => ({
    value: String(p.id),
    label: `${p.part_name} (${p.part_code}) - Stock: ${p.on_hand ?? 0}`,
  }));

  const handleAddRow = () => {
    setItems((prev) => [...prev, { part_id: 0, quantity: 1, unit_cost: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: keyof PartRow, value: string | number) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i === index) {
          if (field === "part_id") {
            const part = parts.find((p) => p.id === Number(value));
            return {
              ...row,
              part_id: Number(value),
              unit_cost: part?.unit_cost || 0,
            };
          }
          if (field === "quantity") {
            const parsedQty = Math.max(1, Math.floor(Number(value) || 0));
            return { ...row, quantity: parsedQty };
          }
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  // Stock guards and validations
  const validItems = items.filter((it) => it.part_id > 0 && it.quantity > 0);
  const hasValidItems = validItems.length > 0;

  // Check for any row with 0 available stock or quantity exceeding available stock
  const zeroStockItems = validItems.filter((row) => {
    const part = parts.find((p) => p.id === row.part_id);
    return !part || (part.on_hand ?? 0) <= 0;
  });

  const exceedingStockItems = validItems.filter((row) => {
    const part = parts.find((p) => p.id === row.part_id);
    return part && (part.on_hand ?? 0) > 0 && row.quantity > (part.on_hand ?? 0);
  });

  const hasStockErrors = zeroStockItems.length > 0 || exceedingStockItems.length > 0;

  const handleSubmitWithParts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidItems || hasStockErrors) return;

    // Consolidate duplicates to avoid state stacking multiplier
    const consolidatedMap = new Map<number, PartRow>();
    for (const it of validItems) {
      const existing = consolidatedMap.get(it.part_id);
      if (existing) {
        existing.quantity += it.quantity;
      } else {
        consolidatedMap.set(it.part_id, { ...it });
      }
    }

    await onSubmit({
      issuePayload: {
        job_order_id: jobOrder.id,
        branch_id: effectiveBranchId,
        items: Array.from(consolidatedMap.values()),
      },
      startMaintenance: true,
    });
    onOpenChange(false);
  };

  const handleStartWithoutParts = async () => {
    await onSubmit({
      startMaintenance: true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-purple-600 shrink-0" />
            <span>Part Allocation & Start Maintenance</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmitWithParts} className="space-y-4 pt-1 w-full min-w-0">
          <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1 w-full min-w-0">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">JO Reference:</span>
              <span className="font-semibold">{jobOrder.jo_no}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Vehicle:</span>
              <span>
                {(() => {
                  if (typeof jobOrder.vehicle_id !== "object" || jobOrder.vehicle_id === null) {
                    return `ID #${jobOrder.vehicle_id}`;
                  }
                  const v = jobOrder.vehicle_id;
                  const plate = v.vehicle_plate || v.plate_number || v.name || `Vehicle #${v.vehicle_id || v.id}`;
                  const details = [v.make, v.model].filter(Boolean).join(" ");
                  return details ? `${plate} (${details})` : plate;
                })()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/50 text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                Operational Branch:
              </span>
              <span className="font-medium text-foreground">{branchName}</span>
            </div>
          </div>

          {/* Zero-Stock Warning Banner */}
          {zeroStockItems.length > 0 && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Zero Stock Warning</strong>
                <span>
                  One or more selected parts have 0 available stock in {branchName}. You cannot issue parts with zero inventory.
                </span>
              </div>
            </div>
          )}

          {/* Insufficient Stock Warning Banner */}
          {exceedingStockItems.length > 0 && zeroStockItems.length === 0 && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong className="font-semibold block">Insufficient Stock Warning</strong>
                <span>
                  Requested quantity exceeds the available local branch stock. Please adjust issuance quantities.
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3 w-full min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Allocated Parts to Deduct & Issue</Label>
                <p className="text-[11px] text-muted-foreground">
                  Stock availability corresponds strictly to {branchName}.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8 text-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="p-4 text-center border border-dashed rounded-md bg-muted/20 text-xs text-muted-foreground">
                No parts initially requested for this job order. If replacement parts are needed, click &quot;Add Item&quot;, or proceed directly to start maintenance.
              </div>
            ) : (
              items.map((row, index) => {
                const selectedPart = parts.find((p) => p.id === row.part_id);
                const availableStock = selectedPart?.on_hand ?? 0;
                const isZeroStock = row.part_id > 0 && availableStock <= 0;
                const isExceeding = row.part_id > 0 && row.quantity > availableStock;

                return (
                  <div
                    key={index}
                    className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-md text-xs border transition-colors ${
                      isZeroStock
                        ? "bg-destructive/5 border-destructive/30"
                        : isExceeding
                        ? "bg-amber-500/5 border-amber-500/30"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="col-span-12 sm:col-span-6 space-y-1 min-w-0">
                      <Label className="text-[11px] text-muted-foreground">Part Catalogue</Label>
                      <SearchableSelect
                        options={partOptions}
                        value={row.part_id ? String(row.part_id) : ""}
                        onValueChange={(val) => handleUpdateRow(index, "part_id", val)}
                        placeholder="Select part catalogue..."
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-2 space-y-1 min-w-0">
                      <Label className="text-[11px] text-muted-foreground">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        className="h-9 text-xs"
                        value={row.quantity}
                        onChange={(e) => handleUpdateRow(index, "quantity", e.target.value)}
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3 space-y-1 min-w-0">
                      <Label className="text-[11px] text-muted-foreground">Local Available</Label>
                      <div
                        className={`h-9 flex items-center font-semibold text-xs ${
                          isZeroStock
                            ? "text-destructive"
                            : isExceeding
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {availableStock} in stock
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex justify-end pt-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveRow(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-3 border-t flex flex-col-reverse sm:flex-row gap-2 justify-between items-center">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {items.length === 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={handleStartWithoutParts}
                  className="gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  Start Without Parts
                </Button>
              )}
              {hasValidItems && (
                <Button
                  type="submit"
                  disabled={loading || hasStockErrors}
                  className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  {loading ? "Processing..." : "Allocate Parts & Start Maintenance"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
