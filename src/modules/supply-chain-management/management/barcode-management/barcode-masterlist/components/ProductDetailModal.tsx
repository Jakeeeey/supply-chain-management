"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  Barcode as BarcodeIcon,
  Ruler,
  Scale,
  Calendar,
  Truck,
  Tag,
} from "lucide-react";
import { Product, Unit, getSupplierName } from "../types";

interface ProductDetailModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

export function ProductDetailModal({
  open,
  product,
  onClose,
}: ProductDetailModalProps) {
  if (!product) return null;

  const unitName =
    typeof product.unit_of_measurement === "object" &&
      product.unit_of_measurement
      ? (product.unit_of_measurement as Unit).unit_name
      : "Pieces";

  const dateLinked = product.created_at
    ? new Date(product.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "N/A";

  const supplierName = getSupplierName(product);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Product Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Header Info */}
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {product.description || product.product_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="text-xs font-mono text-muted-foreground"
                >
                  SKU: {product.product_code}
                </Badge>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                  Regular Inventory
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Barcode Section */}
            <div className="grid gap-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarcodeIcon className="h-4 w-4" /> Barcode Information
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg border">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Barcode Value
                  </span>
                  <p className="font-mono text-lg font-bold text-slate-900 mt-1">
                    {product.barcode || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Barcode Type
                  </span>
                  <p className="text-sm font-medium mt-1">
                    {product.barcode_type?.name || "Standard"}
                  </p>
                </div>
              </div>
            </div>

            {/* Logistics Section */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Weight
                </h4>
                <div className="p-3 border rounded-md bg-white">
                  {product.weight ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">
                        {product.weight}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {product.weight_unit?.code || "kg"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      Not Recorded
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Ruler className="h-4 w-4" /> Dimensions (CBM)
                </h4>
                <div className="p-3 border rounded-md bg-white">
                  {product.cbm_length ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {product.cbm_length} x {product.cbm_width} x{" "}
                        {product.cbm_height}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Unit: {product.cbm_unit?.name || "cm"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      Not Recorded
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" /> Metadata
              </h4>
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Supplier
                  </span>
                  <span
                    className="font-medium truncate pr-4"
                    title={supplierName}
                  >
                    {supplierName}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" /> UOM
                  </span>
                  <span className="font-medium">{unitName}</span>
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date Linked
                  </span>
                  <span className="font-medium">{dateLinked}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
