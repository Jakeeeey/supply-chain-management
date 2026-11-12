"use client";

import * as React from "react";
import type { VehicleJobOrder, VehiclePartOption, CompleteJOPayload, AdditionalPartDiff } from "../types";
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
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "./SearchableSelect";
import { CheckCheck, Plus, Trash2, AlertTriangle, AlertCircle, Building2, PackageCheck } from "lucide-react";

interface CompleteJODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
  parts: VehiclePartOption[];
  onSubmit: (payload: CompleteJOPayload) => Promise<void>;
  loading: boolean;
}

interface PartRowState {
  part_id: number;
  initial_issued: number;
  actual_used: number;
  unit_cost: number;
  remarks?: string;
  is_new_addition?: boolean;
}

export function CompleteJODialog({
  open,
  onOpenChange,
  jobOrder,
  parts,
  onSubmit,
  loading,
}: CompleteJODialogProps) {
  const [remarks, setRemarks] = React.useState<string>("");
  const [laborCost, setLaborCost] = React.useState<string>("");
  const [finalOdometer, setFinalOdometer] = React.useState<string>("");
  const [partRows, setPartRows] = React.useState<PartRowState[]>([]);

  React.useEffect(() => {
    if (open && jobOrder) {
      setRemarks("");
      setLaborCost("");
      setFinalOdometer(
        jobOrder.odometer_reading ? String(jobOrder.odometer_reading) : ""
      );

      // Pre-fill previously allocated / issued parts from start phase
      if (jobOrder.parts && jobOrder.parts.length > 0) {
        setPartRows(
          jobOrder.parts.map((p) => {
            const issued = Number(p.quantity_issued || p.quantity_requested || 0);
            return {
              part_id: p.part_id,
              initial_issued: issued,
              actual_used: issued,
              unit_cost: Number(p.unit_cost) || 0,
              remarks: p.remarks,
              is_new_addition: false,
            };
          })
        );
      } else {
        setPartRows([]);
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

  const partOptions = parts.map((p) => ({
    value: String(p.id),
    label: `${p.part_name} (${p.part_code}) - Stock: ${p.on_hand ?? 0}`,
  }));

  const handleAddPartRow = () => {
    setPartRows((prev) => [
      ...prev,
      {
        part_id: 0,
        initial_issued: 0,
        actual_used: 1,
        unit_cost: 0,
        is_new_addition: true,
      },
    ]);
  };

  const handleRemovePartRow = (index: number) => {
    setPartRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePartRow = (
    index: number,
    field: "part_id" | "actual_used",
    value: string | number
  ) => {
    setPartRows((prev) =>
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
          if (field === "actual_used") {
            const parsed = Math.max(0, Math.floor(Number(value) || 0));
            return {
              ...row,
              actual_used: parsed,
            };
          }
        }
        return row;
      })
    );
  };

  // Stock checks for any difference (difference = actual_used - initial_issued)
  const rowsWithDiff = partRows.map((r) => {
    const diff = Math.max(0, r.actual_used - r.initial_issued);
    const catalogPart = parts.find((p) => p.id === r.part_id);
    const availableStock = catalogPart?.on_hand ?? 0;
    const isExceedingStock = r.part_id > 0 && diff > availableStock;
    const isZeroStockForNew = r.part_id > 0 && diff > 0 && availableStock <= 0;
    return {
      ...r,
      diff,
      availableStock,
      isExceedingStock,
      isZeroStockForNew,
    };
  });

  const hasExceedingStockErrors = rowsWithDiff.some((r) => r.isExceedingStock);
  const totalAdditionalItemsCount = rowsWithDiff.reduce((acc, curr) => acc + curr.diff, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim() || hasExceedingStockErrors) return;

    // Filter only items with positive difference to deduct
    const additionalPartsPayload: AdditionalPartDiff[] = rowsWithDiff
      .filter((r) => r.part_id > 0 && r.diff > 0)
      .map((r) => ({
        part_id: r.part_id,
        quantity_diff: r.diff,
        unit_cost: r.unit_cost,
        remarks: `Additional quantity recorded at completion: +${r.diff}`,
      }));

    await onSubmit({
      job_order_id: jobOrder.id,
      completion_remarks: remarks,
      labor_cost: laborCost ? Number(laborCost) : 0,
      final_odometer: finalOdometer ? Number(finalOdometer) : undefined,
      additional_parts: additionalPartsPayload,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Complete &amp; Close Job Order</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 w-full min-w-0">
          <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1 w-full min-w-0">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">JO Number:</span>
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

          {/* Warning banner if any difference exceeds available inventory stock */}
          {hasExceedingStockErrors && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Stock Shortage on Additional Parts</strong>
                <span>
                  The additional or exceeded quantity exceeds available local branch inventory. Please adjust quantities before completing.
                </span>
              </div>
            </div>
          )}

          {/* Parts review & additional parts section */}
          <div className="space-y-2.5 w-full min-w-0 border rounded-md p-3 bg-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  Parts Allocation Review &amp; Difference Tracking
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Review allocated parts or log additional parts used. The difference will be automatically deducted.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPartRow}
                className="h-7 text-xs shrink-0"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Part
              </Button>
            </div>

            {partRows.length === 0 ? (
              <div className="p-3 text-center border border-dashed rounded-md bg-muted/20 text-xs text-muted-foreground">
                No parts were initially allocated. If additional parts were consumed during repair, click &quot;Add Part&quot;.
              </div>
            ) : (
              <div className="space-y-2">
                {rowsWithDiff.map((row, index) => {
                  const catalogPart = parts.find((p) => p.id === row.part_id);
                  const partDisplayName = catalogPart
                    ? `${catalogPart.part_name} (${catalogPart.part_code})`
                    : `Part ID #${row.part_id}`;

                  return (
                    <div
                      key={index}
                      className={`grid grid-cols-12 gap-2 items-center p-2 rounded-md text-xs border ${
                        row.isExceedingStock
                          ? "bg-destructive/5 border-destructive/30"
                          : row.diff > 0
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-background border-border"
                      }`}
                    >
                      {/* Part Selector / Display */}
                      <div className="col-span-12 sm:col-span-5 min-w-0">
                        {row.is_new_addition ? (
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Select Additional Part</Label>
                            <SearchableSelect
                              options={partOptions}
                              value={row.part_id ? String(row.part_id) : ""}
                              onValueChange={(val) => handleUpdatePartRow(index, "part_id", val)}
                              placeholder="Select part catalogue..."
                            />
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Allocated Part</span>
                            <div className="font-medium text-foreground truncate" title={partDisplayName}>
                              {partDisplayName}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Initially Issued */}
                      <div className="col-span-4 sm:col-span-2 min-w-0 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">Allocated</span>
                        <div className="h-8 flex items-center font-medium text-muted-foreground">
                          {row.initial_issued} issued
                        </div>
                      </div>

                      {/* Actual Used Input */}
                      <div className="col-span-4 sm:col-span-2 min-w-0 space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Actual Used</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-xs"
                          value={row.actual_used}
                          onChange={(e) => handleUpdatePartRow(index, "actual_used", e.target.value)}
                        />
                      </div>

                      {/* Difference to Deduct */}
                      <div className="col-span-3 sm:col-span-2 min-w-0 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">Difference</span>
                        <div
                          className={`h-8 flex items-center font-semibold text-xs ${
                            row.diff > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                          }`}
                        >
                          {row.diff > 0 ? `+${row.diff} to deduct` : "No change"}
                        </div>
                      </div>

                      {/* Actions (Delete only for newly added rows) */}
                      <div className="col-span-1 flex justify-end">
                        {row.is_new_addition && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleRemovePartRow(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {totalAdditionalItemsCount > 0 && (
                  <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2 rounded flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      A total difference of <strong>{totalAdditionalItemsCount} additional part item(s)</strong> will be deducted from {branchName}&apos;s inventory.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5 w-full min-w-0">
            <Label htmlFor="completionRemarks">
              Completion Remarks <span className="text-destructive font-bold">*</span>
            </Label>
            <Textarea
              id="completionRemarks"
              placeholder="Summary of repair actions done, test drive results, or maintenance notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              required
              className="w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] [word-break:break-word] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 w-full min-w-0">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="laborCost">Labor Cost (₱)</Label>
              <Input
                id="laborCost"
                type="number"
                placeholder="0.00"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                className="w-full min-w-0"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="finalOdometer">Post-Service Odometer (km)</Label>
              <Input
                id="finalOdometer"
                type="number"
                placeholder="e.g. 45200"
                value={finalOdometer}
                onChange={(e) => setFinalOdometer(e.target.value)}
                className="w-full min-w-0"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !remarks.trim() || hasExceedingStockErrors}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Closing JO..." : "Complete & Close JO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
