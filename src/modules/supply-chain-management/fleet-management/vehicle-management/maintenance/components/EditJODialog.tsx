"use client";

import * as React from "react";
import type {
  VehicleJobOrder,
  VehicleOption,
  VehiclePartOption,
  BranchOption,
  VehicleJOTypeOption,
  UpdateJORequestPayload,
  JOType,
  JOPriority,
} from "../types";
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
import { Plus, Trash2, Package, Pencil } from "lucide-react";

interface EditJODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
  vehicles: VehicleOption[];
  parts: VehiclePartOption[];
  branches: BranchOption[];
  joTypes?: VehicleJOTypeOption[];
  onBranchChange?: (branchId: number | string) => void;
  onSubmit: (payload: UpdateJORequestPayload) => Promise<void>;
  loading: boolean;
}

export function EditJODialog({
  open,
  onOpenChange,
  jobOrder,
  vehicles,
  parts,
  branches,
  joTypes = [],
  onBranchChange,
  onSubmit,
  loading,
}: EditJODialogProps) {
  const [branchId, setBranchId] = React.useState<string>("");
  const [vehicleId, setVehicleId] = React.useState<string>("");
  const [joType, setJoType] = React.useState<JOType>("Repair");
  const [priority, setPriority] = React.useState<JOPriority>("Normal");
  const [odometer, setOdometer] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");

  const [requestedParts, setRequestedParts] = React.useState<
    Array<{ part_id: number; quantity: number; unit_cost: number; remarks: string }>
  >([]);

  React.useEffect(() => {
    if (open && jobOrder) {
      const vId =
        typeof jobOrder.vehicle_id === "object" && jobOrder.vehicle_id !== null
          ? String(jobOrder.vehicle_id.id || jobOrder.vehicle_id.vehicle_id)
          : String(jobOrder.vehicle_id || "");

      const bId =
        typeof jobOrder.branch_id === "object" && jobOrder.branch_id !== null
          ? String(jobOrder.branch_id.id)
          : String(jobOrder.branch_id || "");

      setVehicleId(vId);
      setBranchId(bId);
      setJoType(jobOrder.jo_type || "Repair");
      setPriority(jobOrder.priority || "Normal");
      setOdometer(jobOrder.odometer_reading ? String(jobOrder.odometer_reading) : "");
      setDescription(jobOrder.description || "");

      if (bId && onBranchChange) {
        onBranchChange(bId);
      }

      if (jobOrder.parts && jobOrder.parts.length > 0) {
        setRequestedParts(
          jobOrder.parts.map((p) => ({
            part_id: p.part_id,
            quantity: Number(p.quantity_requested) || 1,
            unit_cost: Number(p.unit_cost) || 0,
            remarks: p.remarks || "",
          }))
        );
      } else {
        setRequestedParts([]);
      }
    }
  }, [open, jobOrder]);

  if (!jobOrder) return null;

  const handleBranchChange = (val: string) => {
    setBranchId(val);
    if (onBranchChange && val) {
      onBranchChange(val);
    }
  };

  const handleVehicleChange = (val: string) => {
    setVehicleId(val);
    const selectedVeh = vehicles.find((v) => String(v.vehicle_id || v.id) === val);
    const mileage = selectedVeh?.current_mileage ?? selectedVeh?.odometer;
    if (mileage !== undefined && mileage !== null) {
      setOdometer(String(mileage));
    }
    if (selectedVeh?.branch_id && !branchId) {
      const bId =
        typeof selectedVeh.branch_id === "object"
          ? String(selectedVeh.branch_id.id)
          : String(selectedVeh.branch_id);
      if (bId) {
        setBranchId(bId);
        if (onBranchChange) {
          onBranchChange(bId);
        }
      }
    }
  };

  const branchOptions = React.useMemo(() => {
    return branches.map((b) => ({
      value: String(b.id),
      label: b.branch_code ? `${b.branch_name} (${b.branch_code})` : b.branch_name,
    }));
  }, [branches]);

  const vehicleOptions = React.useMemo(() => {
    return vehicles.map((v) => {
      const id = v.vehicle_id || v.id;
      const plate = v.vehicle_plate || v.plate_number || `Vehicle #${id}`;
      const desc = [v.make, v.model].filter(Boolean).join(" ") || v.name || "";
      return {
        value: String(id),
        label: `${plate}${desc ? ` - ${desc}` : ""}`,
      };
    });
  }, [vehicles]);

  const joTypeOptions = React.useMemo(() => {
    if (joTypes && joTypes.length > 0) {
      return joTypes.map((t) => ({ value: t.type, label: t.type }));
    }
    return [
      { value: "Repair", label: "Repair" },
      { value: "Preventive Maintenance", label: "Preventive Maintenance" },
      { value: "Inspection", label: "Inspection" },
    ];
  }, [joTypes]);

  const priorityOptions = [
    { value: "Low", label: "Low" },
    { value: "Normal", label: "Normal" },
    { value: "High", label: "High" },
    { value: "Urgent", label: "Urgent" },
  ];

  const partOptions = React.useMemo(() => {
    return parts.map((p) => ({
      value: String(p.id),
      label: `${p.part_name} (${p.part_code}) - Stock: ${p.on_hand ?? 0}`,
    }));
  }, [parts]);

  const handleAddPartRow = () => {
    setRequestedParts((prev) => [
      ...prev,
      { part_id: 0, quantity: 1, unit_cost: 0, remarks: "" },
    ]);
  };

  const handleUpdatePartRow = (index: number, field: string, val: unknown) => {
    setRequestedParts((prev) => {
      const next = [...prev];
      if (field === "part_id") {
        const selectedPart = parts.find((p) => Number(p.id) === Number(val));
        next[index] = {
          ...next[index],
          part_id: Number(val),
          unit_cost: selectedPart ? Number(selectedPart.unit_cost) || 0 : 0,
        };
      } else if (field === "quantity") {
        next[index] = {
          ...next[index],
          quantity: Math.max(1, Number(val) || 1),
        };
      } else if (field === "remarks") {
        next[index] = {
          ...next[index],
          remarks: String(val || ""),
        };
      }
      return next;
    });
  };

  const handleRemovePartRow = (index: number) => {
    setRequestedParts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !description.trim()) return;

    const validParts = requestedParts
      .filter((p) => p.part_id > 0 && p.quantity > 0)
      .map((p) => ({
        part_id: p.part_id,
        quantity_requested: p.quantity,
        unit_cost: p.unit_cost,
        remarks: p.remarks,
      }));

    await onSubmit({
      job_order_id: jobOrder.id,
      vehicle_id: Number(vehicleId),
      branch_id: branchId ? Number(branchId) : 1,
      jo_type: joType,
      priority,
      description,
      odometer_reading: odometer ? Number(odometer) : undefined,
      parts: validParts,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-amber-600 shrink-0" />
            <span>Edit Job Order Request ({jobOrder.jo_no})</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 w-full min-w-0">
          {/* Branch & Vehicle Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold">
                Branch <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={branchOptions}
                value={branchId}
                onValueChange={handleBranchChange}
                placeholder="Select branch..."
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold">
                Vehicle <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={vehicleOptions}
                value={vehicleId}
                onValueChange={handleVehicleChange}
                placeholder="Select vehicle..."
              />
            </div>
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full min-w-0">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold">
                JO Type <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={joTypeOptions}
                value={joType}
                onValueChange={(val) => setJoType(val)}
                placeholder="Select type..."
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold">Priority</Label>
              <SearchableSelect
                options={priorityOptions}
                value={priority}
                onValueChange={(val) => setPriority(val as JOPriority)}
                placeholder="Select priority..."
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="editOdometer" className="text-xs font-semibold">
                Current Odometer (km)
              </Label>
              <Input
                id="editOdometer"
                type="number"
                placeholder="e.g. 45000"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 w-full min-w-0">
            <Label htmlFor="editDescription" className="text-xs font-semibold">
              Issue / Maintenance Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="editDescription"
              placeholder="Describe symptoms, repair requirements, or scheduled maintenance items..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] [word-break:break-word] resize-y"
            />
          </div>

          {/* Parts Section */}
          <div className="space-y-2 border-t pt-3 w-full min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-purple-600" />
                  Initial Parts Needed (Optional)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Check available stock directly from vehicle parts catalogue.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPartRow}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Part
              </Button>
            </div>

            {requestedParts.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {requestedParts.map((row, idx) => {
                  const selectedPart = parts.find((p) => Number(p.id) === Number(row.part_id));
                  const stock = selectedPart ? selectedPart.on_hand ?? 0 : 0;
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded-md text-xs border"
                    >
                      <div className="col-span-12 sm:col-span-6 min-w-0">
                        <SearchableSelect
                          options={partOptions}
                          value={row.part_id ? String(row.part_id) : ""}
                          onValueChange={(val) => handleUpdatePartRow(idx, "part_id", val)}
                          placeholder="Search part..."
                        />
                      </div>
                      <div className="col-span-5 sm:col-span-3 min-w-0 flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs"
                          value={row.quantity}
                          onChange={(e) => handleUpdatePartRow(idx, "quantity", e.target.value)}
                        />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {stock} Avail
                        </span>
                      </div>
                      <div className="col-span-5 sm:col-span-2 min-w-0 text-right font-medium text-foreground">
                        ₱{((row.unit_cost || 0) * (row.quantity || 1)).toLocaleString()}
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemovePartRow(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t flex flex-col-reverse sm:flex-row gap-2">
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
              disabled={loading || !vehicleId || !description.trim()}
              className="bg-primary text-primary-foreground"
            >
              {loading ? "Saving Changes..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

