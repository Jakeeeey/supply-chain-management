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
import { PackageCheck, Plus, Trash2 } from "lucide-react";

interface IssuePartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
  parts: VehiclePartOption[];
  onSubmit: (payload: IssuePartsPayload) => Promise<void>;
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
          jobOrder.parts.map((p) => ({
            part_id: p.part_id,
            quantity: p.quantity_requested,
            unit_cost: p.unit_cost,
            remarks: p.remarks,
          }))
        );
      } else {
        setItems([{ part_id: 0, quantity: 1, unit_cost: 0 }]);
      }
    }
  }, [open, jobOrder]);

  if (!jobOrder) return null;

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
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const validItems = items.filter((it) => it.part_id > 0 && it.quantity > 0);
  const hasValidItems = validItems.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidItems) return;

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

            {items.map((row, index) => {
              const selectedPart = parts.find((p) => p.id === row.part_id);
              const availableStock = selectedPart?.on_hand ?? 0;

              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center bg-muted/40 p-2.5 rounded-md text-xs"
                >
                  <div className="col-span-6 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Part Catalogue</Label>
                    <SearchableSelect
                      options={partOptions}
                      value={row.part_id ? String(row.part_id) : ""}
                      onValueChange={(val) => handleUpdateRow(index, "part_id", val)}
                      placeholder="Select part catalogue..."
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-9 text-xs"
                      value={row.quantity}
                      onChange={(e) => handleUpdateRow(index, "quantity", Number(e.target.value))}
                    />
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Available</Label>
                    <div
                      className={`h-9 flex items-center font-medium ${
                        row.quantity > availableStock ? "text-destructive" : "text-emerald-600"
                      }`}
                    >
                      {availableStock} in stock
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveRow(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasValidItems}
              className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Issue & Deduct Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
