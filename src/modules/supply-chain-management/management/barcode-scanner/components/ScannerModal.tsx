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
  AlertCircle,
  ScanLine,
  Wand2,
  RefreshCcw,
  Keyboard,
  ArrowLeft,
  Scan,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Product, getSupplierName } from "../types";
import {
  generateEAN13,
  generateCode128,
  validateEAN13,
  validateCode128,
} from "../utils/barcodeUtils";

interface ScannerModalProps {
  open: boolean;
  product: Product | null;
  allProducts: Product[];
  onClose: () => void;
  onSave: (barcode: string) => Promise<void>;
}

export function ScannerModal({
  open,
  product,
  allProducts,
  onClose,
  onSave,
}: ScannerModalProps) {
  // Navigation
  const [step, setStep] = useState<"profile" | "assignment">("profile");

  // Data State
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");

  // Barcode Type (Global State)
  const [barcodeType, setBarcodeType] = useState<"EAN-13" | "Code 128">(
    "EAN-13",
  );

  // Scanner State
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Dimensions
  const [recordDimensions, setRecordDimensions] = useState(false);
  const [dimensions, setDimensions] = useState({
    length: "",
    width: "",
    height: "",
    unit: "cm",
    weight: "",
    weightUnit: "kg",
  });

  useEffect(() => {
    if (open && product) {
      setBarcode(product.barcode || "");
      setScanSuccess(false);
      setCameraError(null);
      setStep("profile");
      setRecordDimensions(false);
      setDimensions({
        length: "",
        width: "",
        height: "",
        unit: "cm",
        weight: "",
        weightUnit: "kg",
      });
    } else {
      setBarcode("");
    }
  }, [open, product]);

  // --- STRICT VALIDATION HANDLER ---
  const handleSave = async () => {
    if (!barcode) {
      toast.error("Barcode cannot be empty.");
      return;
    }

    // 1. STRICT TYPE VALIDATION
    // We enforce the rules of the *Selected Barcode Type* on the *Barcode Value*.
    let isValidFormat = true;
    let formatError = "";

    if (barcodeType === "EAN-13") {
      const check = validateEAN13(barcode);
      if (!check.isValid) {
        isValidFormat = false;
        formatError = check.error || "Invalid EAN-13 format.";
      }
    } else if (barcodeType === "Code 128") {
      const check = validateCode128(barcode);
      if (!check.isValid) {
        isValidFormat = false;
        formatError = check.error || "Invalid Code 128 format.";
      }
    }

    if (!isValidFormat) {
      toast.error(`Format Mismatch: ${barcodeType}`, {
        description: formatError,
      });
      return; // STOP SAVE
    }

    // 2. DUPLICATE VALIDATION
    const duplicate = allProducts.find(
      (p) => p.barcode === barcode && p.product_id !== product?.product_id,
    );

    if (duplicate) {
      const conflictName =
        duplicate.description || duplicate.product_name || "Unknown Product";
      toast.error(`Conflict Detected!`, {
        description: `Barcode used by: "${conflictName}"`,
        duration: 5000,
      });
      return; // STOP SAVE
    }

    // 3. PROCEED TO SAVE
    setLoading(true);
    try {
      await onSave(barcode);
      toast.success("Barcode successfully assigned.");
      onClose();
    } catch (e: any) {
      console.error("Save failed", e);
      toast.error("Failed to save barcode.");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (err: any, result: any) => {
    if (err) {
      if (err?.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Please allow camera access.");
      }
      return;
    }
    if (result) {
      const code = result.getText();
      if (code && code !== barcode) {
        setBarcode(code);
        setScanSuccess(true);
        toast.success("Barcode detected!");
      }
    }
  };

  const handleGenerate = () => {
    // Force generation based on the SELECTED type
    const newCode =
      barcodeType === "EAN-13" ? generateEAN13() : generateCode128();
    setBarcode(newCode);
    setScanSuccess(true);
  };

  const handleMethodSelect = (method: string) => {
    setActiveTab(method);
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
              Category
            </span>
            <p className="text-sm font-medium text-foreground">
              {typeof product?.product_category === "object"
                ? (product?.product_category as any).category_name
                : "Industrial / Hardware"}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Supplier
            </span>
            <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {product ? getSupplierName(product) : "-"}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Current Barcode
            </span>
            <p
              className={`text-sm font-medium ${!product?.barcode ? "text-muted-foreground italic" : "font-mono"}`}
            >
              {product?.barcode || "Not Assigned"}
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
            className="group cursor-pointer border-2 hover:border-blue-500/20 hover:shadow-md transition-all duration-200"
            onClick={() => handleMethodSelect("manual")}
          >
            <div className="flex flex-col items-center justify-center p-6 h-48 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Keyboard className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="block font-semibold text-sm">
                  Manual Entry
                </span>
                <span className="block text-xs text-muted-foreground">
                  Type code manually
                </span>
              </div>
            </div>
          </Card>
          <Card
            className="group cursor-pointer border-2 hover:border-purple-500/20 hover:shadow-md transition-all duration-200"
            onClick={() => handleMethodSelect("scan")}
          >
            <div className="flex flex-col items-center justify-center p-6 h-48 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Scan className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="block font-semibold text-sm">Scanning</span>
                <span className="block text-xs text-muted-foreground">
                  Scan physical label
                </span>
              </div>
            </div>
          </Card>
          <Card
            className="group cursor-pointer border-2 hover:border-amber-500/20 hover:shadow-md transition-all duration-200"
            onClick={() => handleMethodSelect("generate")}
          >
            <div className="flex flex-col items-center justify-center p-6 h-48 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Wand2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="block font-semibold text-sm">
                  Generate Barcode
                </span>
                <span className="block text-xs text-muted-foreground">
                  Auto-generate code
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderAssignmentStep = () => (
    <div className="space-y-6">
      {/* Mini Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="font-semibold text-lg">
            {product?.product_code || "SKU-001"}
          </h3>
          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
            {product?.description || product?.product_name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStep("profile")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </div>

      {/* GLOBAL BARCODE TYPE SELECTOR */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="p-2 bg-primary/10 rounded-full">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <Label
            htmlFor="global-type"
            className="text-xs font-semibold uppercase text-muted-foreground"
          >
            Barcode Type Setting
          </Label>
          <p className="text-xs text-muted-foreground">
            This format will be enforced on save.
          </p>
        </div>
        <div className="w-[180px]">
          <Select
            value={barcodeType}
            onValueChange={(v: any) => setBarcodeType(v)}
          >
            <SelectTrigger id="global-type" className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EAN-13">EAN-13 (Retail)</SelectItem>
              <SelectItem value="Code 128">Code 128 (Logistics)</SelectItem>
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
                onChange={(e) => {
                  setBarcode(e.target.value);
                  setScanSuccess(false);
                }}
                placeholder={
                  barcodeType === "EAN-13"
                    ? "Enter 13-digit code..."
                    : "Enter alphanumeric code..."
                }
                className="font-mono text-lg"
                autoFocus
              />
            </div>
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Manual Mode</AlertTitle>
              <AlertDescription>
                Manually enter a barcode. It must match the{" "}
                <strong>{barcodeType}</strong> format selected above.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent
            value="scan"
            className="mt-0 flex flex-col items-center gap-4"
          >
            {cameraError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            ) : (
              <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 bg-black w-full aspect-[4/3] flex items-center justify-center shadow-inner">
                {open && activeTab === "scan" && (
                  <BarcodeScannerComponent
                    onUpdate={handleScan}
                    videoConstraints={{ facingMode: "environment" }}
                    width="100%"
                    height="100%"
                  />
                )}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div
                    className={`relative w-64 h-32 border-2 rounded-md box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors duration-300 ${scanSuccess ? "border-green-500 bg-green-500/10" : "border-white/70"}`}
                  >
                    {!scanSuccess && (
                      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                    )}
                    {scanSuccess && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 animate-in zoom-in duration-300 drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    Center barcode horizontally inside the box
                  </p>
                </div>
              </div>
            )}
            <div className="w-full flex items-center justify-between p-3 rounded-md border bg-muted/50">
              <div className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Scanned Code:</span>
              </div>
              <span
                className={`font-mono text-lg font-bold ${scanSuccess ? "text-green-600" : "text-muted-foreground"}`}
              >
                {barcode || "Waiting..."}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="mt-0 space-y-4">
            <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded bg-white min-h-[100px]">
              {barcode ? (
                <Barcode
                  value={barcode}
                  format={barcodeType === "EAN-13" ? "EAN13" : "CODE128"}
                  width={1.5}
                  height={50}
                  fontSize={14}
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  Click Generate to create a {barcodeType} code
                </span>
              )}
            </div>

            <Button onClick={handleGenerate} className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" /> Generate {barcodeType}
            </Button>

            <div className="space-y-2">
              <Label>Generated Value</Label>
              <Input value={barcode} readOnly className="bg-muted font-mono" />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Dimensions & Weight</h4>
        </div>

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
          <div className="grid grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Length</Label>
              <Input
                placeholder="0"
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
                value={dimensions.height}
                onChange={(e) =>
                  setDimensions({ ...dimensions, height: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unit</Label>
              <Select
                value={dimensions.unit}
                onValueChange={(v) => setDimensions({ ...dimensions, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">
              Weight <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="0"
              value={dimensions.weight}
              onChange={(e) =>
                setDimensions({ ...dimensions, weight: e.target.value })
              }
            />
          </div>
          <div className="col-span-1 space-y-1">
            <Label className="text-xs text-muted-foreground">&nbsp;</Label>
            <Select
              value={dimensions.weightUnit}
              onValueChange={(v) =>
                setDimensions({ ...dimensions, weightUnit: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
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
            {step === "profile"
              ? "View product details and select assignment method."
              : "Enter or generate barcode details below."}
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
