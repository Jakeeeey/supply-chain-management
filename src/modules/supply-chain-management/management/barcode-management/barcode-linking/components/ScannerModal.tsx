"use client";

import React, { useState, useEffect } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Barcode from "react-barcode";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ScanLine,
  Wand2,
  RefreshCcw,
  Keyboard,
  ArrowLeft,
  Scan,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Product, UpdateBarcodeDTO } from "../types";
import {
  generateEAN13,
  generateCode128,
  validateEAN13,
  validateCode128,
} from "../utils/barcodeUtils";

interface RefData {
  id: number;
  name: string;
  code?: string;
}

interface ScannerModalProps {
  open: boolean;
  product: Product | null;
  allProducts: Product[];
  onClose: () => void;
  onSave: (data: UpdateBarcodeDTO) => Promise<void>;
}

export function ScannerModal({
  open,
  product,
  allProducts,
  onClose,
  onSave,
}: ScannerModalProps) {
  const [step, setStep] = useState<"profile" | "assignment">("profile");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Dynamic Data State
  const [barcodeTypes, setBarcodeTypes] = useState<RefData[]>([]);
  const [weightUnits, setWeightUnits] = useState<RefData[]>([]);
  const [cbmUnits, setCbmUnits] = useState<RefData[]>([]);

  // Selection
  const [selectedBarcodeTypeId, setSelectedBarcodeTypeId] =
    useState<string>("");

  // Dimensions & Weight (Use Strings to allow typing decimals)
  const [recordDimensions, setRecordDimensions] = useState(false);
  const [dimensions, setDimensions] = useState({
    length: "",
    width: "",
    height: "",
    unit: "", // CBM Unit ID
    weight: "",
    weightUnit: "", // Weight Unit ID
  });

  // --- FETCH DATA ---
  useEffect(() => {
    if (open) {
      const fetchRefs = async () => {
        try {
          const [btRes, wuRes, cuRes] = await Promise.all([
            fetch(
              "/api/scm/management/barcode-management/barcode-linking?scope=barcode_type",
            ),
            fetch(
              "/api/scm/management/barcode-management/barcode-linking?scope=weight_unit",
            ),
            fetch(
              "/api/scm/management/barcode-management/barcode-linking?scope=cbm_unit",
            ),
          ]);

          if (btRes.ok) {
            const data = await btRes.json();
            const list = Array.isArray(data.data) ? data.data : [];
            setBarcodeTypes(list);

            // Set Default Barcode Type (EAN-13)
            if (list.length > 0 && !selectedBarcodeTypeId) {
              const defaultType =
                list.find((t: any) => t.name?.includes("EAN")) || list[0];
              if (defaultType?.id)
                setSelectedBarcodeTypeId(String(defaultType.id));
            }
          }

          if (wuRes.ok) {
            const data = await wuRes.json();
            const list = Array.isArray(data.data) ? data.data : [];
            setWeightUnits(list);

            // Set Default Weight Unit (KG)
            if (list.length > 0 && !dimensions.weightUnit) {
              const defaultUnit =
                list.find((u: any) => u.code === "KG") || list[0];
              if (defaultUnit?.id)
                setDimensions((prev) => ({
                  ...prev,
                  weightUnit: String(defaultUnit.id),
                }));
            }
          }

          if (cuRes.ok) {
            const data = await cuRes.json();
            const list = Array.isArray(data.data) ? data.data : [];
            setCbmUnits(list);

            // Set Default CBM Unit (CM)
            if (list.length > 0 && !dimensions.unit) {
              const defaultUnit =
                list.find((u: any) => u.code === "CM") || list[0];
              if (defaultUnit?.id)
                setDimensions((prev) => ({
                  ...prev,
                  unit: String(defaultUnit.id),
                }));
            }
          }
        } catch (error) {
          console.error("Failed to fetch reference data", error);
        }
      };
      fetchRefs();
    }
  }, [open]);

  // --- RESET STATE ON OPEN ---
  useEffect(() => {
    if (open && product) {
      setBarcode(product.barcode || "");
      setScanSuccess(false);
      setCameraError(null);
      setStep("profile");
      setRecordDimensions(false);
      // Reset inputs to empty strings for typing
      setDimensions((prev) => ({
        ...prev,
        length: "",
        width: "",
        height: "",
        weight: "",
      }));
    } else {
      setBarcode("");
    }
  }, [open, product]);

  const getSelectedBarcodeTypeName = () => {
    return (
      barcodeTypes.find((t) => String(t.id) === selectedBarcodeTypeId)?.name ||
      "EAN-13"
    );
  };

  const handleSave = async () => {
    if (!barcode) {
      toast.error("Barcode cannot be empty.");
      return;
    }

    // Weight is mandatory per business rules
    if (!dimensions.weight || parseFloat(dimensions.weight) <= 0) {
      toast.error("Weight must be greater than zero.");
      return;
    }
    if (!dimensions.weightUnit) {
      toast.error("Weight unit is required.");
      return;
    }

    // 1. Validation
    let isValidFormat = true;
    let formatError = "";
    const typeName = getSelectedBarcodeTypeName();

    if (typeName.includes("EAN-13")) {
      const check = validateEAN13(barcode);
      if (!check.isValid) {
        isValidFormat = false;
        formatError = check.error || "Invalid EAN-13";
      }
    } else if (typeName.includes("Code 128")) {
      const check = validateCode128(barcode);
      if (!check.isValid) {
        isValidFormat = false;
        formatError = check.error || "Invalid Code 128";
      }
    }

    if (!isValidFormat) {
      toast.error(`Format Mismatch: ${typeName}`, { description: formatError });
      return;
    }

    const duplicate = allProducts.find(
      (p) => p.barcode === barcode && p.product_id !== product?.product_id,
    );

    if (duplicate) {
      toast.error(`Conflict Detected!`, {
        description: `Barcode used by: "${duplicate.product_name}"`,
      });
      return;
    }

    // 2. Prepare Payload
    // Convert strings to numbers for API
    const payload: UpdateBarcodeDTO = {
      barcode,
      barcode_type_id: parseInt(selectedBarcodeTypeId),
      weight: parseFloat(dimensions.weight), // DB Field: weight
      weight_unit_id: parseInt(dimensions.weightUnit), // DB Field: weight_unit_id
    };

    if (recordDimensions) {
      if (
        !dimensions.length || parseFloat(dimensions.length) <= 0 ||
        !dimensions.width || parseFloat(dimensions.width) <= 0 ||
        !dimensions.height || parseFloat(dimensions.height) <= 0
      ) {
        toast.error("All CBM dimensions must be greater than zero.");
        return;
      }
      if (!dimensions.unit) {
        toast.error("CBM unit is required.");
        return;
      }
      payload.cbm_length = parseFloat(dimensions.length);
      payload.cbm_width = parseFloat(dimensions.width);
      payload.cbm_height = parseFloat(dimensions.height);
      payload.cbm_unit_id = parseInt(dimensions.unit);
    }

    setLoading(true);
    try {
      await onSave(payload);
      onClose();
    } catch (e: any) {
      console.error("Save failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (err: any, result: any) => {
    if (err?.name === "NotAllowedError")
      setCameraError("Camera permission denied.");
    if (result && result.getText() !== barcode) {
      setBarcode(result.getText());
      setScanSuccess(true);
      toast.success("Barcode detected!");
    }
  };

  const handleGenerate = () => {
    const typeName = getSelectedBarcodeTypeName();
    const newCode = typeName.includes("EAN-13")
      ? generateEAN13()
      : generateCode128();
    setBarcode(newCode);
    setScanSuccess(true);
  };

  const handleMethodSelect = (m: string) => {
    setActiveTab(m);
    setStep("assignment");
  };

  // --- RENDERERS ---
  const renderProfileStep = () => (
    <div className="space-y-8 py-2">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Product Name
            </span>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {product?.description || product?.product_name}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              SKU Code
            </span>
            <p className="font-mono text-sm font-medium">
              {product?.product_code}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Select Barcode Assignment Method
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="group cursor-pointer border-2 hover:border-blue-500/20 hover:shadow-md transition-all p-6 text-center space-y-4"
            onClick={() => handleMethodSelect("manual")}
          >
            <div className="h-14 w-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Keyboard className="h-7 w-7" />
            </div>
            <div>
              <span className="block font-semibold text-sm">Manual Entry</span>
            </div>
          </Card>
          <Card
            className="group cursor-pointer border-2 hover:border-purple-500/20 hover:shadow-md transition-all p-6 text-center space-y-4"
            onClick={() => handleMethodSelect("scan")}
          >
            <div className="h-14 w-14 mx-auto rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Scan className="h-7 w-7" />
            </div>
            <div>
              <span className="block font-semibold text-sm">Scanning</span>
            </div>
          </Card>
          <Card
            className="group cursor-pointer border-2 hover:border-amber-500/20 hover:shadow-md transition-all p-6 text-center space-y-4"
            onClick={() => handleMethodSelect("generate")}
          >
            <div className="h-14 w-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wand2 className="h-7 w-7" />
            </div>
            <div>
              <span className="block font-semibold text-sm">
                Generate Barcode
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderAssignmentStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="font-semibold text-lg">{product?.product_code}</h3>
          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
            {product?.description || product?.product_name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStep("profile")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </div>

      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="p-2 bg-primary/10 rounded-full">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            Barcode Type Setting
          </Label>
          <p className="text-xs text-muted-foreground">
            This format will be enforced on save.
          </p>
        </div>
        <div className="w-[180px]">
          {/* ✅ UPDATED: Select with Fallback and Filter */}
          <Select
            value={selectedBarcodeTypeId || undefined}
            onValueChange={setSelectedBarcodeTypeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {barcodeTypes
                .filter((t) => t?.id) // Ensure ID exists
                .map((t) => (
                  <SelectItem key={String(t.id)} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="scan">Barcode Scanning</TabsTrigger>
          <TabsTrigger value="generate">System Generated</TabsTrigger>
        </TabsList>
        <div className="p-4 border rounded-lg bg-card space-y-4">
          <TabsContent value="manual" className="mt-0 space-y-4">
            <div className="space-y-2">
              <Label>
                Barcode Value <span className="text-red-500">*</span>
              </Label>
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Enter code..."
                className="font-mono text-lg"
                autoFocus
              />
            </div>
          </TabsContent>

          <TabsContent
            value="scan"
            className="mt-0 flex flex-col items-center gap-4"
          >
            <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden border shadow-inner flex items-center justify-center">
              {activeTab === "scan" && (
                <div className="absolute inset-0">
                  <BarcodeScannerComponent
                    onUpdate={handleScan}
                    width="100%"
                    height="100%"
                    videoConstraints={{ facingMode: "environment" }}
                  />
                </div>
              )}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <div className="relative w-64 h-32 flex flex-col items-center justify-center">
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg" />
                  {scanSuccess && (
                    <div className="animate-in zoom-in duration-300 bg-white/20 backdrop-blur-sm p-3 rounded-full">
                      <CheckCircle2 className="w-10 h-10 text-green-400 drop-shadow-lg" />
                    </div>
                  )}
                </div>
                <p className="mt-4 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                  Center barcode horizontally inside the box
                </p>
              </div>
            </div>
            <div className="w-full flex items-center justify-between p-4 rounded-lg border bg-white shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 rounded-md">
                  <ScanLine className="h-5 w-5 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  Scanned Code:
                </span>
              </div>
              <span
                className={`font-mono text-lg font-bold ${barcode ? "text-green-600" : "text-slate-300"}`}
              >
                {barcode || "Waiting..."}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="mt-0 space-y-4">
            <Button onClick={handleGenerate} className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" /> Generate{" "}
              {getSelectedBarcodeTypeName()}
            </Button>

            <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded bg-white min-h-[100px]">
              {barcode ? (
                <Barcode
                  value={barcode}
                  format={
                    getSelectedBarcodeTypeName().includes("EAN")
                      ? "EAN13"
                      : "CODE128"
                  }
                  width={1.5}
                  height={50}
                  fontSize={14}
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  Click Generate to create a code
                </span>
              )}
            </div>
            <Input value={barcode} readOnly className="bg-muted font-mono" />
          </TabsContent>
        </div>
      </Tabs>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dims"
            checked={recordDimensions}
            onCheckedChange={(c) => setRecordDimensions(!!c)}
          />
          <Label htmlFor="dims" className="font-normal cursor-pointer">
            Record Dimensions (CBM)
          </Label>
        </div>

        {recordDimensions && (
          <div className="grid grid-cols-4 gap-4 animate-in fade-in">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Length</Label>
              <Input
                placeholder="0"
                type="number"
                value={dimensions.length}
                onChange={(e) =>
                  setDimensions({ ...dimensions, length: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Width</Label>
              <Input
                placeholder="0"
                type="number"
                value={dimensions.width}
                onChange={(e) =>
                  setDimensions({ ...dimensions, width: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Height</Label>
              <Input
                placeholder="0"
                type="number"
                value={dimensions.height}
                onChange={(e) =>
                  setDimensions({ ...dimensions, height: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unit</Label>
              {/* ✅ UPDATED: CBM Unit Select */}
              <Select
                value={dimensions.unit || undefined}
                onValueChange={(v) => setDimensions({ ...dimensions, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {cbmUnits
                    .filter((u) => u?.id)
                    .map((u) => (
                      <SelectItem key={String(u.id)} value={String(u.id)}>
                        {u.code || u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3 space-y-1">
            <Label className="text-xs text-muted-foreground">
              Weight (Required)
            </Label>
            <Input
              placeholder="0"
              type="number"
              value={dimensions.weight}
              onChange={(e) =>
                setDimensions({ ...dimensions, weight: e.target.value })
              }
            />
          </div>
          <div className="col-span-1 space-y-1">
            <Label className="text-xs text-muted-foreground">&nbsp;</Label>
            {/* ✅ UPDATED: Weight Unit Select */}
            <Select
              value={dimensions.weightUnit || undefined}
              onValueChange={(v) =>
                setDimensions({ ...dimensions, weightUnit: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {weightUnits
                  .filter((u) => u?.id)
                  .map((u) => (
                    <SelectItem key={String(u.id)} value={String(u.id)}>
                      {u.code || u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "profile" ? "Product Profile" : "Barcode Assignment"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === "profile" ? "View details" : "Assign barcode"}
          </DialogDescription>
        </DialogHeader>
        {step === "profile" ? renderProfileStep() : renderAssignmentStep()}
        {step === "assignment" && (
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setStep("profile")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !barcode}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
