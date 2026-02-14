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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ScanLine,
  Wand2,
  RefreshCcw,
  Keyboard,
  ArrowLeft,
  Scan,
  CheckCircle2,
  Settings2,
  Package,
  Layers,
  Scale,
  Ruler,
} from "lucide-react";
import { Product, Category, Unit, RefData, UpdateBarcodeDTO } from "../types";
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
  barcodeTypes: RefData[];
  weightUnits: RefData[];
  cbmUnits: RefData[];
  onClose: () => void;
  onSave: (data: UpdateBarcodeDTO) => Promise<void>;
}

export function ScannerModal({
  open,
  product,
  allProducts,
  barcodeTypes,
  weightUnits,
  cbmUnits,
  onClose,
  onSave,
}: ScannerModalProps) {
  const [step, setStep] = useState<"profile" | "assignment">("profile");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);


  // Selection
  const [selectedBarcodeTypeId, setSelectedBarcodeTypeId] =
    useState<string>("");

  // Dimensions & Weight
  const [recordDimensions, setRecordDimensions] = useState(false);
  const [dimensions, setDimensions] = useState({
    length: "",
    width: "",
    height: "",
    unit: "",
    weight: "",
    weightUnit: "",
  });

  // --- SET DEFAULTS FROM CACHED REF DATA ---
  useEffect(() => {
    if (open) {
      if (barcodeTypes.length > 0 && !selectedBarcodeTypeId) {
        const defaultType =
          barcodeTypes.find((t) => t.name?.includes("EAN")) || barcodeTypes[0];
        if (defaultType?.id)
          setSelectedBarcodeTypeId(String(defaultType.id));
      }
      if (weightUnits.length > 0 && !dimensions.weightUnit) {
        const defaultUnit =
          weightUnits.find((u) => u.code === "KG") || weightUnits[0];
        if (defaultUnit?.id)
          setDimensions((prev) => ({
            ...prev,
            weightUnit: String(defaultUnit.id),
          }));
      }
      if (cbmUnits.length > 0 && !dimensions.unit) {
        const defaultUnit =
          cbmUnits.find((u) => u.code === "CM") || cbmUnits[0];
        if (defaultUnit?.id)
          setDimensions((prev) => ({
            ...prev,
            unit: String(defaultUnit.id),
          }));
      }
    }
  }, [open, barcodeTypes, weightUnits, cbmUnits]);

  // --- RESET STATE ON OPEN ---
  useEffect(() => {
    if (open && product) {
      setBarcode(product.barcode || "");
      setScanSuccess(false);
      setCameraError(null);
      setStep("profile");
      setRecordDimensions(false);
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

  // --- HELPERS ---
  const getSelectedBarcodeTypeName = () => {
    return (
      barcodeTypes.find((t) => String(t.id) === selectedBarcodeTypeId)?.name ||
      "EAN-13"
    );
  };

  const getCategoryName = () => {
    if (
      typeof product?.product_category === "object" &&
      product?.product_category
    ) {
      return (product.product_category as Category).category_name;
    }
    if (typeof product?.product_category === "string") {
      return product.product_category;
    }
    return "Uncategorized";
  };

  const getUnitName = () => {
    if (
      typeof product?.unit_of_measurement === "object" &&
      product?.unit_of_measurement
    ) {
      return (
        (product.unit_of_measurement as Unit).unit_shortcut ||
        (product.unit_of_measurement as Unit).unit_name
      );
    }
    return "PCS";
  };

  // --- SAVE ---
  const handleSave = async () => {
    if (!barcode) {
      toast.error("Barcode cannot be empty.");
      return;
    }

    if (!dimensions.weight || parseFloat(dimensions.weight) <= 0) {
      toast.error("Weight must be greater than zero.");
      return;
    }
    if (!dimensions.weightUnit) {
      toast.error("Weight unit is required.");
      return;
    }

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

    const payload: UpdateBarcodeDTO = {
      barcode,
      barcode_type_id: parseInt(selectedBarcodeTypeId),
      barcode_date: new Date().toISOString(),
      weight: parseFloat(dimensions.weight),
      weight_unit_id: parseInt(dimensions.weightUnit),
    };

    if (recordDimensions) {
      if (
        !dimensions.length ||
        parseFloat(dimensions.length) <= 0 ||
        !dimensions.width ||
        parseFloat(dimensions.width) <= 0 ||
        !dimensions.height ||
        parseFloat(dimensions.height) <= 0
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

  // ============================
  // PROFILE STEP
  // ============================
  const renderProfileStep = () => (
    <div className="space-y-6 py-2">
      {/* Product Identity Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2 min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {product?.description || product?.product_name}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {product?.product_code}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-xs"
                >
                  <Layers className="h-3 w-3 mr-1" />
                  {getCategoryName()}
                </Badge>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                  {getUnitName()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Method Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Select Barcode Assignment Method
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card
            className="group cursor-pointer border-2 hover:border-primary/30 hover:shadow-sm transition-all"
            onClick={() => handleMethodSelect("manual")}
          >
            <CardContent className="p-5 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Keyboard className="h-6 w-6" />
              </div>
              <div>
                <span className="block font-semibold text-sm">
                  Manual Entry
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Type a barcode value
                </span>
              </div>
            </CardContent>
          </Card>
          <Card
            className="group cursor-pointer border-2 hover:border-primary/30 hover:shadow-sm transition-all"
            onClick={() => handleMethodSelect("scan")}
          >
            <CardContent className="p-5 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Scan className="h-6 w-6" />
              </div>
              <div>
                <span className="block font-semibold text-sm">Scanning</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Use camera to scan
                </span>
              </div>
            </CardContent>
          </Card>
          <Card
            className="group cursor-pointer border-2 hover:border-primary/30 hover:shadow-sm transition-all"
            onClick={() => handleMethodSelect("generate")}
          >
            <CardContent className="p-5 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wand2 className="h-6 w-6" />
              </div>
              <div>
                <span className="block font-semibold text-sm">
                  Generate Barcode
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Auto-generate a code
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // ============================
  // ASSIGNMENT STEP
  // ============================
  const renderAssignmentStep = () => (
    <ScrollArea className="h-full">
      <div className="space-y-5 pr-3">
        {/* Product Summary Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                {product?.description || product?.product_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] px-1.5 py-0 h-5"
                >
                  {product?.product_code}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {getCategoryName()}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("profile")}
            className="shrink-0"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
          </Button>
        </div>

        <Separator />

        {/* Barcode Type Setting */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Settings2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Barcode Format
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Enforced on save
                </p>
              </div>
              <div className="w-[160px]">
                <Select
                  value={selectedBarcodeTypeId || undefined}
                  onValueChange={setSelectedBarcodeTypeId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {barcodeTypes
                      .filter((t) => t?.id)
                      .map((t) => (
                        <SelectItem key={String(t.id)} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="text-xs">
              <Keyboard className="h-3.5 w-3.5 mr-1.5" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="scan" className="text-xs">
              <Scan className="h-3.5 w-3.5 mr-1.5" />
              Scan
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-xs">
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Generate
            </TabsTrigger>
          </TabsList>

          <Card className="mt-3">
            <CardContent className="p-4">
              <TabsContent value="manual" className="mt-0 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">
                    Barcode Value <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Enter barcode..."
                    className="font-mono text-base"
                    autoFocus
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="scan"
                className="mt-0 flex flex-col items-center gap-3"
              >
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border flex items-center justify-center">
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
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />
                      {scanSuccess && (
                        <div className="animate-in zoom-in duration-300 bg-white/20 backdrop-blur-sm p-3 rounded-full">
                          <CheckCircle2 className="w-10 h-10 text-green-400 drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                      Center barcode inside the frame
                    </p>
                  </div>
                </div>
                <div className="w-full flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Scanned:
                    </span>
                  </div>
                  <span
                    className={`font-mono text-sm font-bold ${barcode ? "text-green-600" : "text-muted-foreground"}`}
                  >
                    {barcode || "Waiting..."}
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="generate" className="mt-0 space-y-3">
                <Button onClick={handleGenerate} className="w-full" size="sm">
                  <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Generate{" "}
                  {getSelectedBarcodeTypeName()}
                </Button>
                <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 min-h-[80px]">
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
                    <span className="text-xs text-muted-foreground">
                      Click Generate to create a code
                    </span>
                  )}
                </div>
                <Input
                  value={barcode}
                  readOnly
                  className="bg-muted font-mono text-sm"
                />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        <Separator />

        {/* Logistics Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Scale className="h-4 w-4" /> Logistics Data
          </h4>

          {/* Weight (always visible) */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Weight <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="0.00"
                type="number"
                value={dimensions.weight}
                onChange={(e) =>
                  setDimensions({ ...dimensions, weight: e.target.value })
                }
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Unit</Label>
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

          {/* CBM Toggle + Fields */}
          <Card className="border-dashed">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dims"
                  checked={recordDimensions}
                  onCheckedChange={(c) => setRecordDimensions(!!c)}
                />
                <Label
                  htmlFor="dims"
                  className="text-xs font-normal cursor-pointer flex items-center gap-1.5"
                >
                  <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                  Record Dimensions (CBM)
                </Label>
              </div>

              {recordDimensions && (
                <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Length
                    </Label>
                    <Input
                      placeholder="0"
                      type="number"
                      value={dimensions.length}
                      onChange={(e) =>
                        setDimensions({
                          ...dimensions,
                          length: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Width
                    </Label>
                    <Input
                      placeholder="0"
                      type="number"
                      value={dimensions.width}
                      onChange={(e) =>
                        setDimensions({
                          ...dimensions,
                          width: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Height
                    </Label>
                    <Input
                      placeholder="0"
                      type="number"
                      value={dimensions.height}
                      onChange={(e) =>
                        setDimensions({
                          ...dimensions,
                          height: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Unit
                    </Label>
                    <Select
                      value={dimensions.unit || undefined}
                      onValueChange={(v) =>
                        setDimensions({ ...dimensions, unit: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {cbmUnits
                          .filter((u) => u?.id)
                          .map((u) => (
                            <SelectItem
                              key={String(u.id)}
                              value={String(u.id)}
                            >
                              {u.code || u.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-3 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {step === "profile" ? "Product Profile" : "Barcode Assignment"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {step === "profile"
                ? "Review product details and select assignment method"
                : "Assign a barcode and enter logistics data"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-4 flex-1 min-h-0 overflow-y-auto">
          {step === "profile" ? renderProfileStep() : renderAssignmentStep()}
        </div>

        {step === "assignment" && (
          <div className="border-t px-6 py-3 flex items-center justify-end gap-2 bg-muted/30 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("profile")}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading || !barcode}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
