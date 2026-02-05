"use client";

import * as React from "react";
import { Check, Plus, Search, ShoppingCart, X, Minus } from "lucide-react";
import type { CartItem, Product } from "../types";
import { cn, buildMoneyFormatter } from "../utils/calculations";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ProductPickerDialog(props: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    branchLabel: string;
    supplierName: string;
    categories: string[];
    selectedCategory: string;
    onCategoryChange: (v: string) => void;
    searchQuery: string;
    onSearchChange: (v: string) => void;
    products: Product[];
    tempCart: CartItem[];
    onToggleProduct: (p: Product) => void;

    // keep for compatibility with parent (no-op in UI)
    onUpdateTempUom: (productId: string, uom: string) => void;

    onRemoveFromTemp: (item: CartItem) => void;
    onUpdateTempQty: (productId: string, qty: number) => void;
    onConfirm: () => void;
}) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);
    const selectedCount = props.tempCart.length;

    const isSelected = React.useCallback(
        (id: string) => props.tempCart.some((x) => x.id === id),
        [props.tempCart]
    );

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent
                style={{
                    maxWidth: "96vw",
                    width: "74vw",
                    height: "94vh",
                    maxHeight: "82vh",
                }}
                className="p-0 gap-0 overflow-hidden border-none shadow-2xl flex flex-col"
            >
                {/* TOP HEADER SECTION */}
                <div className="bg-background border-b border-border shrink-0">
                    <DialogHeader className="px-6 py-4 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Add Products to {props.branchLabel}
                                </DialogTitle>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.1em] mt-0.5">
                                    Supplier: <span className="text-primary">{props.supplierName}</span>
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* FILTERS BAR */}
                    <div className="px-6 py-3 bg-slate-50 flex items-end gap-4">
                        <div className="w-64 space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                                Category
                            </label>
                            <select
                                value={props.selectedCategory}
                                onChange={(e) => props.onCategoryChange(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                {props.categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                                Search Products
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by SKU or Product Name..."
                                    value={props.searchQuery}
                                    onChange={(e) => props.onSearchChange(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-xs shadow-sm bg-white placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN SPLIT SECTION */}
                <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50/30">
                    {/* LEFT SIDE: PRODUCT BROWSER */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {props.products.map((product) => {
                                    const selected = isSelected(product.id);

                                    return (
                                        <div
                                            key={product.id}
                                            className={cn(
                                                "flex flex-col bg-white rounded-xl border transition-all duration-200 shadow-sm overflow-hidden",
                                                selected
                                                    ? "border-primary ring-1 ring-primary/10"
                                                    : "border-border hover:border-primary/30 hover:shadow-md"
                                            )}
                                        >
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <div className="min-w-0">
                                                        <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug h-8">
                                                            {product.name}
                                                        </h3>
                                                        <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">
                                                            SKU: {product.sku}
                                                        </p>
                                                    </div>
                                                    {selected && (
                                                        <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                                            <Check className="w-3 h-3 text-primary-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-2 py-2 border-t border-slate-50 space-y-1">
                                                    <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-primary">
                              {money.format(product.price)}
                            </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                              / BOX
                            </span>
                                                    </div>

                                                    {Number((product as any)?.unitsPerBox ?? 1) > 1 ? (
                                                        <div className="text-[10px] text-slate-400 font-bold">
                                                            {Number((product as any)?.unitsPerBox)} pcs / BOX
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {/* FOOTER: Add/Remove only (NO UOM DROPDOWN) */}
                                            <div className="p-3 bg-slate-50/50 border-t border-slate-100 mt-auto space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => props.onToggleProduct(product)}
                                                    className={cn(
                                                        "w-full h-9 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all",
                                                        selected
                                                            ? "bg-white border border-destructive/20 text-destructive hover:bg-destructive hover:text-white shadow-sm"
                                                            : "bg-primary text-primary-foreground hover:brightness-110 shadow-sm"
                                                    )}
                                                >
                                                    {selected ? "Remove" : "Add to Order"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE: CART */}
                    <div className="w-[380px] flex flex-col bg-white border-l border-border shrink-0 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                        <div className="p-5 border-b border-border shrink-0">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-primary" />
                                    Cart Summary
                                </h4>
                                <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full">
                  {selectedCount}
                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                            {selectedCount === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                                        <ShoppingCart className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                                        Empty Cart
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">
                                        Select products from the grid to add them to your order.
                                    </p>
                                </div>
                            ) : (
                                props.tempCart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                                    >
                                        <button
                                            onClick={() => props.onRemoveFromTemp(item)}
                                            className="absolute top-2 right-2 p-1 text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="p-3 pt-4">
                                            <div className="pr-6">
                                                <p className="text-[11px] font-black text-slate-800 leading-tight line-clamp-1 uppercase tracking-tight">
                                                    {item.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono font-bold">
                            BOX
                          </span>
                                                    <span className="text-[10px] font-bold text-primary/80">
                            {money.format(item.price)}
                          </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                                                <div className="flex items-center border border-slate-100 rounded-lg overflow-hidden bg-slate-50 shadow-inner">
                                                    <button
                                                        onClick={() =>
                                                            props.onUpdateTempQty(item.id, item.orderQty - 1)
                                                        }
                                                        disabled={item.orderQty <= 1}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-white disabled:opacity-30 transition-colors"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="w-8 text-center text-xs font-black text-slate-700">
                                                        {item.orderQty}
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            props.onUpdateTempQty(item.id, item.orderQty + 1)
                                                        }
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-white transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-[8px] uppercase font-black text-slate-400 leading-none mb-0.5">
                                                        Subtotal
                                                    </p>
                                                    <p className="text-xs font-black text-slate-900 tracking-tighter">
                                                        {money.format(item.price * item.orderQty)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* STICKY FOOTER */}
                        <div className="p-5 border-t border-border bg-white shrink-0 space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Grand Total
                </span>
                                <span className="text-xl font-black text-primary tracking-tight">
                  {money.format(
                      props.tempCart.reduce(
                          (sum, item) => sum + item.price * item.orderQty,
                          0
                      )
                  )}
                </span>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={props.onConfirm}
                                    disabled={selectedCount === 0}
                                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:shadow-none"
                                >
                                    Confirm Order
                                </button>
                                <button
                                    onClick={() => props.onOpenChange(false)}
                                    className="w-full h-9 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                                >
                                    Back to Branch
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
