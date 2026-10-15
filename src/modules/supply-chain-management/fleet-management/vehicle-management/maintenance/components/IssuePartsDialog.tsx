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
import { Plus, Trash2, PackageCheck, AlertCircle } from "lucide-react";

interface IssuePartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
  parts: VehiclePartOption[];
  onSubmit: (payload: IssuePartsPayload) => Promise<void>;
  loading: boolean;
}

export function IssuePartsDialog({
  open,
  onOpenChange,
  jobOrder,
  parts,
  onSubmit,
  loading,
}: IssuePartsDialogProps) {
  const [itemsToIssue, setItemsToIssue] = React.useState<
    Array<{ part_id: number; quantity: number; unit_cost: number; remarks: string }>
  >([]);

  const partOptions = React.useMemo(() => {
    return parts.map((p) => ({
      value: String(p.id),
      label: `${p.part_name} (${p.part_code}) - Stock: ${p.on_hand ?? 0}`,
    }));
  }, [parts]);

  // Prepopulate from job order's requested parts if any
  React.useEffect(() => {
    if (open && jobOrder) {
      if (jobOrder.parts && jobOrder.parts.length > 0) {
        setItemsToIssue(
          jobOrder.parts.map((p) => {
            const remainingToIssue = Math.max(0, (p.quantity_requested || 0) - (p.quantity_issued || 0));
            return {
              part_id: p.part_id,
              quantity: remainingToIssue > 0 ? remainingToIssue : 1,
              unit_cost: p.unit_cost || 0,
              remarks: p.remarks || "",
            };
          })
        );
      } else {
        setItemsToIssue([{ part_id: 0, quantity: 1, unit_cost: 0, remarks: "" }]);
      }
    }
  }, [open, jobOrder]);

  if (!jobOrder) return null;

  const handleAddRow = () => {
    setItemsToIssue((prev) => [
      ...prev,
      { part_id: 0, quantity: 1, unit_cost: 0, remarks: "" },
    ]);
  };

  const handleUpdateRow = (index: number, field: string, val: unknown) => {
    setItemsToIssue((prev) => {
      const next = [...prev];
      if (field === "part_id") {
        const found = parts.find((p) => Number(p.id) === Number(val));
        next[index] = {
          ...next[index],
          part_id: Number(val),
          unit_cost: found ? Number(found.unit_cost) || 0 : 0,
        };
      } else {
        next[index] = { ...next[index], [field]: val };
      }
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    setItemsToIssue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = itemsToIssue.filter((item) => item.part_id > 0 && item.quantity > 0);
    if (validItems.length === 0) return;

    await onSubmit({
      job_order_id: jobOrder.id,
      branch_id: jobOrder.branch_id || 1,
      items: validItems,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-amber-600" />
            Issue Parts from Inventory
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">JO Reference:</span>
              <span className="font-semibold">{jobOrder.jo_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span>
                {typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null
                  ? `${jobOrder.vehicle_id.plate_number} (${jobOrder.vehicle_id.make} ${jobOrder.vehicle_id.model})`
                  : `ID #${jobOrder.vehicle_id}`}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Parts to Deduct & Issue</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {itemsToIssue.map((row, index) => {
              const selectedPart = parts.find((p) => p.id === row.part_id);
              const onHand = selectedPart?.on_hand ?? 0;
              const hasInsufficientStock = row.quantity > onHand;

              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center bg-card border p-3 rounded-md shadow-sm"
                >
                  <div className="col-span-6 space-y-1">
                    <Label className="text-xs text-muted-foreground">Part Catalogue</Label>
                    <SearchableSelect
                      options={partOptions}
                      value={row.part_id ? String(row.part_id) : ""}
                      onValueChange={(val) => handleUpdateRow(index, "part_id", val)}
                      placeholder="Select part..."
                      triggerClassName="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-xs"
                      value={row.quantity}
                      onChange={(e) =>
                        handleUpdateRow(index, "quantity", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Available</Label>
                    <div className="text-xs pt-1.5">
                      <span
                        className={`font-semibold ${
                          hasInsufficientStock ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {onHand} in stock
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveRow(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {hasInsufficientStock && (
                    <div className="col-span-12 flex items-center gap-1.5 text-xs text-destructive mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Requested quantity exceeds available on-hand stock!
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || itemsToIssue.length === 0}>
              {loading ? "Issuing Parts..." : "Issue & Deduct Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
