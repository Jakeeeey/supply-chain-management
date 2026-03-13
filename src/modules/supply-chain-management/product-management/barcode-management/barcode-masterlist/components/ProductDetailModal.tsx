"use client";

import React, { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Barcode as BarcodeIcon,
  Ruler,
  Scale,
  Calendar,
  Truck,
  Tag,
  Layers,
  PackageOpen,
  Loader2,
} from "lucide-react";
import { Product, Unit, Category, BundleItem, getSupplierName } from "../types";
import { getBundleItems } from "../providers/fetchProviders";

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
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const isBundle = product?.record_type === "bundle";

  // Fetch bundle items when a bundle is opened
  useEffect(() => {
    if (open && isBundle && product) {
      setLoadingItems(true);
      getBundleItems(product.product_id)
        .then((items) => setBundleItems(items))
        .catch((err) => console.error("Failed to load bundle items", err))
        .finally(() => setLoadingItems(false));
    } else {
      setBundleItems([]);
    }
  }, [open, isBundle, product]);

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
              {isBundle ? (
                <PackageOpen className="h-5 w-5 text-amber-500" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
              {isBundle ? "Bundle Details" : "Product Details"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[75vh]">
          <div className="px-6 pb-6 space-y-5">
            {/* Product/Bundle Identity */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground leading-snug">
                {product.description || product.product_name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {isBundle ? "BDL" : "SKU"}: {product.product_code}
                </Badge>
                <Badge
                  className={
                    isBundle
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 text-xs"
                      : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs"
                  }
                >
                  {isBundle ? "Bundle" : "Regular Inventory"}
                </Badge>
                {!isBundle && (
                  <Badge
                    variant="secondary"
                    className="text-xs"
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    {categoryName}
                  </Badge>
                )}
                {isBundle && categoryName !== "Uncategorized" && (
                  <Badge
                    variant="secondary"
                    className="text-xs"
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    {categoryName}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Bundle Items Section — Only for bundles */}
            {isBundle && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <PackageOpen className="h-4 w-4" /> Bundle Items
                </h4>
                <Card>
                  <CardContent className="p-0">
                    {loadingItems ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          Loading items...
                        </span>
                      </div>
                    ) : bundleItems.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        No items in this bundle.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs">SKU</TableHead>
                            <TableHead className="text-xs">Product Name</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bundleItems.map((item) => (
                            <TableRow key={item.id} className="border-0">
                              <TableCell className="font-mono text-sm text-primary py-2">
                                {item.product_code}
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                {item.product_name}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-right py-2">
                                {item.quantity}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {isBundle && <Separator />}

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

            {/* Metadata — Only for products, bundles don't have supplier/date linked */}
            {!isBundle && (
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
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
