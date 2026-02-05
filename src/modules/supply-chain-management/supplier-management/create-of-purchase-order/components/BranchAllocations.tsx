// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/components/BranchAllocations.tsx
"use client";

import * as React from "react";
import { Building2, Minus, Plus, Store, Trash2, X } from "lucide-react";
import type { BranchAllocation } from "../types";
import { cn, buildMoneyFormatter } from "../utils/calculations";

export function BranchAllocations(props: {
    branches: BranchAllocation[];
    canAddProducts: boolean;
    onRemoveBranch: (id: string) => void;
    onOpenPicker: (branchId: string) => void;

    onUpdateQty: (branchId: string, productId: string, qty: number) => void;
    onRemoveItem: (branchId: string, productId: string) => void;
}) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    if (props.branches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-xl text-muted-foreground bg-muted/30">
                <Store className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground/90">Add a branch to get started</p>
                <p className="text-xs text-muted-foreground mt-1">Products will be organized by delivery branch</p>
            </div>
        );
    }

    return (
        /* 1. FIXED HEIGHT WRAPPER: Dito mangyayari ang scroll.
           Pinalitan ko ang 'max-h' ng 'h-[600px]' para siguradong may scrollbar na lalabas. */
        <div className="space-y-4 pt-4 w-full min-w-0 h-[650px] overflow-y-auto pr-2 custom-scrollbar">
            {props.branches.map((branch) => (
                <div
                    key={branch.branchId}
                    className="bg-muted/20 border border-border rounded-xl overflow-hidden w-full min-w-0 mb-4 shadow-sm"
                >
                    {/* 2. STICKY HEADER: Mananatili sa taas ng branch card habang nag-scroll */}
                    <div className="sticky top-0 z-10 px-4 sm:px-5 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-semibold text-foreground truncate">{branch.branchName}</span>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0 font-medium">
                            {branch.items.length} {branch.items.length === 1 ? "ITEM" : "ITEMS"}
                        </span>
                        </div>

                        <button
                            onClick={() => props.onRemoveBranch(branch.branchId)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition shrink-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4 sm:p-5">
                        {branch.items.length === 0 ? (
                            <button
                                onClick={() => props.onOpenPicker(branch.branchId)}
                                disabled={!props.canAddProducts}
                                className={cn(
                                    "w-full py-8 border-2 border-dashed rounded-lg text-xs font-semibold uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition",
                                    props.canAddProducts
                                        ? "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                                        : "border-border text-muted-foreground/60 cursor-not-allowed opacity-60"
                                )}
                            >
                                <Plus className="w-5 h-5" />
                                Select Products for this Branch
                            </button>
                        ) : (
                            <div className="space-y-3 w-full min-w-0">
                                <div className="w-full overflow-x-auto rounded-lg border border-border bg-background">
                                    <table className="min-w-[860px] w-full text-sm border-separate border-spacing-0">
                                        <thead className="bg-muted/50">
                                        <tr>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-muted-foreground border-b border-border">Item</th>
                                            <th className="p-3 text-left text-xs font-bold uppercase text-muted-foreground border-b border-border">ID</th>
                                            <th className="p-3 text-right text-xs font-bold uppercase text-muted-foreground border-b border-border">Price</th>
                                            <th className="p-3 text-center text-xs font-bold uppercase text-muted-foreground border-b border-border">UOM</th>
                                            <th className="p-3 text-center text-xs font-bold uppercase text-muted-foreground border-b border-border">Qty</th>
                                            <th className="p-3 text-right text-xs font-bold uppercase text-muted-foreground border-b border-border">Total</th>
                                            <th className="p-3 text-right text-xs font-bold uppercase text-muted-foreground border-b border-border">Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                        {/* 3. PAGINATION/LIMIT: Ipinapakita lang ang unang 10 items */}
                                        {branch.items.slice(0, 10).map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="p-3 font-medium text-foreground">{item.name}</td>
                                                <td className="p-3 font-mono text-[10px] text-muted-foreground uppercase">{item.id}</td>
                                                <td className="p-3 text-right">{money.format(item.price)}</td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded uppercase">
                                                        {item.selectedUom || item.uom}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => props.onUpdateQty(branch.branchId, item.id, item.orderQty - 1)}
                                                            className="w-7 h-7 flex items-center justify-center rounded border border-input bg-background hover:bg-muted disabled:opacity-30"
                                                            disabled={item.orderQty <= 1}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-8 text-center font-bold text-sm">{item.orderQty}</span>
                                                        <button
                                                            onClick={() => props.onUpdateQty(branch.branchId, item.id, item.orderQty + 1)}
                                                            className="w-7 h-7 flex items-center justify-center rounded border border-input bg-background hover:bg-muted"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right font-bold text-primary">
                                                    {money.format(item.price * item.orderQty)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => props.onRemoveItem(branch.branchId, item.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 4. FOOTER ACTIONS */}
                                <div className="flex justify-between items-center pt-2">
                                    <p className="text-[10px] text-muted-foreground italic">
                                        {branch.items.length > 10 ? `Showing first 10 of ${branch.items.length} items` : `Showing all items`}
                                    </p>
                                    <button
                                        onClick={() => props.onOpenPicker(branch.branchId)}
                                        disabled={!props.canAddProducts}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition border border-input bg-background hover:bg-muted",
                                            !props.canAddProducts && "opacity-50"
                                        )}
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add More
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )};
