"use client";

import * as React from "react";
import type { VehicleOption, VehiclePartOption, CreateJORequestPayload, JOType, JOPriority } from "../types";
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
import { Plus, Trash2, Package } from "lucide-react";

interface CreateJODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehicleOption[];
  parts: VehiclePartOption[];
  onSubmit: (payload: CreateJORequestPayload) => Promise<void>;
  loading: boolean;
}

export function CreateJODialog({
  open,
  onOpenChange,
  vehicles,
  parts,
  onSubmit,
  loading,
}: CreateJODialogProps) {
  const [vehicleId, setVehicleId] = React.useState<string>("");
  const [joType, setJoType] = React.useState<JOType>("Repair");
  const [priority, setPriority] = React.useState<JOPriority>("Normal");
  const [odometer, setOdometer] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");

  // Requested parts list
  const [requestedParts, setRequestedParts] = React.useState<
    Array<{ part_id: number; quantity: number; unit_cost: number; remarks: string }>
  >([]);

  // When vehicle changes, autofill odometer if available
  const handleVehicleChange = (val: string) => {
    setVehicleId(val);
    const selectedVeh = vehicles.find((v) => String(v.vehicle_id || v.id) === val);
    const mileage = selectedVeh?.current_mileage ?? selectedVeh?.odometer;
    if (mileage !== undefined && mileage !== null) {
      setOdometer(String(mileage));
    }
  };

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

  const joTypeOptions = [
    { value: "Repair", label: "Repair" },
    { value: "Preventive Maintenance", label: "Preventive Maintenance" },
    { value: "Inspection", label: "Inspection" },
  ];

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
      } else {
        next[index] = { ...next[index], [field]: val };
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

    await onSubmit({
      vehicle_id: Number(vehicleId),
      jo_type: joType,
      priority,
      description,
      odometer_reading: odometer ? Number(odometer) : undefined,
      parts: requestedParts
        .filter((p) => p.part_id > 0 && p.quantity > 0)
        .map((p) => ({
          part_id: p.part_id,
          quantity_requested: p.quantity,
          unit_cost: p.unit_cost,
          remarks: p.remarks,
        })),
    });

    // Reset and close
    setVehicleId("");
    setDescription("");
    setOdometer("");
    setRequestedParts([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Job Order Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Vehicle Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle">Vehicle *</Label>
              <SearchableSelect
                options={vehicleOptions}
                value={vehicleId}
                onValueChange={handleVehicleChange}
                placeholder="Search and select vehicle..."
              />
            </div>

            {/* Odometer */}
            <div className="space-y-1.5">
              <Label htmlFor="odometer">Current Odometer (km)</Label>
              <Input
                id="odometer"
                type="number"
                placeholder="e.g. 45000"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
              />
            </div>
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="joType">JO Type *</Label>
              <SearchableSelect
                options={joTypeOptions}
                value={joType}
                onValueChange={(val) => setJoType(val as JOType)}
                placeholder="Select JO type..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <SearchableSelect
                options={priorityOptions}
                value={priority}
                onValueChange={(val) => setPriority(val as JOPriority)}
                placeholder="Select priority..."
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Issue / Maintenance Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe symptoms, repair requirements, or scheduled maintenance items..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Inventory & Parts Request Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary" />
                  Initial Parts Needed (Optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check available stock directly from vehicle parts catalogue.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPartRow}
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Part
              </Button>
            </div>

            {requestedParts.length > 0 && (
              <div className="space-y-2">
                {requestedParts.map((row, index) => {
                  const selectedPart = parts.find((p) => p.id === row.part_id);
                  const availableStock = selectedPart?.on_hand ?? 0;

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center bg-muted/40 p-2 rounded-md"
                    >
                      <div className="col-span-6">
                        <SearchableSelect
                          options={partOptions}
                          value={row.part_id ? String(row.part_id) : ""}
                          onValueChange={(val) => handleUpdatePartRow(index, "part_id", val)}
                          placeholder="Search part..."
                          triggerClassName="h-8 text-xs"
                        />
                      </div>

                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          className="h-8 text-xs"
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdatePartRow(index, "quantity", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="col-span-2 text-xs">
                        <span
                          className={`font-medium ${
                            row.quantity > availableStock ? "text-destructive" : "text-emerald-600"
                          }`}
                        >
                          {availableStock} Avail
                        </span>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemovePartRow(index)}
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

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !vehicleId || !description.trim()}>
              {loading ? "Submitting..." : "Submit JO Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
