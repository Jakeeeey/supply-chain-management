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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchableSelect } from "./SearchableSelect";
import { AlertCircle, Calendar as CalendarIcon, Loader2, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { ReorderTriggerItem, PurchaseRequestPriority, Supplier } from "../types";
import type { Branch } from "../../stock-in/types";
import type { VehiclePart } from "../../registration/types";
import { createPurchaseRequest } from "../provider/fetchProviders";

interface BulkPurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: ReorderTriggerItem[];
  branches: Branch[];
  parts?: VehiclePart[];
  suppliers?: Supplier[];
  onSuccess: () => void;
}

interface EditableBulkItem {
  part_id: number;
  part_code: string;
  part_name: string;
  unit: string;
  unit_cost: number;
  on_hand?: number;
  quantity: number;
}

export function BulkPurchaseRequestDialog({
  open,
  onOpenChange,
  selectedItems,
  branches,
  parts = [],
  suppliers = [],
  onSuccess,
}: BulkPurchaseRequestDialogProps) {
  const [items, setItems] = React.useState<EditableBulkItem[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");
  const [priority, setPriority] = React.useState<PurchaseRequestPriority>("Normal");
  const [supplierId, setSupplierId] = React.useState<string>("");
  const [expectedDate, setExpectedDate] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [selectedPartToAdd, setSelectedPartToAdd] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      setError("");
      setSupplierId("");
      setExpectedDate("");
      setNotes("");

      // Initialize items from selection
      const initItems: EditableBulkItem[] = selectedItems.map((t) => ({
        part_id: t.part_id,
        part_code: t.part_code,
        part_name: t.part_name,
        unit: t.unit || "pc",
        unit_cost: Number(t.unit_cost) || 0,
        on_hand: t.on_hand,
        quantity: Math.max(1, t.suggested_quantity || 10),
      }));
      setItems(initItems);

      // Default branch from first item, or first available branch
      if (selectedItems.length > 0) {
        setBranchId(String(selectedItems[0].branch_id));
      } else if (branches.length > 0) {
        setBranchId(String(branches[0].id));
      }

      // If any critical, default to Critical/Urgent
      const hasCritical = selectedItems.some((i) => i.on_hand <= 0);
      setPriority(hasCritical ? "Critical" : "Normal");
    }
  }, [open, selectedItems, branches]);

  const branchOptions = React.useMemo(() => {
    return branches.map((b) => ({
      value: String(b.id),
      label: b.branch_name,
    }));
  }, [branches]);

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

  // Available catalog parts that can be added
  const availablePartsToAdd = React.useMemo(() => {
    const existingPartIds = new Set(items.map((i) => i.part_id));
    return parts
      .filter((p) => !existingPartIds.has(Number(p.id)))
      .map((p) => ({
        value: String(p.id),
        label: `${p.part_code} — ${p.part_name} (₱${Number(p.unit_cost || 0).toLocaleString()})`,
      }));
  }, [parts, items]);

  const handleAddPart = () => {
    if (!selectedPartToAdd) return;
    const p = parts.find((pt) => String(pt.id) === selectedPartToAdd);
    if (!p) return;

    setItems((prev) => [
      ...prev,
      {
        part_id: Number(p.id),
        part_code: p.part_code,
        part_name: p.part_name,
        unit: p.unit || "pc",
        unit_cost: Number(p.unit_cost) || 0,
        on_hand: 0,
        quantity: Math.max(1, Number(p.reorder_point || 10)),
      },
    ]);
    setSelectedPartToAdd("");
  };

  const handleQuantityChange = (partId: number, val: string) => {
    const num = parseInt(val, 10);
    setItems((prev) =>
      prev.map((it) => {
        if (it.part_id === partId) {
          return { ...it, quantity: isNaN(num) ? 0 : Math.max(0, num) };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (partId: number) => {
    setItems((prev) => prev.filter((it) => it.part_id !== partId));
  };

  const totalEstimatedCost = React.useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantity * it.unit_cost), 0);
  }, [items]);

  const totalQuantity = React.useMemo(() => {
    return items.reduce((acc, it) => acc + it.quantity, 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!branchId) {
      setError("Please select a target branch for this purchase request.");
      return;
    }

    if (items.length === 0) {
      setError("Please select at least one part item to reorder.");
      return;
    }

    if (!supplierId) {
      setError("Please select a supplier for this purchase request.");
      return;
    }

    const invalidItem = items.find((it) => !it.quantity || it.quantity <= 0);
    if (invalidItem) {
      setError(`Quantity for ${invalidItem.part_name} must be greater than 0.`);
      return;
    }

    setSubmitting(true);
    try {
      await createPurchaseRequest({
        branch_id: Number(branchId),
        priority,
        supplier_id: Number(supplierId),
        supplier_name: selectedSupplier ? selectedSupplier.supplier_name : undefined,
        expected_delivery_date: expectedDate || undefined,
        notes: notes.trim() || `Bulk Purchase Request (${items.length} items)`,
        estimated_cost: totalEstimatedCost,
        items: items.map((it) => ({
          part_id: it.part_id,
          quantity: it.quantity,
          unit_cost: it.unit_cost,
          remarks: `Bulk PO item`,
        })),
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to create bulk purchase request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Bulk Purchase Request / Replenishment
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review selected parts and create a single consolidated purchase order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 flex-1 overflow-y-auto">
          {error && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Top Options: Branch, Priority, Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Branch *</Label>
              <SearchableSelect
                options={branchOptions}
                value={branchId}
                onValueChange={setBranchId}
                placeholder="Select Branch..."
                contentWidth="w-[280px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PurchaseRequestPriority)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="Urgent" className="text-xs">Urgent</SelectItem>
                  <SelectItem value="Critical" className="text-xs">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Supplier <span className="text-destructive font-bold">*</span>
              </Label>
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="Select supplier..."
                contentWidth="w-[280px]"
              />
            </div>
          </div>

          {/* Add Part to Batch Selector & Table */}
          <div className="space-y-2 pt-1 border-t">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <Label className="text-xs font-semibold">
                Parts to Order ({items.length})
              </Label>
              <span className="text-xs font-medium text-muted-foreground">
                Total Qty: <strong className="text-foreground">{totalQuantity}</strong> | Est. Cost:{" "}
                <strong className="text-primary font-mono">
                  ₱{totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>

            {/* Quick Part Adder */}
            {availablePartsToAdd.length > 0 && (
              <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-md border">
                <div className="flex-1">
                  <SearchableSelect
                    options={availablePartsToAdd}
                    value={selectedPartToAdd}
                    onValueChange={setSelectedPartToAdd}
                    placeholder="Search catalog part to add to this bulk PO..."
                    contentWidth="w-[320px] sm:w-[420px]"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddPart}
                  disabled={!selectedPartToAdd}
                  className="h-9 text-xs gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Part
                </Button>
              </div>
            )}

            <div className="rounded-md border max-h-56 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px]">
                    <TableHead>Part Code & Name</TableHead>
                    <TableHead className="text-right w-20">On-Hand</TableHead>
                    <TableHead className="text-right w-24">Unit Cost</TableHead>
                    <TableHead className="w-28 text-center">Order Qty</TableHead>
                    <TableHead className="text-right w-28">Subtotal</TableHead>
                    <TableHead className="w-10 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const subtotal = it.quantity * it.unit_cost;
                    return (
                      <TableRow key={it.part_id}>
                        <TableCell className="py-2">
                          <div className="text-xs font-mono font-medium">{it.part_code}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {it.part_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs py-2">
                          {it.on_hand ?? 0} <span className="text-[10px] text-muted-foreground">{it.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 font-mono">
                          ₱{it.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={it.quantity || ""}
                            onChange={(e) =>
                              handleQuantityChange(it.part_id, e.target.value)
                            }
                            className="h-7 w-20 mx-auto text-xs text-center font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 font-mono font-medium">
                          ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(it.part_id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            title="Remove from batch"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                        No parts selected. Please select items from the table.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Delivery Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <span className="flex-1 truncate">Pick delivery date</span>
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
              <Label className="text-xs font-semibold">Notes / Purpose (Optional)</Label>
              <Textarea
                placeholder="Consolidated procurement justification or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 min-h-[36px] text-xs resize-none"
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
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || items.length === 0}
              className="h-9 text-xs gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting Order...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Submit Consolidated PO ({items.length} parts)
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
