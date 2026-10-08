"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Barcode from "react-barcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Keyboard,
  Scan,
  Wand2,
  Package,
  Settings2,
  ScanLine,
  RefreshCcw,
  CheckCircle2,
  Scale,
  Ruler,
} from "lucide-react";

import { Product, RefData, UpdateBarcodeDTO, Category } from "../types";
import {
  generateEAN13,
  generateCode128,
  detectBarcodeType,
  validateEAN13,
} from "../utils/barcodeUtils";
import { validateAndBuildPayload } from "../utils/validationUtils";
import { formatInTimeZone } from "@/modules/supply-chain-management/product-management/utils/timezone";

interface EditBarcodeModalProps {
  open: boolean;
  product: Product | null;
  allProducts: Product[];
  allBarcodes: { product_id: string; barcode: string; product_name: string }[];
  barcodeTypes: RefData[];
  weightUnits: RefData[];
  cbmUnits: RefData[];
  onClose: () => void;
  onSave: (product: Product, data: UpdateBarcodeDTO) => Promise<void>;
  timezone: string;
}

export function EditBarcodeModal({
  open,
  product,
  allProducts,
  allBarcodes,
  barcodeTypes,
  weightUnits,
  cbmUnits,
  onClose,
  onSave,
  timezone,
}: EditBarcodeModalProps) {
  const [barcode, setBarcodeRaw] = useState("");
  const [selectedBarcodeTypeId, setSelectedBarcodeTypeId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("manual");
  const [scanSuccess, setScanSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordDimensions, setRecordDimensions] = useState(false);
  const [dimensions, setDimensions] = useState({
    length: "",
    width: "",
    height: "",
    unit: "",
    weight: "",
    weightUnit: "",
  });

  // Scanner hardware support
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [scanBuffer, setScanBuffer] = useState("");

  // Sync barcode type on change
  const handleBarcodeChange = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setBarcodeRaw(trimmed);

      if (trimmed && barcodeTypes.length > 0) {
        const detectedName = detectBarcodeType(trimmed);
        if (detectedName !== "UNKNOWN") {
          const normalize = (s: string) => s.replace(/[-\s]/g, "").toLowerCase();
          const matchingType = barcodeTypes.find(
            (t) => normalize(t.name || "") === normalize(detectedName),
          );
          if (matchingType?.id) {
            setSelectedBarcodeTypeId(String(matchingType.id));
          }
        }
      }
    },
    [barcodeTypes],
  );

  // Initialize values when modal opens
  useEffect(() => {
    if (open && product) {
      setBarcodeRaw(product.barcode || "");
      setScanSuccess(false);

      // Resolve initial barcode type
      const currentTypeId =
        typeof product.barcode_type_id === "object" && product.barcode_type_id
          ? String(product.barcode_type_id.id)
          : typeof product.barcode_type_id === "number"
            ? String(product.barcode_type_id)
            : "";

      if (currentTypeId) {
        setSelectedBarcodeTypeId(currentTypeId);
      } else if (barcodeTypes.length > 0) {
        const defaultType =
          barcodeTypes.find((t) => t.name?.includes("EAN")) || barcodeTypes[0];
        setSelectedBarcodeTypeId(String(defaultType.id));
      }

      // Initial dimensions & weight
      const hasDims = Boolean(
        product.cbm_length || product.cbm_width || product.cbm_height,
      );
      setRecordDimensions(hasDims);

      const resolvedWeightUnit =
        typeof product.weight_unit_id === "object" && product.weight_unit_id
          ? String(product.weight_unit_id.id)
          : typeof product.weight_unit_id === "number"
            ? String(product.weight_unit_id)
            : weightUnits.find((u) => u.code === "KG")?.id
              ? String(weightUnits.find((u) => u.code === "KG")?.id)
              : weightUnits[0]?.id
                ? String(weightUnits[0].id)
                : "";

      const resolvedCbmUnit =
        typeof product.cbm_unit_id === "object" && product.cbm_unit_id
          ? String(product.cbm_unit_id.id)
          : typeof product.cbm_unit_id === "number"
            ? String(product.cbm_unit_id)
            : cbmUnits.find((u) => u.code === "CM")?.id
              ? String(cbmUnits.find((u) => u.code === "CM")?.id)
              : cbmUnits[0]?.id
                ? String(cbmUnits[0].id)
                : "";

      setDimensions({
        weight: product.weight !== null && product.weight !== undefined ? String(product.weight) : "",
        weightUnit: resolvedWeightUnit,
        length: product.cbm_length !== null && product.cbm_length !== undefined ? String(product.cbm_length) : "",
        width: product.cbm_width !== null && product.cbm_width !== undefined ? String(product.cbm_width) : "",
        height: product.cbm_height !== null && product.cbm_height !== undefined ? String(product.cbm_height) : "",
        unit: resolvedCbmUnit,
      });
    }
  }, [open, product, barcodeTypes, weightUnits, cbmUnits]);

  // Focus hardware scanner input when scan tab is active
  useEffect(() => {
    if (activeTab === "scan" && !scanSuccess) {
      const timer = setTimeout(() => scannerInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, scanSuccess]);

  const handleHardwareKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (scanBuffer.trim()) {
        handleBarcodeChange(scanBuffer.trim());
        setScanSuccess(true);
        setScanBuffer("");
      }
      scannerInputRef.current?.focus();
    }
  };

  const handleScan = useCallback(
    (err: unknown, result: unknown) => {
      if (err && typeof err === "object" && "name" in err && err.name === "NotAllowedError") return;
      if (result && typeof result === "object" && "getText" in result) {
        const zResult = result as { getText: () => string };
        const value = zResult.getText().trim();
        if (value) {
          handleBarcodeChange(value);
          setScanSuccess(true);
        }
      }
    },
    [handleBarcodeChange],
  );

  const getSelectedBarcodeTypeName = () =>
    barcodeTypes.find((t) => String(t.id) === selectedBarcodeTypeId)?.name || "EAN-13";

  const handleGenerate = () => {
    const typeName = getSelectedBarcodeTypeName();
    const newCode = typeName.includes("EAN-13") ? generateEAN13() : generateCode128();
    handleBarcodeChange(newCode);
    setScanSuccess(true);
  };

  const handleSave = async () => {
    if (!product) return;
    const currentDbTime = formatInTimeZone(new Date(), timezone);
    const payload = validateAndBuildPayload({
      barcode,
      selectedBarcodeTypeId,
      barcodeTypes,
      dimensions,
      recordDimensions,
      product,
      allBarcodes,
      allProducts,
      dbTime: currentDbTime,
    });

    if (!payload) return;

    setLoading(true);
    try {
      await onSave(product, payload);
      onClose();
    } catch (e: unknown) {
      console.error("Save barcode edit failed:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const isBundle = product.record_type === "bundle";
  const categoryName =
    typeof product.product_category === "object" && product.product_category
      ? (product.product_category as Category).category_name
      : typeof product.product_category === "string"
        ? product.product_category
        : "Uncategorized";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Edit Barcode & Logistics
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update barcode, format, and logistics measurements for this {isBundle ? "bundle" : "product"}.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 flex-1 min-h-0 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="space-y-5 pr-3">
              {/* Product Identity Summary */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {product.description || product.product_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-5">
                      {isBundle ? "BDL" : "SKU"}: {product.product_code}
                    </Badge>
                    <Badge
                      className={
                        isBundle
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0 h-5"
                          : "bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-5"
                      }
                    >
                      {isBundle ? "Bundle" : "Regular"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">• {categoryName}</span>
                  </div>
                </div>
              </div>

              {/* Barcode Format Setting */}
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
                      <p className="text-[11px] text-muted-foreground">Enforced on save</p>
                    </div>
                    <div className="w-[170px]">
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
                    <Keyboard className="h-3.5 w-3.5 mr-1.5" /> Manual
                  </TabsTrigger>
                  <TabsTrigger value="scan" className="text-xs">
                    <Scan className="h-3.5 w-3.5 mr-1.5" /> Scan
                  </TabsTrigger>
                  <TabsTrigger value="generate" className="text-xs">
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate
                  </TabsTrigger>
                </TabsList>

                <Card className="mt-3">
                  <CardContent className="p-4">
                    {/* Manual Tab */}
                    <TabsContent value="manual" className="mt-0 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Barcode Value <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={barcode}
                          onChange={(e) => handleBarcodeChange(e.target.value)}
                          placeholder="Enter barcode..."
                          className="font-mono text-base"
                          autoFocus
                        />
                      </div>
                      {barcode && (
                        <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 min-h-[80px]">
                          {getSelectedBarcodeTypeName().includes("EAN") &&
                          !validateEAN13(barcode).isValid ? (
                            <span className="text-xs text-destructive font-medium px-2 text-center">
                              {validateEAN13(barcode).error || "Invalid EAN-13 barcode format"}
                            </span>
                          ) : (
                            <Barcode
                              value={barcode}
                              format={getSelectedBarcodeTypeName().includes("EAN") ? "EAN13" : "CODE128"}
                              width={1.5}
                              height={50}
                              fontSize={14}
                            />
                          )}
                        </div>
                      )}
                    </TabsContent>

                    {/* Scan Tab */}
                    <TabsContent value="scan" className="mt-0 flex flex-col items-center gap-3">
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
                            {scanSuccess && barcode && (
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

                      {/* Hidden input for physical handheld scanner */}
                      <input
                        ref={scannerInputRef}
                        type="text"
                        className="sr-only"
                        tabIndex={-1}
                        aria-label="Hardware scanner input"
                        value={scanBuffer}
                        onChange={(e) => setScanBuffer(e.target.value)}
                        onKeyDown={handleHardwareKeyDown}
                        onBlur={() => {
                          if (activeTab === "scan" && !scanSuccess) {
                            setTimeout(() => scannerInputRef.current?.focus(), 50);
                          }
                        }}
                      />

                      <div className="w-full flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <ScanLine className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Scanned:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-sm font-bold ${
                              barcode ? "text-green-600" : "text-muted-foreground"
                            }`}
                          >
                            {barcode || "Waiting..."}
                          </span>
                          {barcode && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setBarcodeRaw("");
                                setScanSuccess(false);
                              }}
                            >
                              <RefreshCcw className="mr-1 h-3 w-3" /> Rescan
                            </Button>
                          )}
                        </div>
                      </div>

                      {barcode && (
                        <div className="w-full flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 min-h-[80px]">
                          {getSelectedBarcodeTypeName().includes("EAN") &&
                          !validateEAN13(barcode).isValid ? (
                            <span className="text-xs text-destructive font-medium px-2 text-center">
                              {validateEAN13(barcode).error || "Invalid EAN-13 barcode format"}
                            </span>
                          ) : (
                            <Barcode
                              value={barcode}
                              format={getSelectedBarcodeTypeName().includes("EAN") ? "EAN13" : "CODE128"}
                              width={1.5}
                              height={50}
                              fontSize={14}
                            />
                          )}
                        </div>
                      )}
                    </TabsContent>

                    {/* Generate Tab */}
                    <TabsContent value="generate" className="mt-0 space-y-3">
                      <Button onClick={handleGenerate} className="w-full" size="sm">
                        <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Generate {getSelectedBarcodeTypeName()}
                      </Button>
                      <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 min-h-[80px]">
                        {barcode ? (
                          getSelectedBarcodeTypeName().includes("EAN") &&
                          !validateEAN13(barcode).isValid ? (
                            <span className="text-xs text-destructive font-medium px-2 text-center">
                              {validateEAN13(barcode).error || "Invalid EAN-13 barcode format"}
                            </span>
                          ) : (
                            <Barcode
                              value={barcode}
                              format={getSelectedBarcodeTypeName().includes("EAN") ? "EAN13" : "CODE128"}
                              width={1.5}
                              height={50}
                              fontSize={14}
                            />
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Click Generate to create a new code
                          </span>
                        )}
                      </div>
                      <Input value={barcode} readOnly className="bg-muted font-mono text-sm" />
                    </TabsContent>
                  </CardContent>
                </Card>
              </Tabs>

              <Separator />

              {/* Logistics Data Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Logistics Data
                </h4>

                {/* Weight */}
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
                        setDimensions((prev) => ({ ...prev, weight: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                    <Select
                      value={dimensions.weightUnit || undefined}
                      onValueChange={(v) =>
                        setDimensions((prev) => ({ ...prev, weightUnit: v }))
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

                {/* Dimensions (CBM) */}
                <Card className="border-dashed">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dims-edit"
                        checked={recordDimensions}
                        onCheckedChange={(c) => setRecordDimensions(!!c)}
                      />
                      <Label
                        htmlFor="dims-edit"
                        className="text-xs font-normal cursor-pointer flex items-center gap-1.5"
                      >
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                        Record Dimensions (CBM)
                      </Label>
                    </div>

                    {recordDimensions && (
                      <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {(["length", "width", "height"] as const).map((field) => (
                          <div key={field} className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground capitalize">
                              {field}
                            </Label>
                            <Input
                              placeholder="0"
                              type="number"
                              value={dimensions[field]}
                              onChange={(e) =>
                                setDimensions((prev) => ({
                                  ...prev,
                                  [field]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Unit</Label>
                          <Select
                            value={dimensions.unit || undefined}
                            onValueChange={(v) =>
                              setDimensions((prev) => ({ ...prev, unit: v }))
                            }
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
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-3 flex items-center justify-end gap-2 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading || !barcode}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
