"use client";

import React, { useState, useEffect } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");

  useEffect(() => {
    if (open && product) {
      setBarcode(product.barcode || "");
    } else {
      setBarcode("");
    }
  }, [open, product]);

  const handleSave = async () => {
    if (!barcode) return;
    setLoading(true);
    try {
      await onSave(barcode);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Update Barcode: {product?.product_name}</DialogTitle>
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

          <TabsContent
            value="scan"
            className="flex flex-col items-center gap-4 py-4"
          >
            <div className="overflow-hidden rounded-md border bg-black w-full aspect-video relative flex items-center justify-center">
              {open && activeTab === "scan" && (
                <BarcodeScannerComponent
                  width={460}
                  height={300}
                  onUpdate={(err, result) => {
                    if (result) {
                      setBarcode(result.getText());
                      // Optional: Auto-switch to manual view to confirm
                      // setActiveTab("manual");
                    }
                  }}
                />
              )}
              <div className="absolute inset-0 border-2 border-white/30 pointer-events-none flex items-center justify-center">
                <p className="text-white/50 text-xs mt-32">
                  Align barcode here
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Detected:{" "}
              <span className="font-mono font-bold text-primary">
                {barcode || "Scanning..."}
              </span>
            </p>
          </TabsContent>

          <TabsContent value="manual" className="py-4">
            <div className="grid gap-2">
              <Label htmlFor="barcode-input">Barcode Number</Label>
              <Input
                id="barcode-input"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Enter barcode manually"
              />
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
