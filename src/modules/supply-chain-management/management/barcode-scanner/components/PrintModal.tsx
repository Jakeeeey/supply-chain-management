"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrCode, FileText, Printer, X } from "lucide-react";
import { Product } from "../types";
import Barcode from "react-barcode";

// --- MODAL 1: SELECT FORMAT ---

interface PrintFormatModalProps {
  open: boolean;
  onClose: () => void;
  onSelectFormat: (format: "simple" | "detailed") => void;
  count: number;
}

export function PrintFormatModal({
  open,
  onClose,
  onSelectFormat,
  count,
}: PrintFormatModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Print Format</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card
            className="flex items-center gap-4 p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
            onClick={() => onSelectFormat("simple")}
          >
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold">Barcode Only</h4>
              <p className="text-sm text-muted-foreground">
                Simple format: Barcode, Product Name, SKU
              </p>
            </div>
          </Card>

          <Card
            className="flex items-center gap-4 p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
            onClick={() => onSelectFormat("detailed")}
          >
            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold">Barcode with Details</h4>
              <p className="text-sm text-muted-foreground">
                Detailed format: Includes CBM, Weight, UOM, etc.
              </p>
            </div>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {count} items selected for printing
        </p>
      </DialogContent>
    </Dialog>
  );
}

// --- MODAL 2: PREVIEW & PRINT ---

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  format: "simple" | "detailed";
}

export function PrintPreviewModal({
  open,
  onClose,
  products,
  format,
}: PrintPreviewModalProps) {
  const handlePrint = () => {
    window.print(); // Simple browser print trigger
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Preview ({format === "simple" ? "Simple" : "Detailed"})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-slate-50 p-4 overflow-hidden flex flex-col items-center">
          <div className="bg-white shadow-lg border p-8 w-full max-w-[700px] min-h-[500px]">
            <div className="text-center mb-8 border-b pb-4">
              <h2 className="text-xl font-bold uppercase tracking-widest">
                {format === "simple"
                  ? "Barcode Label Export"
                  : "Product Detail Export"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Generated on {new Date().toLocaleDateString()}
              </p>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {products.map((p) => (
                  <div
                    key={p.product_id}
                    className="border rounded-lg p-4 flex justify-between items-center bg-white"
                  >
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">
                        {p.description || p.product_name}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground">
                        SKU: {p.product_code}
                      </p>

                      {format === "detailed" && (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-xs text-slate-600">
                          <span>Type: Regular</span>
                          <span>
                            UOM:{" "}
                            {typeof p.unit_of_measurement === "object"
                              ? p.unit_of_measurement?.unit_shortcut
                              : "PCS"}
                          </span>
                          <span>Weight: 0 kg (Placeholder)</span>
                          <span>CBM: 0.000 m³ (Placeholder)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="h-16 overflow-hidden">
                        {/* Only render barcode if value exists, otherwise placeholder */}
                        {p.barcode ? (
                          <Barcode
                            value={p.barcode}
                            width={1}
                            height={40}
                            fontSize={12}
                          />
                        ) : (
                          <span className="text-xs text-red-500">
                            Missing Barcode
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mr-auto self-center">
            {products.length} items ready
          </p>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="mr-2 h-4 w-4" /> Print Labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
