"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  X,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CartItem } from "../types/rts.schema";

interface ProductPickerProps {
  isVisible: boolean;
  onClose: () => void;
  products: any[];
  addedProducts: CartItem[];
  onAdd: (product: any, qty: number) => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onClearAll: () => void;
  isLoading?: boolean; // ✅ NEW PROP
}

// ✅ HELPER: Skeleton Card Component for Loading State
function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-3/4">
          <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
          <div className="h-3 bg-slate-50 rounded w-1/2 animate-pulse" />
        </div>
      </div>
      <div className="pt-2 flex justify-between items-end border-t border-slate-50 mt-2">
        <div className="space-y-1">
          <div className="h-5 bg-slate-100 rounded w-20 animate-pulse" />
          <div className="h-3 bg-slate-50 rounded w-12 animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
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
  isLoading = false, // ✅ Defaults to false
}: ProductPickerProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    if (!search) return products;
    const lowerSearch = search.toLowerCase();

    return products
      .map((group) => {
        if (group.masterName.toLowerCase().includes(lowerSearch)) return group;
        const matchingVariants = group.variants.filter(
          (v: any) =>
            v.name.toLowerCase().includes(lowerSearch) ||
            v.code.toLowerCase().includes(lowerSearch),
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
    <div className="flex h-full w-full bg-slate-50/50 overflow-hidden">
      {/* LEFT SIDE: BROWSE PRODUCTS */}
      <div className="flex-1 flex flex-col h-full min-h-0 border-r border-slate-200 bg-slate-50/50">
        {/* Search Header */}
        <div className="p-6 bg-white border-b border-slate-200 shrink-0 z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Search className="w-5 h-5 text-blue-600" />
              Browse Products
            </h2>
            <div className="flex items-center gap-2">
              {/* ✅ NEW: "Fetching..." Badge */}
              {isLoading && (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-600 animate-pulse border-blue-100"
                >
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Fetching...
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200"
              >
                {isLoading ? "-" : products.length} Product Families
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search product name or code..."
                className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                disabled={isLoading} // Disable input while loading
              />
            </div>
            <div className="relative w-1/3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400">
                <ScanBarcode className="w-4 h-4" />
              </div>
              <Input
                placeholder="Scan barcode..."
                className="pl-9 bg-white border-slate-200"
                disabled
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
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[400px]">
                <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100">
                  <PackageOpen className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium">No available stock found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredGroups.map((group: any) => (
                  <div
                    key={group.masterId}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                      <h3
                        className="font-bold text-slate-800 text-sm line-clamp-1"
                        title={group.masterName}
                      >
                        {group.masterName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Code: {group.masterCode || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {group.variants.map((variant: any) => {
                        const cartItem = addedProducts.find(
                          (i) => i.id === variant.id,
                        );
                        const currentQty = cartItem ? cartItem.quantity : 0;
                        const maxStock = Number(variant.stock || 0);
                        const isMaxed = currentQty >= maxStock;

                        return (
                          <div
                            key={variant.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all group"
                          >
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-extrabold text-slate-900">
                                  ₱ {variant.price.toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  / {variant.unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500">
                                  Stock:{" "}
                                  <span className="font-bold text-slate-700">
                                    {maxStock}
                                  </span>
                                </span>
                                {variant.discountType && (
                                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                                    {variant.discountType}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className={`h-8 px-4 font-semibold text-xs shadow-sm transition-all ${
                                isMaxed
                                  ? "bg-slate-100 text-slate-400 hover:bg-slate-100 cursor-not-allowed"
                                  : "bg-slate-900 text-white hover:bg-blue-600"
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
      <div className="w-[400px] bg-white flex flex-col h-full min-h-0 shadow-xl z-20 border-l border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            Selected Items
          </div>
          {addedProducts.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-4 pb-6">
            {addedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 p-10 mt-10">
                <div className="border-2 border-dashed border-slate-200 rounded-full p-6 bg-slate-50">
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
                      className="group bg-white rounded-lg border border-slate-100 p-3 shadow-sm hover:shadow-md hover:border-blue-100 transition-all relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-6">
                          <h4 className="font-bold text-sm text-slate-800 line-clamp-2">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-500 bg-slate-50"
                            >
                              {item.unit} ({item.unitCount})
                            </Badge>
                          </div>
                        </div>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors absolute top-3 right-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                        <div className="font-bold text-slate-700 text-sm">
                          ₱ {(item.customPrice || item.price).toLocaleString()}
                        </div>

                        <div className="flex items-center bg-slate-50 rounded-md border border-slate-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none rounded-l-md hover:bg-white hover:text-red-500"
                            onClick={() => {
                              if (item.quantity <= 1) onRemove(item.id);
                              else onUpdateQty(item.id, item.quantity - 1);
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <div className="w-12 border-x border-slate-200 bg-white">
                            <Input
                              type="number"
                              min={1}
                              max={maxStock}
                              className="h-7 w-full text-center border-none p-0 text-xs font-bold focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                            className={`h-7 w-7 rounded-none rounded-r-md transition-colors ${isMaxed ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:text-blue-600"}`}
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
        </ScrollArea>

        <div className="p-5 border-t pb-15 border-slate-100 bg-slate-50 shrink-0">
          <div className="flex justify-between items-center mb-4 text-sm">
            <span className="font-bold text-slate-500 uppercase text-xs">
              Total Price
            </span>
            <span className="font-extrabold text-xl text-slate-900">
              ₱{" "}
              {totalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <Button
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 transition-all active:scale-[0.98]"
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
