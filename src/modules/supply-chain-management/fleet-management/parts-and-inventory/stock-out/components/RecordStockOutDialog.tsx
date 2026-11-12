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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Branch } from "../../stock-in/types";
import type { VehiclePart } from "../../registration/types";
import type { PartStock } from "../../stock-monitoring/types";
import { fetchAvailableStock, submitStockOut } from "../provider/fetchProviders";
import { SearchableStockOutSelect } from "./SearchableStockOutSelect";
import { AlertCircle, AlertTriangle, Loader2, Plus, Trash2, Info, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface RecordStockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  onSuccess: () => void;
}

interface ItemRowState {
  part_id: string;
  quantity: string;
  unit_cost: number;
  remarks?: string;
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

  const [movementType, setMovementType] = React.useState<"Scrap" | "Damage" | "Disposal" | "Adjustment">("Scrap");
  const [referenceNo, setReferenceNo] = React.useState<string>("");
  const [generalRemarks, setGeneralRemarks] = React.useState<string>("");
  const [items, setItems] = React.useState<ItemRowState[]>([
    { part_id: "", quantity: "1", unit_cost: 0, remarks: "" },
  ]);

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
      setReferenceNo("");
      setGeneralRemarks("");
      setItems([{ part_id: "", quantity: "1", unit_cost: 0, remarks: "" }]);
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
      .then((stockItems) => {
        // Only keep items with positive on-hand stock
        setAvailableStock(stockItems.filter((item) => Number(item.on_hand) > 0));
      })
      .finally(() => setLoadingStock(false));
  }, [selectedBranchId]);

  // Helper to extract VehiclePart safely
  const getPartFromStock = (s: PartStock): VehiclePart | null => {
    return typeof s.part_id === "object" && s.part_id !== null ? (s.part_id as VehiclePart) : null;
  };

  // Quick lookup helper for stock item
  const findStockItemByPartId = React.useCallback(
    (partId: string) => {
      return availableStock.find((item) => {
        const p = getPartFromStock(item);
        const id = p ? p.id : Number(item.part_id);
        return String(id) === partId;
      });
    },
    [availableStock]
  );

  const handleAddItem = () => {
    setItems((prev) => [...prev, { part_id: "", quantity: "1", unit_cost: 0, remarks: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRowState, value: string | number) => {
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };

      if (field === "part_id") {
        const stock = findStockItemByPartId(String(value));
        const partObj = stock ? getPartFromStock(stock) : null;
        row.unit_cost = partObj ? Number(partObj.unit_cost || 0) : 0;
      }

      copy[index] = row;
      return copy;
    });

    if (submitted) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[`item_${index}_${field}`];
        return copy;
      });
    }
  };

  // Grand totals
  const totalQuantity = React.useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  }, [items]);

  const totalValuation = React.useMemo(() => {
    return items.reduce((acc, it) => {
      const q = Number(it.quantity) || 0;
      return acc + q * (it.unit_cost || 0);
    }, 0);
  }, [items]);

  const selectedBranchName = React.useMemo(() => {
    const b = branches.find((branch) => String(branch.id) === selectedBranchId);
    return b ? b.branch_name : `Branch #${selectedBranchId}`;
  }, [branches, selectedBranchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");

    const errors: Record<string, string> = {};

    if (!selectedBranchId) {
      errors.branch_id = "Please select a branch.";
    }

    if (!generalRemarks.trim()) {
      errors.remarks = "Please provide remarks / explanation for this outbound deduction.";
    }

    if (items.length === 0) {
      errors.items = "Please add at least one part.";
    }

    const selectedPartIds = new Set<string>();

    items.forEach((item, idx) => {
      if (!item.part_id) {
        errors[`item_${idx}_part_id`] = "Select a part";
        return;
      }

      if (selectedPartIds.has(item.part_id)) {
        errors[`item_${idx}_part_id`] = "Duplicate part";
      }
      selectedPartIds.add(item.part_id);

      const qty = Number(item.quantity);
      const stock = findStockItemByPartId(item.part_id);
      const maxAvailable = stock ? Number(stock.on_hand) : 0;

      if (!qty || qty <= 0) {
        errors[`item_${idx}_quantity`] = "Qty > 0";
      } else if (qty > maxAvailable) {
        errors[`item_${idx}_quantity`] = `Max ${maxAvailable}`;
      }
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted errors before confirming.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitStockOut({
        branch_id: Number(selectedBranchId),
        movement_type: movementType,
        reference_no: referenceNo.trim() || undefined,
        remarks: generalRemarks.trim(),
        items: items.map((it) => ({
          part_id: Number(it.part_id),
          quantity: Number(it.quantity),
          unit_cost: it.unit_cost,
          remarks: it.remarks || generalRemarks.trim(),
        })),
      });

      const assignedRef = result.reference_no || (referenceNo.trim() || "SO-BATCH");

      toast.success("Stock Out Recorded Successfully", {
        description: `Ref: ${assignedRef} • ${items.length} part(s) deducted from ${selectedBranchName}.`,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to record stock out");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl sm:!max-w-4xl w-[94vw] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Record Stock Out / Disposal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Deduct single or multiple parts from branch inventory due to scrap, damage, write-offs, or audit adjustments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
            {error && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Branch, Reason, and Reference Number Header Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Branch <span className="text-destructive font-bold">*</span>
                </Label>
                <SearchableStockOutSelect
                  options={branches.map((b) => ({ value: String(b.id), label: b.branch_name }))}
                  value={selectedBranchId}
                  onValueChange={(val) => {
                    setSelectedBranchId(val);
                    // Reset rows on branch change
                    setItems([{ part_id: "", quantity: "1", unit_cost: 0, remarks: "" }]);
                    if (submitted && fieldErrors.branch_id) {
                      setFieldErrors((prev) => ({ ...prev, branch_id: "" }));
                    }
                  }}
                  placeholder="Select Branch"
                  contentWidth="w-[260px]"
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
                  contentWidth="w-[220px]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Reference No.</Label>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </div>
                <Input
                  placeholder="e.g. DISPOSAL-2026-001"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Info className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">
                    {referenceNo.trim() ? (
                      "Using custom reference code"
                    ) : (
                      <>Auto-generates (e.g. <span className="font-mono font-medium">SO-XXXXXX</span>) if blank</>
                    )}
                  </span>
                </p>
              </div>
            </div>

            {/* Multi-Item Deduction Batch Table */}
            <div className="space-y-2 border rounded-md p-3 bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">
                    Parts to Deduct ({items.length}) <span className="text-destructive font-bold">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Select items and enter deduction quantities.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={loadingStock || availableStock.length === 0}
                  className="h-7 text-xs gap-1 font-medium border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  Add Another Part
                </Button>
              </div>

              {loadingStock ? (
                <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                  Loading available branch parts...
                </div>
              ) : availableStock.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                  No parts with on-hand inventory found in {selectedBranchName}.
                </div>
              ) : (
                <div className="rounded-md border bg-background overflow-hidden">
                  <div className="max-h-[340px] overflow-y-auto overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40 sticky top-0 z-10">
                        <TableRow className="text-[11px]">
                          <TableHead className="min-w-[280px]">Part *</TableHead>
                          <TableHead className="w-[100px] text-right">Available</TableHead>
                          <TableHead className="w-[100px] text-right">Qty *</TableHead>
                          <TableHead className="w-[110px] text-right">Unit Cost</TableHead>
                          <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                          <TableHead className="w-[44px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((row, idx) => {
                          const stock = findStockItemByPartId(row.part_id);
                          const partObj = stock ? getPartFromStock(stock) : null;
                          const maxAvailable = stock ? Number(stock.on_hand) : 0;
                          const unit = partObj?.unit || "pc";
                          const qtyNum = Number(row.quantity) || 0;
                          const subtotal = qtyNum * (row.unit_cost || 0);

                          const partError = fieldErrors[`item_${idx}_part_id`];
                          const qtyError = fieldErrors[`item_${idx}_quantity`];

                          return (
                            <TableRow key={idx} className="align-middle">
                              <TableCell className="p-2">
                                <SearchableStockOutSelect
                                  options={availableStock.map((s) => {
                                    const p = getPartFromStock(s);
                                    const id = p ? p.id : Number(s.part_id);
                                    const code = p?.part_code || `PRT-${id}`;
                                    const name = p?.part_name || "Unknown Part";
                                    return {
                                      value: String(id),
                                      label: `${code} — ${name}`,
                                    };
                                  })}
                                  value={row.part_id}
                                  onValueChange={(val) => handleItemChange(idx, "part_id", val)}
                                  placeholder="Select part..."
                                  contentWidth="w-[320px]"
                                  className={partError ? "border-destructive text-destructive h-8 text-xs" : "h-8 text-xs"}
                                />
                                {partError && <p className="text-[10px] text-destructive mt-0.5">{partError}</p>}
                              </TableCell>

                              <TableCell className="p-2 text-right text-xs">
                                {row.part_id ? (
                                  <span className="font-semibold text-foreground">
                                    {maxAvailable} <span className="text-[10px] text-muted-foreground font-normal">{unit}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>

                              <TableCell className="p-2 text-right">
                                <Input
                                  type="number"
                                  min="1"
                                  max={maxAvailable > 0 ? maxAvailable : undefined}
                                  value={row.quantity}
                                  onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                  placeholder="1"
                                  className={`h-8 text-xs font-mono text-right w-20 ml-auto ${
                                    qtyError ? "border-destructive focus-visible:ring-destructive" : ""
                                  }`}
                                />
                                {qtyError && <p className="text-[10px] text-destructive mt-0.5">{qtyError}</p>}
                              </TableCell>

                              <TableCell className="p-2 text-right text-xs font-mono text-muted-foreground">
                                ₱{row.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>

                              <TableCell className="p-2 text-right text-xs font-mono font-semibold text-foreground">
                                ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>

                              <TableCell className="p-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={items.length <= 1}
                                  onClick={() => handleRemoveItem(idx)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Totals Summary Footer */}
              {items.length > 0 && (
                <div className="flex flex-wrap items-center justify-between pt-2 px-1 text-xs gap-2">
                  <span className="text-muted-foreground">
                    Total Items: <strong className="text-foreground">{items.length}</strong> | Total Units:{" "}
                    <strong className="text-foreground">{totalQuantity}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Est. Total Valuation:{" "}
                    <strong className="text-rose-600 font-mono text-sm">
                      ₱{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Remarks / Explanation <span className="text-destructive font-bold">*</span>
              </Label>
              <Textarea
                placeholder="State the reason for scrap or write-off (e.g. broken casing, water damage, obsolete batch)..."
                value={generalRemarks}
                onChange={(e) => {
                  setGeneralRemarks(e.target.value);
                  if (submitted && fieldErrors.remarks) {
                    setFieldErrors((prev) => ({ ...prev, remarks: "" }));
                  }
                }}
                className={`text-xs min-h-[56px] ${
                  submitted && fieldErrors.remarks ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              {submitted && fieldErrors.remarks && (
                <p className="text-[11px] text-destructive">{fieldErrors.remarks}</p>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t mt-2">
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
              disabled={submitting || items.length === 0}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Processing Stock Out...
                </>
              ) : (
                `Confirm Stock Out (${items.length} item${items.length > 1 ? "s" : ""})`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
