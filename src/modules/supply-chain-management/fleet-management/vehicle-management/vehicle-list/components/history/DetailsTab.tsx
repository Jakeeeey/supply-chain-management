// src/modules/vehicle-management/vehicle-list/components/history/DetailsTab.tsx
"use client";

import * as React from "react";
import type {
  VehicleRow,
  VehicleDocumentApiRow,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
import {
  listVehicleDocuments,
  listAllVehicleDocuments,
  uploadVehicleDocument,
  uploadVehicleImage,
  updateVehicleDocument,
  deleteVehicleDocument,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/providers/fetchProviders";
import { parseVehicleDocumentText } from "../../utils/vehicleDocParser";
import { createWorker } from "tesseract.js";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  ExternalLink,
  RefreshCw,
  Edit2,
  Check,
  X,
  Camera,
  Trash2,
  Edit,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function cleanStr(v: unknown, fallback = "N/A") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function fmtDateShort(v: unknown, fallback = "N/A") {
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function statusVariant(s: string) {
  const v = String(s || "").toLowerCase();
  if (v.includes("active")) return "default";
  return "secondary";
}

function Field({
  label,
  value,
  loading,
  alignRight,
}: {
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={["grid gap-1", alignRight ? "md:text-right" : ""].join(" ")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className={alignRight ? "ml-auto h-4 w-32" : "h-4 w-32"} />
      ) : (
        <div className="text-sm font-medium">{value}</div>
      )}
    </div>
  );
}

function SectionSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={`dsk-${i}`} className="grid gap-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DetailsTab({
  vehicle,
  typeOptions = [],
  fuelOptions = [],
  engineOptions = [],
  saving = false,
  onUpdateVehicle,
}: {
  vehicle: VehicleRow;
  typeOptions?: Array<{ id: number; name: string }>;
  fuelOptions?: Array<{ id: number; name: string }>;
  engineOptions?: Array<{ id: number; name: string }>;
  saving?: boolean;
  onUpdateVehicle?: (id: number, payload: Record<string, unknown>) => Promise<void>;
}) {
  const raw = React.useMemo(() => (vehicle?.raw ?? {}) as Record<string, unknown>, [vehicle?.raw]);

  const [loading, setLoading] = React.useState(true);
  const [documents, setDocuments] = React.useState<VehicleDocumentApiRow[]>([]);
  const [docsLoading, setDocsLoading] = React.useState(false);

  // Edit vehicle details state
  const [isEditing, setIsEditing] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  const [editPlate, setEditPlate] = React.useState(vehicle.plateNo || "");
  const [editName, setEditName] = React.useState(vehicle.vehicleName || "");
  const [editMake, setEditMake] = React.useState(String(raw?.make ?? vehicle?.make ?? ""));
  const [editModel, setEditModel] = React.useState(String(raw?.model ?? vehicle?.model ?? ""));
  const [editYearModel, setEditYearModel] = React.useState(String(raw?.year_model ?? vehicle?.yearModel ?? ""));
  const [editVinNo, setEditVinNo] = React.useState(String(raw?.vin_no ?? vehicle?.vinNo ?? ""));
  const [editEngineNo, setEditEngineNo] = React.useState(String(raw?.engine_no ?? vehicle?.engineNo ?? ""));
  const [editTypeId, setEditTypeId] = React.useState<number | null>(vehicle.vehicleTypeId);
  const [editStatus, setEditStatus] = React.useState(vehicle.status || "Active");

  const [editMileage, setEditMileage] = React.useState(String(raw?.current_mileage ?? vehicle.currentMileage ?? ""));
  const [editFuelTypeId, setEditFuelTypeId] = React.useState<number | null>(vehicle.fuelTypeId ?? null);
  const [editEngineTypeId, setEditEngineTypeId] = React.useState<number | null>(vehicle.engineTypeId ?? null);
  const [editYear, setEditYear] = React.useState(String(raw?.year_to_last ?? ""));
  const [editSeats, setEditSeats] = React.useState(String(raw?.seats ?? ""));
  const [editPurchasedDate, setEditPurchasedDate] = React.useState(String(raw?.purchased_date ?? ""));
  const [editMaxWeight, setEditMaxWeight] = React.useState(String(raw?.maximum_weight ?? ""));
  const [editMinLoad, setEditMinLoad] = React.useState(String(raw?.minimum_load ?? ""));
  const [editMaxLiters, setEditMaxLiters] = React.useState(String(raw?.max_liters ?? ""));
  const [editRfid, setEditRfid] = React.useState(String(raw?.rfid_code ?? ""));

  // Image change state
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [currentImage, setCurrentImage] = React.useState<string | null>(
    String(raw?.image ?? vehicle.image ?? "").trim() || null
  );
  const [uploadingImage, setUploadingImage] = React.useState(false);

  // New document upload state
  const [showUploadDoc, setShowUploadDoc] = React.useState(false);
  const [uploadingDoc, setUploadingDoc] = React.useState(false);
  const [newDocType, setNewDocType] = React.useState<"OR" | "CR" | "Insurance" | "Other">("OR");
  const [newDocNo, setNewDocNo] = React.useState("");
  const [newDocIssued, setNewDocIssued] = React.useState("");
  const [newDocExpiry, setNewDocExpiry] = React.useState("");
  const [newDocRemarks, setNewDocRemarks] = React.useState("");
  const [newDocFile, setNewDocFile] = React.useState<File | null>(null);
  const docFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // All fleet documents for duplicate checking
  const [allFleetDocs, setAllFleetDocs] = React.useState<VehicleDocumentApiRow[]>([]);
  // OCR state for DetailsTab
  const [isOcrRunning, setIsOcrRunning] = React.useState(false);
  const [ocrProgress, setOcrProgress] = React.useState(0);
  const [ocrStatusText, setOcrStatusText] = React.useState("");

  const refreshAllFleetDocs = React.useCallback(async () => {
    try {
      const all = await listAllVehicleDocuments();
      setAllFleetDocs(all);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    refreshAllFleetDocs();
  }, [refreshAllFleetDocs]);

  function normalizeDocNo(v?: string | null) {
    return (v || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  }

  function getConflict(docNo: string, excludeDocId?: number | null) {
    const target = normalizeDocNo(docNo);
    if (!target) return null;

    const match = allFleetDocs.find((d) => {
      if (excludeDocId && d.id === excludeDocId) return false;
      return normalizeDocNo(d.document_no) === target;
    });

    if (match) {
      const plate = match.vehicle_plate || match.vehicle?.vehicle_plate;
      const targetDisplay = plate ? `vehicle with plate '${plate}'` : `Vehicle #${match.vehicle_id || "record"}`;
      return `Already registered to ${targetDisplay}.`;
    }
    return null;
  }

  async function handleScanUploadedDoc(file: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.info("OCR scanning is optimized for image files (JPG, PNG, WebP).");
      return;
    }

    setIsOcrRunning(true);
    setOcrProgress(0);
    setOcrStatusText("Initializing OCR engine...");

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

      if (parsed.documentType && parsed.documentType !== "Other") {
        setNewDocType(parsed.documentType);
      }
      if (parsed.documentNo) {
        setNewDocNo(parsed.documentNo);
        const conflict = getConflict(parsed.documentNo);
        if (conflict) {
          toast.warning(`Warning: Scanned Document No. '${parsed.documentNo}' is already used. (${conflict})`);
        } else {
          toast.success("Document scanned! Autofilled Document No. and dates.");
        }
      } else {
        toast.info("OCR finished. Please verify details.");
      }
      if (parsed.issuedDate) setNewDocIssued(parsed.issuedDate);
      if (parsed.expiryDate) setNewDocExpiry(parsed.expiryDate);
    } catch (err) {
      console.error("OCR scan error:", err);
      toast.error("Failed to read document automatically. You can enter details manually.");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore
        }
      }
      setIsOcrRunning(false);
      setOcrStatusText("");
    }
  }

  // Edit existing document state
  const [editingDocId, setEditingDocId] = React.useState<number | null>(null);
  const [editDocType, setEditDocType] = React.useState<"OR" | "CR" | "Insurance" | "Other">("OR");
  const [editDocNo, setEditDocNo] = React.useState("");
  const [editDocIssued, setEditDocIssued] = React.useState("");
  const [editDocExpiry, setEditDocExpiry] = React.useState("");
  const [editDocRemarks, setEditDocRemarks] = React.useState("");
  const [savingDocEdit, setSavingDocEdit] = React.useState(false);

  function startEditDoc(doc: VehicleDocumentApiRow) {
    setEditingDocId(doc.id);
    setEditDocType((doc.document_type as "OR" | "CR" | "Insurance" | "Other") || "Other");
    setEditDocNo(doc.document_no || "");
    setEditDocIssued(doc.issued_date ? doc.issued_date.slice(0, 10) : "");
    setEditDocExpiry(doc.expiry_date ? doc.expiry_date.slice(0, 10) : "");
    setEditDocRemarks(doc.remarks || "");
  }

  async function handleSaveDocEdit() {
    if (!editingDocId) return;

    if (editDocNo.trim()) {
      const conflict = getConflict(editDocNo, editingDocId);
      if (conflict) {
        toast.error("Duplicate document detected", {
          description: `Document No. '${editDocNo.trim()}' is not allowed: ${conflict}`,
        });
        return;
      }
    }

    setSavingDocEdit(true);
    try {
      await updateVehicleDocument(editingDocId, {
        document_type: editDocType,
        document_no: editDocNo.trim() || null,
        issued_date: editDocIssued || null,
        expiry_date: editDocExpiry || null,
        remarks: editDocRemarks.trim() || null,
      });
      toast.success("Document updated successfully");
      setEditingDocId(null);
      fetchDocs();
      refreshAllFleetDocs();
    } catch (e) {
      toast.error("Failed to update document", {
        description: String(e instanceof Error ? e.message : e),
      });
    } finally {
      setSavingDocEdit(false);
    }
  }

  async function handleDeleteDoc(docId: number) {
    try {
      await deleteVehicleDocument(docId);
      toast.success("Document deleted");
      fetchDocs();
    } catch (e) {
      toast.error("Failed to delete document", {
        description: String(e instanceof Error ? e.message : e),
      });
    }
  }

  // Sync edit form with selected vehicle changes
  React.useEffect(() => {
    setEditPlate(vehicle.plateNo || "");
    setEditName(vehicle.vehicleName || "");
    setEditMake(String(raw?.make ?? vehicle?.make ?? ""));
    setEditModel(String(raw?.model ?? vehicle?.model ?? ""));
    setEditYearModel(String(raw?.year_model ?? vehicle?.yearModel ?? ""));
    setEditVinNo(String(raw?.vin_no ?? vehicle?.vinNo ?? ""));
    setEditEngineNo(String(raw?.engine_no ?? vehicle?.engineNo ?? ""));
    setEditTypeId(vehicle.vehicleTypeId);
    setEditStatus(vehicle.status || "Active");
    setEditMileage(String(raw?.current_mileage ?? vehicle.currentMileage ?? ""));
    setEditFuelTypeId(vehicle.fuelTypeId ?? null);
    setEditEngineTypeId(vehicle.engineTypeId ?? null);
    setEditYear(String(raw?.year_to_last ?? ""));
    setEditSeats(String(raw?.seats ?? ""));
    setEditPurchasedDate(String(raw?.purchased_date ?? ""));
    setEditMaxWeight(String(raw?.maximum_weight ?? ""));
    setEditMinLoad(String(raw?.minimum_load ?? ""));
    setEditMaxLiters(String(raw?.max_liters ?? ""));
    setEditRfid(String(raw?.rfid_code ?? ""));
    setCurrentImage(String(raw?.image ?? vehicle.image ?? "").trim() || null);
    setIsEditing(false);
  }, [vehicle, raw]);

  const fetchDocs = React.useCallback(async () => {
    if (!vehicle?.id) return;
    setDocsLoading(true);
    try {
      const data = await listVehicleDocuments(vehicle.id);
      setDocuments(data || []);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, [vehicle?.id]);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchDocs();
    const t = setTimeout(() => alive && setLoading(false), 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [vehicle?.id, fetchDocs]);

  async function handleImageChange(file: File) {
    if (!vehicle?.id) return;
    setUploadingImage(true);
    try {
      const uploadedPath = await uploadVehicleImage(file);
      setCurrentImage(uploadedPath);

      if (onUpdateVehicle) {
        await onUpdateVehicle(vehicle.id, { image: uploadedPath });
      }
      toast.success("Vehicle photo updated successfully!");
    } catch (e) {
      toast.error("Photo upload failed", {
        description: String(e instanceof Error ? e.message : e),
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSaveVehicleDetails() {
    if (!vehicle?.id) return;
    if (!editPlate.trim()) {
      toast.error("Plate number is required");
      return;
    }
    if (!editName.trim()) {
      toast.error("Vehicle name is required");
      return;
    }

    setUpdating(true);
    try {
      const payload: Record<string, unknown> = {
        vehicle_plate: editPlate.trim(),
        name: editName.trim(),
        status: editStatus,
        make: editMake.trim() || null,
        model: editModel.trim() || null,
        vin_no: editVinNo.trim() || null,
        engine_no: editEngineNo.trim() || null,
        year_model: editYearModel.trim() ? Number(editYearModel) : null,
        vehicle_type: editTypeId,
        fuel_type: editFuelTypeId,
        engine_type: editEngineTypeId,
        current_mileage: editMileage.trim() ? Number(editMileage) : null,
        year_to_last: editYear.trim() ? Number(editYear) : null,
        seats: editSeats.trim() ? Number(editSeats) : null,
        purchased_date: editPurchasedDate || null,
        maximum_weight: editMaxWeight.trim() || null,
        minimum_load: editMinLoad.trim() || null,
        max_liters: editMaxLiters.trim() || null,
        rfid_code: editRfid.trim() || null,
      };

      if (currentImage) {
        payload.image = currentImage;
      }

      if (onUpdateVehicle) {
        await onUpdateVehicle(vehicle.id, payload);
      }

      toast.success("Vehicle details saved successfully!");
      setIsEditing(false);
    } catch (e) {
      toast.error("Failed to save vehicle details", {
        description: String(e instanceof Error ? e.message : e),
      });
    } finally {
      setUpdating(false);
    }
  }

  async function handleUploadDocs(files: FileList | File[]) {
    if (!vehicle?.id || !files || files.length === 0) return;

    if (newDocNo.trim()) {
      const conflict = getConflict(newDocNo);
      if (conflict) {
        toast.error("Duplicate document detected", {
          description: `Document No. '${newDocNo.trim()}' is not allowed: ${conflict}`,
        });
        return;
      }
    }

    setUploadingDoc(true);
    let successCount = 0;
    try {
      for (const file of Array.from(files)) {
        await uploadVehicleDocument(file, {
          vehicleId: vehicle.id,
          documentType: newDocType,
          documentNo: newDocNo.trim() || undefined,
          issuedDate: newDocIssued || undefined,
          expiryDate: newDocExpiry || undefined,
          remarks: newDocRemarks.trim() || undefined,
        });
        successCount++;
      }

      toast.success("Documents uploaded successfully", {
        description: `${successCount} document(s) saved to vehicle profile.`,
      });
      setShowUploadDoc(false);
      setNewDocNo("");
      setNewDocIssued("");
      setNewDocExpiry("");
      setNewDocRemarks("");
      if (docFileInputRef.current) docFileInputRef.current.value = "";
      fetchDocs();
    } catch (e) {
      toast.error("Upload failed", {
        description: String(e instanceof Error ? e.message : e),
      });
    } finally {
      setUploadingDoc(false);
    }
  }

  const make = cleanStr(raw?.make ?? vehicle?.make, "N/A");
  const model = cleanStr(raw?.model ?? vehicle?.model ?? raw?.vehicle_model ?? vehicle?.vehicleName, "N/A");
  const yearModel = cleanStr(raw?.year_model ?? vehicle?.yearModel, "N/A");
  const vinNo = cleanStr(raw?.vin_no ?? vehicle?.vinNo, "N/A");
  const engineNo = cleanStr(raw?.engine_no ?? vehicle?.engineNo, "N/A");
  const year = cleanStr(raw?.year_to_last, "N/A");
  const mileage = cleanStr(
    raw?.current_mileage ?? raw?.mileage_km ?? raw?.mileage ?? raw?.odometer,
    "N/A"
  );
  const fuelType = cleanStr(vehicle?.fuelTypeName ?? raw?.fuel_type, "N/A");
  const engineType = cleanStr(vehicle?.engineTypeName ?? raw?.engine_type, "N/A");
  const seats = cleanStr(raw?.seats, "N/A");
  const purchasedDate = raw?.purchased_date ? fmtDateShort(raw?.purchased_date) : "N/A";
  const maxWeight = cleanStr(raw?.maximum_weight, "N/A");
  const maxLoad = cleanStr(raw?.minimum_load, "N/A");
  const maxLiters = cleanStr(raw?.max_liters, "N/A");
  const cbmLength = cleanStr(raw?.cbm_length, "N/A");
  const cbmWidth = cleanStr(raw?.cbm_width, "N/A");
  const cbmHeight = cleanStr(raw?.cbm_height, "N/A");
  const rfid = cleanStr(raw?.rfid_code, "N/A");

  return (
    <div className="grid gap-4">
      {loading ? (
        <>
          <SectionSkeleton rows={6} />
          <SectionSkeleton rows={4} />
        </>
      ) : (
        <>
          {/* Basic & Identification Information Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold">Vehicle Profile & Identification</div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={updating || saving}
                        onClick={() => setIsEditing(false)}
                        className="h-8 gap-1 text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={updating || saving}
                        onClick={handleSaveVehicleDetails}
                        className="h-8 gap-1 text-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {updating || saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Details
                    </Button>
                  )}
                </div>
              </div>

              {isEditing ? (
                /* EDIT FORM */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Plate Number *</Label>
                      <Input
                        className="h-9 text-xs"
                        value={editPlate}
                        onChange={(e) => setEditPlate(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Vehicle Name *</Label>
                      <Input
                        className="h-9 text-xs"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Vehicle Type</Label>
                      <Select
                        value={editTypeId === null ? "" : String(editTypeId)}
                        onValueChange={(v) => setEditTypeId(v ? Number(v) : null)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select type" />
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

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Make</Label>
                      <Input
                        className="h-9 text-xs"
                        value={editMake}
                        onChange={(e) => setEditMake(e.target.value)}
                        placeholder="e.g. Toyota"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Model</Label>
                      <Input
                        className="h-9 text-xs"
                        value={editModel}
                        onChange={(e) => setEditModel(e.target.value)}
                        placeholder="e.g. Hilux"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Year Model</Label>
                      <Input
                        className="h-9 text-xs"
                        value={editYearModel}
                        onChange={(e) => setEditYearModel(e.target.value)}
                        placeholder="e.g. 2024"
                        inputMode="numeric"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">VIN / Chassis No.</Label>
                      <Input
                        className="h-9 text-xs"
                        value={editVinNo}
                        onChange={(e) => setEditVinNo(e.target.value)}
                        placeholder="e.g. VIN12345"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Engine No.</Label>
                      <Input
                        className="h-9 text-xs"
                        value={editEngineNo}
                        onChange={(e) => setEditEngineNo(e.target.value)}
                        placeholder="e.g. 2KD-998811"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Fuel Type</Label>
                      <Select
                        value={editFuelTypeId === null ? "" : String(editFuelTypeId)}
                        onValueChange={(v) => setEditFuelTypeId(v ? Number(v) : null)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select fuel type" />
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

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Engine Type</Label>
                      <Select
                        value={editEngineTypeId === null ? "" : String(editEngineTypeId)}
                        onValueChange={(v) => setEditEngineTypeId(v ? Number(v) : null)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select engine type" />
                        </SelectTrigger>
                        <SelectContent>
                          {engineOptions.map((eg) => (
                            <SelectItem key={eg.id} value={String(eg.id)}>
                              {eg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Photo Change Section */}
                  <div className="border-t pt-4">
                    <Label className="text-xs mb-2 block">Vehicle Photo</Label>
                    <div className="flex items-center gap-4">
                      {currentImage ? (
                        <div className="relative h-24 w-32 rounded-md overflow-hidden border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentImage}
                            alt="Vehicle Preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-24 w-32 rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                          No Photo
                        </div>
                      )}

                      <div>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageChange(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingImage}
                          onClick={() => photoInputRef.current?.click()}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {uploadingImage ? "Uploading..." : "Change / Upload Photo"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* VIEW DETAILS */
                <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-12">
                  <div className={currentImage ? "md:col-span-8" : "md:col-span-12"}>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <Field label="Plate Number" value={vehicle.plateNo} />
                      <Field label="Vehicle Name" value={vehicle.vehicleName} />
                      <Field label="Type" value={vehicle.vehicleTypeName || "N/A"} />

                      <Field label="Make" value={make} />
                      <Field label="Model" value={model} />
                      <Field label="Year Model" value={yearModel} />

                      <Field label="VIN / Chassis No." value={vinNo} />
                      <Field label="Engine No." value={engineNo} />
                      <Field
                        label="Status"
                        value={
                          <Badge className="px-3" variant={statusVariant(vehicle.status)}>
                            {vehicle.status || "Inactive"}
                          </Badge>
                        }
                      />
                    </div>
                  </div>

                  {currentImage ? (
                    <div className="md:col-span-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Vehicle Photo</div>
                        <div>
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageChange(file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={uploadingImage}
                            onClick={() => photoInputRef.current?.click()}
                            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                          >
                            <Camera className="h-3 w-3" />
                            {uploadingImage ? "Uploading..." : "Change Photo"}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 overflow-hidden rounded-lg border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentImage}
                          alt="Vehicle"
                          className="h-44 w-full object-cover md:h-48"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="md:col-span-4">
                      <div className="text-xs text-muted-foreground">Vehicle Photo</div>
                      <div className="mt-2 rounded-lg border border-dashed p-6 text-center">
                        <Camera className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageChange(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingImage}
                          onClick={() => photoInputRef.current?.click()}
                          className="h-7 text-xs"
                        >
                          {uploadingImage ? "Uploading..." : "Upload Photo"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration Documents Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Registration Documents</div>
                  <div className="text-xs text-muted-foreground">OR, CR, Insurance policies and compliance records</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchDocs}
                    disabled={docsLoading}
                    className="h-8 gap-1.5"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", docsLoading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowUploadDoc((v) => !v)}
                    className="h-8 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {showUploadDoc ? "Hide Form" : "Upload Document"}
                  </Button>
                </div>
              </div>

              {/* Upload Document Inline Form */}
              {showUploadDoc && (
                <div className="mt-4 rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Upload New Registration Document
                    </div>
                  </div>

                  {/* Conflict Notice if duplicate */}
                  {(() => {
                    const conflict = getConflict(newDocNo);
                    if (!conflict) return null;
                    return (
                      <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive border border-destructive/20">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Document No. conflict: {conflict}</span>
                      </div>
                    );
                  })()}

                  {/* OCR Progress Indicator */}
                  {isOcrRunning && (
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
                        value={newDocType}
                        onValueChange={(v) => setNewDocType(v as "OR" | "CR" | "Insurance" | "Other")}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                        {Boolean(getConflict(newDocNo)) && (
                          <span className="text-[10px] text-destructive font-semibold">Duplicate</span>
                        )}
                      </div>
                      <Input
                        className={cn(
                          "h-8 text-xs",
                          Boolean(getConflict(newDocNo)) && "border-destructive focus-visible:ring-destructive/30"
                        )}
                        value={newDocNo}
                        onChange={(e) => setNewDocNo(e.target.value)}
                        placeholder="e.g. OR-884920"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Issued Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={newDocIssued}
                        onChange={(e) => setNewDocIssued(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Expiry Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={newDocExpiry}
                        onChange={(e) => setNewDocExpiry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
                    <div className="sm:col-span-2 grid gap-1.5">
                      <Label className="text-xs">Remarks</Label>
                      <Input
                        className="h-8 text-xs"
                        value={newDocRemarks}
                        onChange={(e) => setNewDocRemarks(e.target.value)}
                        placeholder="Optional remarks"
                      />
                    </div>

                    <div>
                      <input
                        ref={docFileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewDocFile(file);
                            if (file.type.startsWith("image/")) {
                              handleScanUploadedDoc(file);
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-8 w-full gap-1.5 text-xs truncate",
                          newDocFile && "border-primary text-primary"
                        )}
                        onClick={() => docFileInputRef.current?.click()}
                      >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{newDocFile ? newDocFile.name : "Choose File & Auto-OCR"}</span>
                      </Button>
                    </div>

                    <div>
                      <Button
                        type="button"
                        variant="default"
                        disabled={uploadingDoc || !newDocFile || Boolean(getConflict(newDocNo))}
                        className="h-8 w-full gap-2 text-xs"
                        onClick={() => {
                          if (newDocFile) handleUploadDocs([newDocFile]);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {uploadingDoc ? "Uploading..." : "Save Document"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents List */}
              <div className="mt-4">
                {documents.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No registration documents uploaded yet for this vehicle.
                  </div>
                ) : (
                  <div className="divide-y rounded-md border">
                    {documents.map((d) => (
                      <div key={d.id} className="p-3 text-xs hover:bg-muted/30 transition">
                        {editingDocId === d.id ? (
                          /* INLINE EDIT DOCUMENT FORM */
                          <div className="space-y-3 bg-muted/30 p-3 rounded-md">
                            <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                              <span>Edit Document Details</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setEditingDocId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                              <div className="grid gap-1">
                                <Label className="text-[11px]">Type</Label>
                                <Select
                                  value={editDocType}
                                  onValueChange={(v) =>
                                    setEditDocType(v as "OR" | "CR" | "Insurance" | "Other")
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
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

                              <div className="grid gap-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[11px]">Document No.</Label>
                                  {Boolean(getConflict(editDocNo, editingDocId)) && (
                                    <span className="text-[10px] text-destructive font-semibold">Duplicate</span>
                                  )}
                                </div>
                                <Input
                                  className={cn(
                                    "h-8 text-xs",
                                    Boolean(getConflict(editDocNo, editingDocId)) && "border-destructive focus-visible:ring-destructive/30"
                                  )}
                                  value={editDocNo}
                                  onChange={(e) => setEditDocNo(e.target.value)}
                                  placeholder="e.g. OR-884920"
                                />
                                {Boolean(getConflict(editDocNo, editingDocId)) && (
                                  <p className="text-[10px] text-destructive leading-tight">
                                    {getConflict(editDocNo, editingDocId)}
                                  </p>
                                )}
                              </div>

                              <div className="grid gap-1">
                                <Label className="text-[11px]">Issued Date</Label>
                                <Input
                                  type="date"
                                  className="h-8 text-xs"
                                  value={editDocIssued}
                                  onChange={(e) => setEditDocIssued(e.target.value)}
                                />
                              </div>

                              <div className="grid gap-1">
                                <Label className="text-[11px]">Expiry Date</Label>
                                <Input
                                  type="date"
                                  className="h-8 text-xs"
                                  value={editDocExpiry}
                                  onChange={(e) => setEditDocExpiry(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid gap-1">
                              <Label className="text-[11px]">Remarks</Label>
                              <Input
                                className="h-8 text-xs"
                                value={editDocRemarks}
                                onChange={(e) => setEditDocRemarks(e.target.value)}
                                placeholder="Notes or remarks"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingDocId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingDocEdit}
                                className="h-7 text-xs gap-1"
                                onClick={handleSaveDocEdit}
                              >
                                <Check className="h-3 w-3" />
                                {savingDocEdit ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* VIEW DOCUMENT ROW */
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div>
                                <div className="font-semibold text-foreground flex items-center gap-2">
                                  {d.file_name || `Document #${d.id}`}
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {d.document_type}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                                  {d.document_no && <span>No: {d.document_no}</span>}
                                  {d.issued_date && <span>Issued: {fmtDateShort(d.issued_date)}</span>}
                                  {d.expiry_date && <span>Expires: {fmtDateShort(d.expiry_date)}</span>}
                                  {d.remarks && <span>Note: {d.remarks}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                              {d.file_id && (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                >
                                  <a
                                    href={`${(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "")}/assets/${d.file_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    View File
                                  </a>
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => startEditDoc(d)}
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteDoc(d.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Operational Details */}
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Operational Details</div>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                <Field label="Current Mileage" value={mileage} />
                <Field label="Fuel Type" value={fuelType} />
                <Field label="Engine Type" value={engineType} />
                <Field label="Seats" value={seats} />
                <Field label="Max Liters" value={maxLiters} />
                <Field label="RFID Code" value={rfid} />
                <Field label="Current Driver" value={vehicle.driverName || "N/A"} />
                <Field label="Year To Last" value={year} />
                <Field label="Purchased Date" value={purchasedDate} />
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Technical Specifications</div>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                <Field label="Maximum Weight" value={maxWeight} />
                <Field label="Maximum Load" value={maxLoad} />
                <Field label="CBM Length" value={cbmLength} />
                <Field label="CBM Width" value={cbmWidth} />
                <Field label="CBM Height" value={cbmHeight} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
