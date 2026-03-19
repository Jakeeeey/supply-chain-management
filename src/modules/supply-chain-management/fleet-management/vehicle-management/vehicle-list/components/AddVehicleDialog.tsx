// src/modules/vehicle-management/vehicle-list/components/AddVehicleDialog.tsx
"use client";

import * as React from "react";
import { Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import type { CreateVehicleForm } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
import { uploadVehicleImage } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/providers/fetchProviders";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

function toIntOrNull(v: string) {
  const n = Number(String(v || "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ✅ 5MB

export function AddVehicleDialog({
  open,
  onOpenChange,
  typeOptions,
  fuelOptions,
  engineOptions,
  saving,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  typeOptions: Array<{ id: number; name: string }>;
  fuelOptions: Array<{ id: number; name: string }>;
  engineOptions: Array<{ id: number; name: string }>;
  saving: boolean;
  onCreate: (payload: Record<string, any>) => Promise<void>;
}) {
  const [form, setForm] = React.useState<CreateVehicleForm>({
    plateNumber: "",
    vehicleName: "",
    year: "",
    typeId: null,
    status: "Active",
    mileageKm: "",
    fuelTypeId: null,
    engineTypeId: null,
    rfid: "",
    seats: "",
    maximumWeight: "",
    minimumLoad: "",
    maxLiters: "",
    purchasedDate: "",
    cbmLength: "",
    cbmWidth: "",
    imageFile: null,
  });

  const [touched, setTouched] = React.useState(false);

  // upload UI
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!form.imageFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.imageFile);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.imageFile]);

  const canSubmit =
    requiredOk(form.plateNumber) &&
    requiredOk(form.vehicleName) &&
    requiredOk(form.year) &&
    form.typeId !== null &&
    requiredOk(form.rfid) &&
    form.fuelTypeId !== null &&
    form.engineTypeId !== null &&
    requiredOk(form.seats || "") &&
    requiredOk(form.maximumWeight || "") &&
    requiredOk(form.minimumLoad || "") &&
    requiredOk(form.maxLiters || "") &&
    requiredOk(form.purchasedDate || "") &&
    requiredOk(form.cbmLength || "") &&
    requiredOk(form.cbmWidth || "");

  function set<K extends keyof CreateVehicleForm>(k: K, v: CreateVehicleForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function getMissingRequiredFields() {
    const missing: string[] = [];
    if (!requiredOk(form.plateNumber)) missing.push("Plate Number");
    if (!requiredOk(form.vehicleName)) missing.push("Vehicle Name");
    if (!requiredOk(form.year)) missing.push("Year");
    if (form.typeId === null) missing.push("Type");
    if (!requiredOk(form.rfid)) missing.push("RFID");
    if (form.fuelTypeId === null) missing.push("Fuel Type");
    if (form.engineTypeId === null) missing.push("Engine Type");
    if (!requiredOk(form.seats || "")) missing.push("Seats");
    if (!requiredOk(form.maximumWeight || "")) missing.push("Maximum Weight");
    if (!requiredOk(form.minimumLoad || "")) missing.push("Maximum Load");
    if (!requiredOk(form.maxLiters || "")) missing.push("Max Liters");
    if (!requiredOk(form.purchasedDate || "")) missing.push("Purchased Date");
    if (!requiredOk(form.cbmLength || "")) missing.push("CBM Length");
    if (!requiredOk(form.cbmWidth || "")) missing.push("CBM Width");
    return missing;
  }

  function acceptFile(f?: File | null) {
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      toast.error("Invalid file", { description: "Please upload an image file." });
      return;
    }

    // ✅ 5MB limit
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("File too large", { description: "Maximum image size is 5MB." });
      return;
    }

    set("imageFile", f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    acceptFile(f || null);
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

    let imageId: string | null = null;

    try {
      if (form.imageFile) {
        imageId = await uploadVehicleImage(form.imageFile);
      }
    } catch (e: any) {
      toast.error("Image upload failed", { description: String(e?.message || e) });
      return;
    }

    const yearInt = toIntOrNull(form.year);
    const mileageInt = toIntOrNull(String(form.mileageKm || ""));

    const payload: Record<string, any> = {
      vehicle_plate: form.plateNumber.trim(),
      name: form.vehicleName.trim(),
      vehicle_type: form.typeId,
      status: form.status || "Active",
    };

    // ✅ Year goes to year_to_last
    if (yearInt !== null) payload.year_to_last = yearInt;

    if (mileageInt !== null) payload.current_mileage = mileageInt;
    if (form.fuelTypeId !== null) payload.fuel_type = form.fuelTypeId;
    if (form.engineTypeId !== null) payload.engine_type = form.engineTypeId;

    if (form.rfid.trim()) payload.rfid_code = form.rfid.trim();

    // new fields
    const seatsInt = toIntOrNull(form.seats || "");
    if (seatsInt !== null) payload.seats = seatsInt;

    payload.maximum_weight = form.maximumWeight;
    payload.minimum_load = form.minimumLoad;
    payload.max_liters = form.maxLiters;
    payload.purchased_date = form.purchasedDate;
    payload.cbm_length = form.cbmLength;
    payload.cbm_width = form.cbmWidth;

    // ✅ reuse vehicles.image
    if (imageId) payload.image = imageId;

    try {
      await onCreate(payload);

      toast.success("Vehicle added", {
        description: "Vehicle was added successfully.",
      });

      setForm({
        plateNumber: "",
        vehicleName: "",
        year: "",
        typeId: null,
        status: "Active",
        mileageKm: "",
        fuelTypeId: null,
        engineTypeId: null,
        rfid: "",
        seats: "",
        maximumWeight: "",
        minimumLoad: "",
        maxLiters: "",
        purchasedDate: "",
        cbmLength: "",
        cbmWidth: "",
        imageFile: null,
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
      <DialogContent
        className={cn(
          "p-0",
          "w-[calc(100%-1.5rem)] sm:w-full sm:max-w-3xl",
          "max-h-[90dvh] overflow-hidden"
        )}
      >
        <div className="flex max-h-[90dvh] flex-col">
          {/* HEADER */}
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">Add New Vehicle</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details to add a new vehicle to the fleet.
            </DialogDescription>
          </DialogHeader>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Plate Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.plateNumber}
                  onChange={(e) => set("plateNumber", e.target.value)}
                  className={touched && !requiredOk(form.plateNumber) ? "ring-1 ring-destructive" : ""}
                  placeholder="e.g. CAD 4419"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Vehicle Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.vehicleName}
                  onChange={(e) => set("vehicleName", e.target.value)}
                  className={touched && !requiredOk(form.vehicleName) ? "ring-1 ring-destructive" : ""}
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
                <Label>Status</Label>
                <Select value={form.status || ""} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Current Mileage</Label>
                <Input
                  value={form.mileageKm || ""}
                  onChange={(e) => set("mileageKm", e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Fuel Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.fuelTypeId === null ? "" : String(form.fuelTypeId)}
                  onValueChange={(v) => set("fuelTypeId", v ? Number(v) : null)}
                >
                  <SelectTrigger className={touched && form.fuelTypeId === null ? "ring-1 ring-destructive" : ""}>
                    <SelectValue placeholder="Select Fuel Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelOptions.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>
                  Engine Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.engineTypeId === null ? "" : String(form.engineTypeId)}
                  onValueChange={(v) => set("engineTypeId", v ? Number(v) : null)}
                >
                  <SelectTrigger className={touched && form.engineTypeId === null ? "ring-1 ring-destructive" : ""}>
                    <SelectValue placeholder="Select Engine Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {engineOptions.map((en) => (
                      <SelectItem key={en.id} value={String(en.id)}>
                        {en.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>
                  RFID <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.rfid}
                  onChange={(e) => set("rfid", e.target.value)}
                  className={touched && !requiredOk(form.rfid) ? "ring-1 ring-destructive" : ""}
                  placeholder="Enter RFID code"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Seats <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.seats || ""}
                  onChange={(e) => set("seats", e.target.value)}
                  className={touched && !requiredOk(form.seats || "") ? "ring-1 ring-destructive" : ""}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Maximum Weight <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.maximumWeight || ""}
                  onChange={(e) => set("maximumWeight", e.target.value)}
                  className={touched && !requiredOk(form.maximumWeight || "") ? "ring-1 ring-destructive" : ""}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Maximum Load <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.minimumLoad || ""}
                  onChange={(e) => set("minimumLoad", e.target.value)}
                  className={touched && !requiredOk(form.minimumLoad || "") ? "ring-1 ring-destructive" : ""}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Max Liters <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.maxLiters || ""}
                  onChange={(e) => set("maxLiters", e.target.value)}
                  className={touched && !requiredOk(form.maxLiters || "") ? "ring-1 ring-destructive" : ""}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  Purchased Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.purchasedDate || ""}
                  onChange={(e) => set("purchasedDate", e.target.value)}
                  className={touched && !requiredOk(form.purchasedDate || "") ? "ring-1 ring-destructive" : ""}
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  CBM Length <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.cbmLength || ""}
                  onChange={(e) => set("cbmLength", e.target.value)}
                  className={touched && !requiredOk(form.cbmLength || "") ? "ring-1 ring-destructive" : ""}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  CBM Width <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.cbmWidth || ""}
                  onChange={(e) => set("cbmWidth", e.target.value)}
                  className={touched && !requiredOk(form.cbmWidth || "") ? "ring-1 ring-destructive" : ""}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Upload Photo */}
            <div className="mt-6">
              <Label>Vehicle Photo</Label>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
              />

              <Card
                className={cn(
                  "mt-2 rounded-lg border border-dashed p-4 transition",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDrop={onDrop}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border p-2">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div className="grid gap-1">
                      <div className="text-sm font-medium">
                        Drag & drop an image here, or browse
                      </div>
                      <div className="text-xs text-muted-foreground">
                        PNG / JPG recommended. (Max 5MB)
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                      Browse
                    </Button>

                    {form.imageFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => set("imageFile", null)}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                {form.imageFile ? (
                  <div className="mt-4 grid gap-2">
                    <div className="text-xs text-muted-foreground">
                      Selected:{" "}
                      <span className="font-medium text-foreground">
                        {form.imageFile.name}
                      </span>
                    </div>

                    {previewUrl ? (
                      <div className="overflow-hidden rounded-md border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Vehicle preview"
                          className="h-48 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </div>

            <div className="h-6" />
          </div>

          {/* FOOTER */}
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
