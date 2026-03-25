"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  PackageOpen,
  ScanBarcode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGlobalScanner } from "../hooks/useGlobalScanner";
import { detectScanType } from "../utils/barcodeUtils";
import type { CartItem } from "../types/rts.schema";

interface ProductPickerProps {
  isVisible: boolean;
  onClose: () => void;
  products: (Record<string, unknown> & {
    masterId: string;
    masterCode: string;
    masterName: string;
    variants: unknown[];
  })[];
  addedProducts: CartItem[];
  onAdd: (product: { id: string; name: string; [key: string]: unknown }, qty: number) => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onClearAll: () => void;
  onBarcodeScan?: (barcode: string) => void;
  isLoading?: boolean; // ✅ NEW PROP
}

// ✅ HELPER: Skeleton Card Component for Loading State
function ProductSkeleton() {
  return (
    <div className="bg-card rounded-xl border p-4 space-y-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-3/4">
          <div className="h-4 bg-muted rounded w-full animate-pulse" />
          <div className="h-3 bg-muted/60 rounded w-1/2 animate-pulse" />
        </div>
      </div>
      <div className="pt-2 flex justify-between items-end border-t border-muted/50 mt-2">
        <div className="space-y-1">
          <div className="h-5 bg-muted rounded w-20 animate-pulse" />
          <div className="h-3 bg-muted/50 rounded w-12 animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ProductPicker({
  isVisible,
  onClose,
  products,
  addedProducts,
  onAdd,
  onRemove,
  onUpdateQty,
  onClearAll,
  onBarcodeScan,
  isLoading = false, // ✅ Defaults to false
}: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [lastScanned, setLastScanned] = useState("");

  // Global scanner capture: routes scans to the parent handlers
  // and displays the value visually in the read-only box.
  useGlobalScanner({
    enabled: isVisible,
    onScan: (val) => {
      // Logic for picker: only show and process BARCODES here
      // RFIDs are handled by the main modal's RFID input field
      if (detectScanType(val) === "barcode") {
        setLastScanned(val);
        if (onBarcodeScan) onBarcodeScan(val);
        // Auto-clear display after 2s
        setTimeout(() => setLastScanned(""), 2000);
      }
    },
  });

  const filteredGroups = useMemo(() => {
    if (!search) return products;
    const lowerSearch = search.toLowerCase();

    return products
      .map((group) => {
        if (group.masterName.toLowerCase().includes(lowerSearch)) return group;
        const matchingVariants = group.variants.filter(
          (v: unknown) => {
            const variant = v as { name: string; code: string };
            return variant.name.toLowerCase().includes(lowerSearch) ||
                   variant.code.toLowerCase().includes(lowerSearch);
          }
        );
        if (matchingVariants.length > 0) {
          return { ...group, variants: matchingVariants };
        }
        return null;
      })
      .filter(Boolean);
  }, [products, search]);

  const totalAmount = addedProducts.reduce(
    (sum, item) => sum + (item.customPrice || item.price) * item.quantity,
    0,
  );

  if (!isVisible) return null;

  return (
    <div className="flex h-full w-full bg-muted/20 overflow-hidden">
      {/* LEFT SIDE: BROWSE PRODUCTS */}
      <div className="flex-1 flex flex-col h-full min-h-0 border-r bg-muted/20">
        {/* Search Header */}
        <div className="p-6 bg-background border-b shrink-0 z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Browse Products
            </h2>
            <div className="flex items-center gap-2">
              {/* ✅ NEW: "Fetching..." Badge */}
              {isLoading && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary animate-pulse border-primary/10"
                >
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Fetching...
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground hover:bg-muted"
              >
                {isLoading ? "-" : products.length} Product Families
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product name or code..."
                className="pl-9 bg-background focus-visible:ring-primary transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                disabled={isLoading} // Disable input while loading
              />
            </div>
            <div className="relative w-1/3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                <ScanBarcode className="w-4 h-4" />
              </div>
              <Input
                placeholder="Scan Barcode..."
                className="pl-9 bg-muted/30 cursor-default font-mono text-xs"
                value={lastScanned}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Product Grid - Scrollable Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="pb-6">
            {isLoading ? (
              // ✅ NEW: Render Skeletons when loading
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 min-h-[400px]">
                <div className="bg-card p-4 rounded-full shadow-sm border">
                  <PackageOpen className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium">No available stock found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {(filteredGroups as unknown as { masterId: string; masterName: string; masterCode?: string; variants: unknown[] }[]).map((group) => (
                  <div
                    key={group.masterId}
                    className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 border-b bg-muted/20">
                      <h3
                        className="font-bold text-sm line-clamp-1"
                        title={group.masterName}
                      >
                        {group.masterName}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Code: {group.masterCode || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {(group.variants as unknown as { id: string; stock: number; name: string; code: string; unit: string; price: number; uom_id: number; unitCount: number; supplierDiscount: number; discountType?: string }[]).map((variant) => {
                        const cartItem = addedProducts.find(
                          (i) => i.id === variant.id,
                        );
                        const currentQty = cartItem ? cartItem.quantity : 0;
                        const maxStock = Number(variant.stock || 0);
                        const isMaxed = currentQty >= maxStock;

                        return (
                          <div
                            key={variant.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-transparent bg-muted/10 hover:border-primary/20 hover:bg-primary/5 transition-all group"
                          >
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-extrabold text-foreground">
                                  ₱{" "}
                                  {variant.price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  / {variant.unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">
                                  Stock:{" "}
                                  <span className="font-bold text-foreground">
                                    {maxStock}
                                  </span>
                                </span>
                                {variant.discountType && (
                                  <span className="bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-500/20">
                                    {variant.discountType}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className={`h-8 px-4 font-semibold text-xs shadow-sm transition-all ${
                                isMaxed
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                              disabled={isMaxed}
                              onClick={() => onAdd(variant, 1)}
                            >
                              {isMaxed ? (
                                "Maxed"
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1.5" /> Add
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: SELECTED ITEMS (CART) */}
      <div className="w-[400px] bg-card flex flex-col h-full min-h-0 max-h-full overflow-hidden shadow-xl z-20 border-l">
        <div className="p-5 border-b flex justify-between items-center bg-card shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full bg-primary"></span>
            Selected Items
          </div>
          {addedProducts.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs font-semibold text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-background">
          <div className="p-4 pb-6">
            {addedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-3 p-10 mt-10">
                <div className="border-2 border-dashed rounded-full p-6 bg-muted/30">
                  <PackageOpen className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">No products selected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addedProducts.map((item) => {
                  const maxStock = Number(item.stock || 0);
                  const isMaxed = item.quantity >= maxStock;

                  return (
                    <div
                      key={item.id}
                      className="group bg-card rounded-lg border p-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-6">
                          <h4 className="font-bold text-sm text-foreground line-clamp-2">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 text-muted-foreground bg-muted/30"
                            >
                              {item.unit} ({item.unitCount})
                            </Badge>
                          </div>
                        </div>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="text-muted-foreground/30 hover:text-destructive transition-colors absolute top-3 right-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t mt-2">
                        <div className="font-bold text-sm">
                          ₱{" "}
                          {(item.customPrice || item.price).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>

                        <div className="flex items-center bg-muted/30 rounded-md border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none rounded-l-md hover:bg-background hover:text-destructive"
                            onClick={() => {
                              if (item.quantity <= 1) onRemove(item.id);
                              else onUpdateQty(item.id, item.quantity - 1);
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <div className="w-12 border-x bg-background">
                            <Input
                              type="number"
                              min={1}
                              max={maxStock}
                              className="h-7 w-full text-center border-none p-0 text-xs font-bold focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                              value={item.quantity}
                              onChange={(e) => {
                                let val = parseInt(e.target.value);
                                if (isNaN(val)) return;
                                if (val > maxStock) val = maxStock;
                                if (val < 1) val = 1;
                                onUpdateQty(item.id, val);
                              }}
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded-none rounded-r-md transition-colors ${isMaxed ? "opacity-50 cursor-not-allowed" : "hover:bg-background hover:text-primary"}`}
                            disabled={isMaxed}
                            onClick={() =>
                              onUpdateQty(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t pb-5 bg-muted/20 shrink-0">
          <div className="flex justify-between items-center mb-4 text-sm">
            <span className="font-bold text-muted-foreground uppercase text-xs">
              Total Price
            </span>
            <span className="font-extrabold text-xl">
              ₱{" "}
              {totalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <Button
            className="w-full font-bold h-11 transition-all active:scale-[0.98]"
            onClick={onClose}
            disabled={addedProducts.length === 0}
          >
            Confirm Selected Products
          </Button>
        </div>
      </div>
    </div>
  );
}
