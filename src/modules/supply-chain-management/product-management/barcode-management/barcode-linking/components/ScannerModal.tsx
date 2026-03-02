"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Product, RefData, UpdateBarcodeDTO } from "../types";
import { generateEAN13, generateCode128 } from "../utils/barcodeUtils";
import { validateAndBuildPayload } from "../utils/validationUtils";
import { ProfileStep } from "./ProfileStep";
import { AssignmentStep } from "./AssignmentStep";

interface ScannerModalProps {
  open: boolean;
  product: Product | null;
  allProducts: Product[];
  allBarcodes: { product_id: string; barcode: string; product_name: string }[];
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
  allBarcodes,
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
  const [selectedBarcodeTypeId, setSelectedBarcodeTypeId] = useState<string>("");
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
        if (defaultType?.id) setSelectedBarcodeTypeId(String(defaultType.id));
      }
      if (weightUnits.length > 0 && !dimensions.weightUnit) {
        const defaultUnit =
          weightUnits.find((u) => u.code === "KG") || weightUnits[0];
        if (defaultUnit?.id)
          setDimensions((prev) => ({ ...prev, weightUnit: String(defaultUnit.id) }));
      }
      if (cbmUnits.length > 0 && !dimensions.unit) {
        const defaultUnit =
          cbmUnits.find((u) => u.code === "CM") || cbmUnits[0];
        if (defaultUnit?.id)
          setDimensions((prev) => ({ ...prev, unit: String(defaultUnit.id) }));
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

  // --- HANDLERS ---
  const handleMethodSelect = (method: string) => {
    setActiveTab(method);
    setStep("assignment");
  };

  const handleGenerate = () => {
    const typeName =
      barcodeTypes.find((t) => String(t.id) === selectedBarcodeTypeId)?.name || "EAN-13";
    const newCode = typeName.includes("EAN-13") ? generateEAN13() : generateCode128();
    setBarcode(newCode);
    setScanSuccess(true);
  };

  const handleSave = async () => {
    const payload = validateAndBuildPayload({
      barcode,
      selectedBarcodeTypeId,
      barcodeTypes,
      dimensions,
      recordDimensions,
      product,
      allBarcodes,
      allProducts,
    });

    if (!payload) return;

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
          {step === "profile" ? (
            <ProfileStep product={product} onMethodSelect={handleMethodSelect} />
          ) : (
            <AssignmentStep
              product={product}
              barcode={barcode}
              setBarcode={setBarcode}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              scanSuccess={scanSuccess}
              setScanSuccess={setScanSuccess}
              cameraError={cameraError}
              setCameraError={setCameraError}
              selectedBarcodeTypeId={selectedBarcodeTypeId}
              setSelectedBarcodeTypeId={setSelectedBarcodeTypeId}
              recordDimensions={recordDimensions}
              setRecordDimensions={setRecordDimensions}
              dimensions={dimensions}
              setDimensions={setDimensions}
              barcodeTypes={barcodeTypes}
              weightUnits={weightUnits}
              cbmUnits={cbmUnits}
              onBack={() => setStep("profile")}
              onGenerate={handleGenerate}
            />
          )}
        </div>

        {step === "assignment" && (
          <div className="border-t px-6 py-3 flex items-center justify-end gap-2 bg-muted/30 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setStep("profile")}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading || !barcode}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
