// src/modules/vehicle-management/vehicle-list/components/AddVehicleDialog.tsx
"use client";

import * as React from "react";
import { Plus, Upload, X, FileText, Trash2, Camera, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";

import type {
  CreateVehicleForm,
  DocumentUploadItem,
  VehiclesApiRow,
  VehicleDocumentApiRow,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
import {
  uploadVehicleImage,
  uploadVehicleDocument,
  listAllVehicleDocuments,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/providers/fetchProviders";
import { parseVehicleDocumentText } from "../utils/vehicleDocParser";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

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
  onCreate: (payload: Record<string, unknown>) => Promise<VehiclesApiRow | undefined>;
}) {
  const [form, setForm] = React.useState<CreateVehicleForm>({
    plateNumber: "",
    vehicleName: "",
    make: "",
    model: "",
    yearModel: "",
    vinNo: "",
    engineNo: "",
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
    cbmHeight: "",
    imageFile: null,
    documents: [],
  });

  const [touched, setTouched] = React.useState(false);

  // vehicle photo upload UI
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // dynamic document rows state
  const [pendingDocs, setPendingDocs] = React.useState<DocumentUploadItem[]>([
    {
      id: "doc-init-1",
      file: null,
      documentType: "OR",
      documentNo: "",
      issuedDate: "",
      expiryDate: "",
      remarks: "",
    },
  ]);

  // Existing fleet documents for duplicate prevention
  const [existingDocs, setExistingDocs] = React.useState<VehicleDocumentApiRow[]>([]);
  // OCR scanning states
  const [ocrScanningIdx, setOcrScanningIdx] = React.useState<number | null>(null);
  const [ocrProgress, setOcrProgress] = React.useState<number>(0);
  const [ocrStatusText, setOcrStatusText] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      listAllVehicleDocuments()
        .then((docs) => setExistingDocs(docs))
        .catch(() => setExistingDocs([]));
    }
  }, [open]);

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
    form.fuelTypeId !== null &&
    form.engineTypeId !== null &&
    requiredOk(form.seats || "") &&
    requiredOk(form.maximumWeight || "") &&
    requiredOk(form.minimumLoad || "") &&
    requiredOk(form.maxLiters || "") &&
    requiredOk(form.purchasedDate || "") &&
    requiredOk(form.cbmLength || "") &&
    requiredOk(form.cbmWidth || "") &&
    requiredOk(form.cbmHeight || "");

  function set<K extends keyof CreateVehicleForm>(k: K, v: CreateVehicleForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function getMissingRequiredFields() {
    const missing: string[] = [];
    if (!requiredOk(form.plateNumber)) missing.push("Plate Number");
    if (!requiredOk(form.vehicleName)) missing.push("Vehicle Name");
    if (!requiredOk(form.year)) missing.push("Year To Last");
    if (form.typeId === null) missing.push("Type");
    if (form.fuelTypeId === null) missing.push("Fuel Type");
    if (form.engineTypeId === null) missing.push("Engine Type");
    if (!requiredOk(form.seats || "")) missing.push("Seats");
    if (!requiredOk(form.maximumWeight || "")) missing.push("Maximum Weight");
    if (!requiredOk(form.minimumLoad || "")) missing.push("Maximum Load");
    if (!requiredOk(form.maxLiters || "")) missing.push("Max Liters");
    if (!requiredOk(form.purchasedDate || "")) missing.push("Purchased Date");
    if (!requiredOk(form.cbmLength || "")) missing.push("CBM Length");
    if (!requiredOk(form.cbmWidth || "")) missing.push("CBM Width");
    if (!requiredOk(form.cbmHeight || "")) missing.push("CBM Height");
    return missing;
  }

  function acceptFile(f?: File | null) {
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      toast.error("Invalid file", { description: "Please upload an image file." });
      return;
    }

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

  function normalizeDocNo(v?: string | null) {
    return (v || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  }

  // Check if a document number is duplicated in existing fleet records or another row in pendingDocs
  function getDocConflict(docNo: string | undefined | null, rowIndex: number): { type: "system" | "form"; details: string } | null {
    const target = normalizeDocNo(docNo);
    if (!target) return null;

    // Check other pending rows
    const otherRowIdx = pendingDocs.findIndex(
      (d, i) => i !== rowIndex && normalizeDocNo(d.documentNo) === target
    );
    if (otherRowIdx !== -1) {
      return {
        type: "form",
        details: `Duplicate document number found in row #${otherRowIdx + 1}.`,
      };
    }

    // Check system records
    const sysMatch = existingDocs.find(
      (d) => normalizeDocNo(d.document_no) === target
    );
    if (sysMatch) {
      const plate = sysMatch.vehicle_plate || sysMatch.vehicle?.vehicle_plate;
      const targetDisplay = plate ? `vehicle with plate '${plate}'` : `Vehicle ID #${sysMatch.vehicle_id || "record"}`;
      return {
        type: "system",
        details: `Already registered to ${targetDisplay}.`,
      };
    }

    return null;
  }

  // Scan document image using Tesseract.js
  async function handleScanDoc(index: number, file: File) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      toast.info("OCR scanning is optimized for image files (JPG, PNG, WebP).");
      return;
    }

    setOcrScanningIdx(index);
    setOcrProgress(0);
    setOcrStatusText("Preparing OCR engine...");

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrStatusText(`Reading text... ${Math.round(m.progress * 100)}%`);
          } else if (m.status) {
            setOcrStatusText(`${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`);
          }
        },
      });

      const res = await worker.recognize(file);
      const text = res.data.text || "";
      const parsed = parseVehicleDocumentText(text);

      updateDocRow(index, {
        documentType: (parsed.documentType as "OR" | "CR" | "Insurance" | "Other") || pendingDocs[index]?.documentType || "OR",
        documentNo: parsed.documentNo || pendingDocs[index]?.documentNo || "",
        issuedDate: parsed.issuedDate || pendingDocs[index]?.issuedDate || "",
        expiryDate: parsed.expiryDate || pendingDocs[index]?.expiryDate || "",
      });

      if (parsed.documentNo) {
        const conflict = getDocConflict(parsed.documentNo, index);
        if (conflict) {
          toast.warning(`Warning: Scanned Document No. '${parsed.documentNo}' is already used. (${conflict.details})`);
        } else {
          toast.success("Document scanned! Document number and dates autofilled.");
        }
      } else {
        toast.info("OCR finished. Please verify or enter Document No. manually.");
      }
    } catch (ocrErr) {
      console.error("OCR scan failed:", ocrErr);
      toast.error("Failed to read document automatically. You can enter details manually.");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore
        }
      }
      setOcrScanningIdx(null);
      setOcrStatusText("");
    }
  }

  function handleAddDocumentRow() {
    setPendingDocs((prev) => [
      ...prev,
      {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: null,
        documentType: "CR",
        documentNo: "",
        issuedDate: "",
        expiryDate: "",
        remarks: "",
      },
    ]);
  }

  function updateDocRow(index: number, updates: Partial<DocumentUploadItem>) {
    setPendingDocs((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  }

  function removeDocRow(index: number) {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index));
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

    // Check for any duplicate document numbers in pendingDocs
    for (let i = 0; i < pendingDocs.length; i++) {
      const doc = pendingDocs[i];
      if (doc.documentNo?.trim()) {
        const conflict = getDocConflict(doc.documentNo, i);
        if (conflict) {
          toast.error("Duplicate document detected", {
            description: `Document No. '${doc.documentNo.trim()}' is not allowed: ${conflict.details}`,
          });
          return;
        }
      }
    }

    let imageId: string | null = null;

    try {
      if (form.imageFile) {
        imageId = await uploadVehicleImage(form.imageFile);
      }
    } catch (e) {
      toast.error("Image upload failed", { description: String(e instanceof Error ? e.message : e) });
      return;
    }

    const yearInt = toIntOrNull(form.year);
    const yearModelInt = toIntOrNull(form.yearModel);
    const mileageInt = toIntOrNull(String(form.mileageKm || ""));

    const payload: Record<string, unknown> = {
      vehicle_plate: form.plateNumber.trim(),
      name: form.vehicleName.trim(),
      vehicle_type: form.typeId,
      status: form.status || "Active",
    };

    // 5 new columns
    if (form.make.trim()) payload.make = form.make.trim();
    if (form.model.trim()) payload.model = form.model.trim();
    if (yearModelInt !== null) payload.year_model = yearModelInt;
    if (form.vinNo.trim()) payload.vin_no = form.vinNo.trim();
    if (form.engineNo.trim()) payload.engine_no = form.engineNo.trim();

    // Year goes to year_to_last
    if (yearInt !== null) payload.year_to_last = yearInt;

    if (mileageInt !== null) payload.current_mileage = mileageInt;
    if (form.fuelTypeId !== null) payload.fuel_type = form.fuelTypeId;
    if (form.engineTypeId !== null) payload.engine_type = form.engineTypeId;

    if (form.rfid.trim()) payload.rfid_code = form.rfid.trim();

    // specs
    const seatsInt = toIntOrNull(form.seats || "");
    if (seatsInt !== null) payload.seats = seatsInt;

    payload.maximum_weight = form.maximumWeight;
    payload.minimum_load = form.minimumLoad;
    payload.max_liters = form.maxLiters;
    payload.purchased_date = form.purchasedDate;
    payload.cbm_length = form.cbmLength;
    payload.cbm_width = form.cbmWidth;
    payload.cbm_height = form.cbmHeight;

    if (imageId) payload.image = imageId;

    try {
      const created = await onCreate(payload);

      // Upload attached registration documents if any
      const vehicleId = created?.vehicle_id;
      if (vehicleId && pendingDocs.length > 0) {
        for (const doc of pendingDocs) {
          if (!doc.file) continue;
          try {
            await uploadVehicleDocument(doc.file, {
              vehicleId,
              documentType: doc.documentType,
              documentNo: doc.documentNo,
              issuedDate: doc.issuedDate,
              expiryDate: doc.expiryDate,
              remarks: doc.remarks,
            });
          } catch (docErr) {
            console.error("Failed to upload document:", doc.file.name, docErr);
          }
        }
      }

      toast.success("Vehicle registered", {
        description: "Vehicle profile and documents saved successfully.",
      });

      setForm({
        plateNumber: "",
        vehicleName: "",
        make: "",
        model: "",
        yearModel: "",
        vinNo: "",
        engineNo: "",
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
        cbmHeight: "",
        imageFile: null,
        documents: [],
      });
      setPendingDocs([
        {
          id: "doc-init-1",
          file: null,
          documentType: "OR",
          documentNo: "",
          issuedDate: "",
          expiryDate: "",
          remarks: "",
        },
      ]);

      setTouched(false);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      const response = (err as Record<string, unknown>)?.response as Record<string, unknown>;
      const data = response?.data as Record<string, unknown>;
      const errors = data?.errors as Record<string, unknown>[];
      const raw = errors?.[0]?.message || data?.error || msg;

      toast.error("Add vehicle failed", { description: String(raw) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0",
          "w-[calc(100%-1.5rem)] sm:w-full sm:max-w-4xl",
          "max-h-[92dvh] overflow-hidden"
        )}
      >
        <div className="flex max-h-[92dvh] flex-col">
          {/* HEADER */}
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">Register Vehicle</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter vehicle profile, specifications, and upload registration documents (OR/CR, Insurance).
            </DialogDescription>
          </DialogHeader>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Section 1: Identification & Registration Details */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Vehicle Information</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    placeholder="e.g. Toyota Hilux Fleet 01"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Make</Label>
                  <Input
                    value={form.make}
                    onChange={(e) => set("make", e.target.value)}
                    placeholder="e.g. Toyota, Isuzu, Mitsubishi"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Model</Label>
                  <Input
                    value={form.model}
                    onChange={(e) => set("model", e.target.value)}
                    placeholder="e.g. Hilux, Elf, Canter"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Year Model</Label>
                  <Input
                    value={form.yearModel}
                    onChange={(e) => set("yearModel", e.target.value)}
                    placeholder="e.g. 2024"
                    inputMode="numeric"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>
                    Vehicle Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.typeId === null ? "" : String(form.typeId)}
                    onValueChange={(v) => set("typeId", v ? Number(v) : null)}
                  >
                    <SelectTrigger className={touched && form.typeId === null ? "ring-1 ring-destructive" : ""}>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.length === 0 ? (
                        <SelectItem value="no-options" disabled>
                          No Types Available
                        </SelectItem>
                      ) : (
                        typeOptions.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>VIN / Chassis No.</Label>
                  <Input
                    value={form.vinNo}
                    onChange={(e) => set("vinNo", e.target.value)}
                    placeholder="e.g. JTF31092837..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Engine No.</Label>
                  <Input
                    value={form.engineNo}
                    onChange={(e) => set("engineNo", e.target.value)}
                    placeholder="e.g. 2KD-1234567"
                  />
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
              </div>
            </div>

            {/* Section 2: Technical & Operational Specs */}
            <div className="pt-2 border-t">
              <h3 className="text-sm font-semibold text-foreground mb-3">Specifications & Operations</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>
                    Year To Last <span className="text-destructive">*</span>
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
                  <Label>Current Mileage (km)</Label>
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
                      {fuelOptions.length === 0 ? (
                        <SelectItem value="no-options" disabled>
                          No Fuel Types Available
                        </SelectItem>
                      ) : (
                        fuelOptions.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.name}
                          </SelectItem>
                        ))
                      )}
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
                      {engineOptions.length === 0 ? (
                        <SelectItem value="no-options" disabled>
                          No Engine Types Available
                        </SelectItem>
                      ) : (
                        engineOptions.map((en) => (
                          <SelectItem key={en.id} value={String(en.id)}>
                            {en.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>RFID Code</Label>
                  <Input
                    value={form.rfid}
                    onChange={(e) => set("rfid", e.target.value)}
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
                    Maximum Weight (kg) <span className="text-destructive">*</span>
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
                    Minimum Load (₱ value) <span className="text-destructive">*</span>
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

                <div className="grid gap-2">
                  <Label>
                    CBM Height <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.cbmHeight || ""}
                    onChange={(e) => set("cbmHeight", e.target.value)}
                    className={touched && !requiredOk(form.cbmHeight || "") ? "ring-1 ring-destructive" : ""}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Upload Registration Documents */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Registration Documents</h3>
                  <p className="text-xs text-muted-foreground">Attach OR, CR, Insurance policies, or other vehicle papers.</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDocumentRow}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Another Document
                </Button>
              </div>

              {/* Dynamic Document Rows */}
              <div className="space-y-3">
                {pendingDocs.map((doc, idx) => (
                  <div key={doc.id || idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        Document #{idx + 1}
                      </div>

                      {pendingDocs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                          onClick={() => removeDocRow(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>

                    {/* Conflict Error Message */}
                    {(() => {
                      const conflict = getDocConflict(doc.documentNo, idx);
                      if (!conflict) return null;
                      return (
                        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive border border-destructive/20">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{conflict.details}</span>
                        </div>
                      );
                    })()}

                    {/* OCR Progress Indicator for this row */}
                    {ocrScanningIdx === idx && (
                      <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 animate-in fade-in-50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-primary flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {ocrStatusText || "Scanning document..."}
                          </span>
                          <span className="font-mono text-muted-foreground">{ocrProgress}%</span>
                        </div>
                        <Progress value={ocrProgress} className="h-1.5" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Document Type</Label>
                        <Select
                          value={doc.documentType}
                          onValueChange={(v) =>
                            updateDocRow(idx, { documentType: v as "OR" | "CR" | "Insurance" | "Other" })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OR">Official Receipt (OR)</SelectItem>
                            <SelectItem value="CR">Certificate of Reg. (CR)</SelectItem>
                            <SelectItem value="Insurance">Insurance</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Document No.</Label>
                          {Boolean(getDocConflict(doc.documentNo, idx)) && (
                            <span className="text-[10px] text-destructive font-semibold">Duplicate</span>
                          )}
                        </div>
                        <Input
                          className={cn(
                            "h-9",
                            Boolean(getDocConflict(doc.documentNo, idx)) && "border-destructive focus-visible:ring-destructive/30"
                          )}
                          value={doc.documentNo || ""}
                          onChange={(e) => updateDocRow(idx, { documentNo: e.target.value })}
                          placeholder="e.g. OR-884920"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs">Issued Date</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={doc.issuedDate || ""}
                          onChange={(e) => updateDocRow(idx, { issuedDate: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs">Expiry Date</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={doc.expiryDate || ""}
                          onChange={(e) => updateDocRow(idx, { expiryDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
                      <div className="sm:col-span-2 grid gap-1.5">
                        <Label className="text-xs">Remarks / Notes</Label>
                        <Input
                          className="h-9"
                          value={doc.remarks || ""}
                          onChange={(e) => updateDocRow(idx, { remarks: e.target.value })}
                          placeholder="e.g. Comprehensive insurance with TPL"
                        />
                      </div>

                      <div>
                        <input
                          id={`doc-file-${doc.id || idx}`}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              updateDocRow(idx, { file: f });
                              if (f.type.startsWith("image/")) {
                                handleScanDoc(idx, f);
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-9 w-full gap-2 text-xs truncate",
                            doc.file && "border-primary text-primary"
                          )}
                          onClick={() => {
                            const el = document.getElementById(`doc-file-${doc.id || idx}`);
                            el?.click();
                          }}
                        >
                          <Upload className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{doc.file ? doc.file.name : "Attach File"}</span>
                        </Button>
                      </div>

                      <div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={ocrScanningIdx === idx || !doc.file || !doc.file.type.startsWith("image/")}
                          className="h-9 w-full gap-1.5 text-xs font-semibold"
                          onClick={() => {
                            if (doc.file) handleScanDoc(idx, doc.file);
                          }}
                          title={!doc.file ? "Attach an image first to scan" : "Extract details with OCR"}
                        >
                          {ocrScanningIdx === idx ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              Scan / OCR
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Vehicle Photo */}
            <div className="pt-2 border-t">
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
                          className="h-44 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </div>
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
                Save Vehicle Profile
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
