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
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Barcode as BarcodeIcon,
  Ruler,
  Scale,
  Calendar,
  Truck,
  Tag,
  Layers,
} from "lucide-react";
import { Product, Unit, Category, getSupplierName } from "../types";

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

  const categoryName =
    typeof product.product_category === "object" && product.product_category
      ? (product.product_category as Category).category_name
      : typeof product.product_category === "string"
        ? product.product_category
        : "Uncategorized";

  const dateLinked = product.barcode_date
    ? new Date(product.barcode_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "N/A";

  const supplierName = getSupplierName(product);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Product Details
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[75vh]">
          <div className="px-6 pb-6 space-y-5">
            {/* Product Identity */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground leading-snug">
                {product.description || product.product_name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="font-mono text-xs text-muted-foreground"
                >
                  SKU: {product.product_code}
                </Badge>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                  Regular Inventory
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-xs"
                >
                  <Layers className="h-3 w-3 mr-1" />
                  {categoryName}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Barcode Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarcodeIcon className="h-4 w-4" /> Barcode Information
              </h4>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Barcode Value
                      </span>
                      <p className="font-mono text-base font-bold text-foreground">
                        {product.barcode || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Barcode Type
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {product.barcode_type_id?.name || "Standard"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Logistics */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Scale className="h-4 w-4" /> Logistics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Weight
                    </span>
                    {product.weight ? (
                      <p className="text-base font-bold text-foreground">
                        {Number(product.weight).toFixed(2)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          {product.weight_unit_id?.code || product.weight_unit_id?.name || "–"}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Not Recorded
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Ruler className="h-3 w-3" /> Dimensions (CBM)
                    </span>
                    {product.cbm_length ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {Number(product.cbm_length).toFixed(2)} × {Number(product.cbm_width).toFixed(2)} ×{" "}
                          {Number(product.cbm_height).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Unit: {product.cbm_unit_id?.code || product.cbm_unit_id?.name || "–"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Not Recorded
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" /> Metadata
              </h4>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Supplier
                      </span>
                      <p
                        className="text-sm font-medium text-foreground truncate"
                        title={supplierName}
                      >
                        {supplierName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Package className="h-3 w-3" /> UOM
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {unitName}
                      </p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Date Linked
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {dateLinked}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
