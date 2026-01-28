"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import type { CreateVehicleForm } from "../types";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  function set<K extends keyof CreateVehicleForm>(
    k: K,
    v: CreateVehicleForm[K]
  ) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function getMissingRequiredFields() {
    const missing: string[] = [];
    if (!requiredOk(form.plateNumber)) missing.push("Plate Number");
    if (!requiredOk(form.model)) missing.push("Model");
    if (!requiredOk(form.year)) missing.push("Year");
    if (form.typeId === null) missing.push("Type");
    return missing;
  }

  async function handleSubmit() {
    setTouched(true);

    if (!canSubmit) {
      const missing = getMissingRequiredFields();
      toast.error("Add vehicle failed", {
        description:
          missing.length > 0
            ? `Please fill the required field(s): ${missing.join(", ")}.`
            : "Please fill all required fields.",
      });
      return;
    }

    const payload = {
      vehicle_plate: form.plateNumber.trim(),
      vehicle_type: form.typeId,
      status: form.status || "Active",
      model: form.model.trim(),
      year: form.year.trim(),
    };

    try {
      await onCreate(payload);

      toast.success("Vehicle added", {
        description: "Vehicle was added successfully.",
      });

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
    } catch (err: any) {
      const raw =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Please try again.";

      toast.error("Add vehicle failed", { description: String(raw) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Dialog shell: fixed header + scroll middle + fixed footer */}
      <DialogContent
        className={[
            "p-0",
            "w-[calc(100%-1.5rem)] sm:w-full sm:max-w-3xl",
            "max-h-[90dvh] overflow-hidden",
        ].join(" ")}
        >
        <div className="flex max-h-[90dvh] flex-col">
          {/* ✅ HEADER (fixed) */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="text-lg font-semibold">Add New Vehicle</div>

            {/* keep radix close button working: DialogContent already renders it,
                but since you want layout control, we don't add another close button here */}
          </div>

          {/* ✅ CONTENT (scrollable middle) */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Plate Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.plateNumber}
                  onChange={(e) => set("plateNumber", e.target.value)}
                  className={
                    touched && !requiredOk(form.plateNumber)
                      ? "ring-1 ring-destructive"
                      : ""
                  }
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
                  className={
                    touched && !requiredOk(form.model)
                      ? "ring-1 ring-destructive"
                      : ""
                  }
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
                  className={
                    touched && !requiredOk(form.year)
                      ? "ring-1 ring-destructive"
                      : ""
                  }
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
                  <SelectTrigger
                    className={
                      touched && form.typeId === null
                        ? "ring-1 ring-destructive"
                        : ""
                    }
                  >
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
                <Select
                  value={form.category || ""}
                  onValueChange={(v) => set("category", v)}
                >
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
                <Select
                  value={form.status || ""}
                  onValueChange={(v) => set("status", v)}
                >
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
                <Select
                  value={form.fuelType || ""}
                  onValueChange={(v) => set("fuelType", v)}
                >
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

            {/* ✅ prevents last inputs from being hidden behind footer */}
            <div className="h-6" />
          </div>

          {/* ✅ FOOTER (fixed) */}
          <div className="border-t px-6 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full gap-2 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Vehicle
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
