// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/components/BranchAllocations.tsx
"use client";

import * as React from "react";
import { Building2, Minus, Plus, Store, Trash2, X } from "lucide-react";
import type { BranchAllocation } from "../types";
import { cn, buildMoneyFormatter } from "../utils/format";

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
        <div className="space-y-4 pt-4 w-full min-w-0">
            {props.branches.map((branch) => (
                <div key={branch.branchId} className="bg-muted/20 border border-border rounded-xl overflow-hidden w-full min-w-0">
                    <div className="px-4 sm:px-5 py-3 border-b border-border bg-background flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-semibold text-foreground truncate">{branch.branchName}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                ({branch.items.length} {branch.items.length === 1 ? "item" : "items"})
              </span>
                        </div>

                        <button
                            onClick={() => props.onRemoveBranch(branch.branchId)}
                            className="text-muted-foreground hover:text-destructive transition shrink-0"
                            title="Remove branch"
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
                                    "w-full py-4 border-2 border-dashed rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition",
                                    props.canAddProducts
                                        ? "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                                        : "border-border text-muted-foreground/60 cursor-not-allowed opacity-60"
                                )}
                                title={!props.canAddProducts ? "Select a supplier first" : "Add products"}
                            >
                                <Plus className="w-4 h-4" />
                                Select Products with Category Filter
                            </button>
                        ) : (
                            <div className="space-y-3 w-full min-w-0">
                                <div className="w-full overflow-x-auto">
                                    <table className="min-w-[860px] w-full text-sm ">
                                        <thead className="text-xs text-muted-foreground uppercase font-semibold border-b border-border">
                                        <tr>
                                            <th className="pb-3 text-left">Item</th>
                                            <th className="pb-3 text-left">ID</th>
                                            <th className="pb-3 text-right">Unit Price</th>
                                            <th className="pb-3 text-center">UOM</th>
                                            <th className="pb-3 text-center">Qty</th>
                                            <th className="pb-3 text-right">Line Total</th>
                                            <th className="pb-3 text-right">Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody className="text-foreground/90 divide-y divide-border">
                                        {branch.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-background/60 transition">
                                                <td className="py-3 font-medium text-foreground">{item.name}</td>
                                                <td className="py-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                                                <td className="py-3 text-right">{money.format(item.price)}</td>
                                                <td className="py-3 text-center">
                            <span className="px-2 py-1 bg-muted text-foreground text-xs font-medium rounded">
                              {item.selectedUom || item.uom}
                            </span>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => props.onUpdateQty(branch.branchId, item.id, item.orderQty - 1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-muted hover:bg-muted/80 text-foreground transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            disabled={item.orderQty <= 1}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={item.orderQty}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 1;
                                                                props.onUpdateQty(branch.branchId, item.id, val);
                                                            }}
                                                            className="w-16 h-9 px-2 text-center border border-input rounded outline-none focus:ring-2 focus:ring-ring bg-background"
                                                            min={1}
                                                        />
                                                        <button
                                                            onClick={() => props.onUpdateQty(branch.branchId, item.id, item.orderQty + 1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-muted hover:bg-muted/80 text-foreground transition"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right font-semibold text-primary">
                                                    {money.format(item.price * item.orderQty)}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => props.onRemoveItem(branch.branchId, item.id)}
                                                        className="text-muted-foreground hover:text-destructive transition"
                                                        title="Remove item"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                <button
                                    onClick={() => props.onOpenPicker(branch.branchId)}
                                    disabled={!props.canAddProducts}
                                    className={cn(
                                        "w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition border",
                                        props.canAddProducts
                                            ? "border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                                            : "border-border text-muted-foreground/60 cursor-not-allowed opacity-60"
                                    )}
                                >
                                    <Plus className="w-3 h-3" />
                                    Add More Products
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
