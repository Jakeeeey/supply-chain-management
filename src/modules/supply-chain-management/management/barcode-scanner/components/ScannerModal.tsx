"use client";

import React, { useState, useEffect, useRef } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, ScanLine } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Product } from "../types";

interface ScannerModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (barcode: string) => Promise<void>;
}

export function ScannerModal({
  open,
  product,
  onClose,
  onSave,
}: ScannerModalProps) {
  // State for the barcode value
  const [barcode, setBarcode] = useState("");
  // State for loading/saving status
  const [loading, setLoading] = useState(false);
  // State for the active tab (Scan vs Manual)
  const [activeTab, setActiveTab] = useState("scan");
  // State for camera permission errors
  const [cameraError, setCameraError] = useState<string | null>(null);
  // State to track if we have a successful scan (for UI feedback)
  const [scanSuccess, setScanSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open && product) {
      setBarcode(product.barcode || "");
      setScanSuccess(false);
      setCameraError(null);
      // Default to scanner if no barcode exists, otherwise manual might be safer to edit
      setActiveTab("scan");
    } else {
      setBarcode("");
    }
  }, [open, product]);

  const handleSave = async () => {
    if (!barcode) return;
    setLoading(true);

    try {
      // We await the hook. If the hook throws the "Duplicate" error,
      // execution jumps to the catch block.
      await onSave(barcode);

      // This line is only reached if NO error was thrown
      onClose();
    } catch (e) {
      // Error is caught here.
      // We do NOT call onClose(), so the modal stays open.
      // The toast in the hook handles the UI notification.
      console.log("Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (err: any, result: any) => {
    if (err) {
      // Often the library throws errors just because it doesn't see a code yet.
      // We only care about real permission errors usually.
      if (err?.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Please allow camera access.");
      }
      return;
    }

    if (result) {
      const code = result.getText();
      // Only update if it's a new code or we haven't 'locked' a success state recently
      if (code && code !== barcode) {
        setBarcode(code);
        setScanSuccess(true);
        // Play a subtle beep or provide haptic feedback if possible (optional)

        // Auto-switch to manual tab to let user verify
        // setTimeout(() => setActiveTab("manual"), 500);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Update Barcode</DialogTitle>
          <DialogDescription>
            Assigning barcode to:{" "}
            <span className="font-semibold text-foreground">
              {product?.product_name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="scan"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">Scanner</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* SCANNER TAB */}
          <TabsContent
            value="scan"
            className="flex flex-col items-center gap-4 py-4"
          >
            {cameraError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            ) : (
              <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 bg-black w-full aspect-4/3 flex items-center justify-center shadow-inner">
                {/* Only render the scanner when the modal is open and tab is active 
                  to prevent camera resource locking issues.
                */}
                {open && activeTab === "scan" && (
                  <BarcodeScannerComponent
                    width={500}
                    height={375}
                    onUpdate={handleScan}
                    // strictly use environment (back) camera
                    videoConstraints={{
                      facingMode: "environment",
                    }}
                  />
                )}

                {/* VISUAL GUIDES OVERLAY */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* The Scanning Box */}
                  <div className="relative w-64 h-32 border-2 border-white/70 rounded-md box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    {/* Corner Markers for styling */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>

                    {/* Animated Laser Line */}
                    {!scanSuccess && (
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                    )}

                    {/* Success Indicator */}
                    {scanSuccess && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                        <CheckCircle2 className="w-12 h-12 text-green-500 animate-in zoom-in duration-300" />
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">
                    Center barcode horizontally inside the box
                  </p>
                </div>
              </div>
            )}

            {/* Live Feedback Area */}
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

          {/* MANUAL ENTRY TAB */}
          <TabsContent value="manual" className="py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="barcode-input">Barcode Number</Label>
                <Input
                  id="barcode-input"
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    setScanSuccess(false); // Reset success state on manual edit
                  }}
                  placeholder="Click to type or use handheld scanner..."
                  className="font-mono text-lg tracking-wide"
                  autoFocus
                />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tip</AlertTitle>
                <AlertDescription>
                  If you have a physical USB scanner connected, click the input
                  above and scan the item.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !barcode}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
