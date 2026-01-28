"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import type { CreateVehicleForm } from "../types";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function requiredOk(v: string) {
  return String(v || "").trim().length > 0;
}

export function AddVehicleDialog({
  open,
  onOpenChange,
  typeOptions,
  saving,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  typeOptions: Array<{ id: number; name: string }>;
  saving: boolean;
  onCreate: (payload: Record<string, any>) => Promise<void>;
}) {
  const [form, setForm] = React.useState<CreateVehicleForm>({
    plateNumber: "",
    model: "",
    year: "",
    typeId: null,
    category: "",
    status: "Available",
    mileageKm: "",
    fuelType: "",
    lastMaintenanceDate: "",
    nextMaintenanceDate: "",
  });

  const [touched, setTouched] = React.useState(false);

  const canSubmit =
    requiredOk(form.plateNumber) &&
    requiredOk(form.model) &&
    requiredOk(form.year) &&
    form.typeId !== null;

  function set<K extends keyof CreateVehicleForm>(k: K, v: CreateVehicleForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit() {
    setTouched(true);
    if (!canSubmit) return;

    const payload = {
      vehicle_plate: form.plateNumber.trim(),
      vehicle_type: form.typeId,
      status: form.status || "Active",
      model: form.model.trim(), // will be ignored/retried if not in DB
      year: form.year.trim(),   // will be ignored/retried if not in DB
    };

    await onCreate(payload);

    setForm({
      plateNumber: "",
      model: "",
      year: "",
      typeId: null,
      category: "",
      status: "Available",
      mileageKm: "",
      fuelType: "",
      lastMaintenanceDate: "",
      nextMaintenanceDate: "",
    });

    setTouched(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>
                Plate Number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.plateNumber}
                onChange={(e) => set("plateNumber", e.target.value)}
                className={touched && !requiredOk(form.plateNumber) ? "ring-1 ring-destructive" : ""}
                placeholder="e.g. UAL 593"
              />
            </div>

            <div className="grid gap-2">
              <Label>
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                className={touched && !requiredOk(form.model) ? "ring-1 ring-destructive" : ""}
                placeholder="e.g. Toyota Hilux"
              />
            </div>

            <div className="grid gap-2">
              <Label>
                Year <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={touched && !requiredOk(form.year) ? "ring-1 ring-destructive" : ""}
                placeholder="e.g. 2026"
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.typeId === null ? "" : String(form.typeId)}
                onValueChange={(v) => set("typeId", v ? Number(v) : null)}
              >
                <SelectTrigger className={touched && form.typeId === null ? "ring-1 ring-destructive" : ""}>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category || ""} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status || ""} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Mileage (km)</Label>
              <Input
                value={form.mileageKm || ""}
                onChange={(e) => set("mileageKm", e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label>Fuel Type</Label>
              <Select value={form.fuelType || ""} onValueChange={(v) => set("fuelType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Fuel Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Last Maintenance Date</Label>
              <Input
                type="date"
                value={form.lastMaintenanceDate || ""}
                onChange={(e) => set("lastMaintenanceDate", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Next Maintenance Date</Label>
              <Input
                type="date"
                value={form.nextMaintenanceDate || ""}
                onChange={(e) => set("nextMaintenanceDate", e.target.value)}
              />
            </div>
          </div>

          {touched && !canSubmit ? (
            <div className="text-sm text-destructive">Please fill all required fields.</div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving || !canSubmit} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
