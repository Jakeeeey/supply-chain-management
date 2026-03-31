/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Building2, Minus, Plus, Store, Trash2 } from "lucide-react";
import type { BranchAllocation, DiscountType } from "../types";
import { cn, buildMoneyFormatter } from "../utils/calculations";

export function BranchAllocations(props: {
    branches: BranchAllocation[];
    canAddProducts: boolean;
    onRemoveBranch: (id: string) => void;
    onOpenPicker: (branchId: string) => void;

    onUpdateQty: (branchId: string, productId: string, qty: number) => void;
    onRemoveItem: (branchId: string, productId: string) => void;

    // DISPLAY ONLY
    discountTypes: DiscountType[];
    disabled?: boolean;
}) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    const [pages, setPages] = React.useState<Record<string, number>>({});
    const itemsPerPage = 10;

    const discountTypeById = React.useMemo(() => {
        const m = new Map<string, DiscountType>();
        for (const d of props.discountTypes) m.set(String(d.id), d);
        return m;
    }, [props.discountTypes]);

    if (props.branches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-xl text-muted-foreground bg-muted/30">
                <Store className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground/90">
                    Add a branch to get started
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Products will be organized by delivery branch
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-4 w-full min-w-0 h-auto max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
            {props.branches.map((branch) => {
                const currentPage = pages[branch.branchId] || 1;
                const totalItems = branch.items.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedItems = branch.items.slice(startIndex, startIndex + itemsPerPage);

                return (
                    <div
                        key={branch.branchId}
                        className="bg-muted/20 border border-border rounded-xl overflow-hidden w-full min-w-0 mb-4 shadow-sm"
                    >
                        <div className="sticky top-0 z-10 px-4 sm:px-5 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex justify-between items-center gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Building2 className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-sm font-black text-foreground uppercase tracking-tight truncate">
                                    {branch.branchName}
                                </span>
                                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase border border-primary/20 shrink-0">
                                    {totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"}
                                </span>
                            </div>

                            <button
                                onClick={() => props.onRemoveBranch(branch.branchId)}
                                disabled={props.disabled}
                                className={cn(
                                    "p-1.5 rounded-md transition-all shrink-0 shadow-sm",
                                    props.disabled 
                                        ? "text-muted-foreground/30 cursor-not-allowed" 
                                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:scale-110 active:scale-90 hover:shadow-destructive/20"
                                )}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-5">
                            {totalItems === 0 ? (
                                <button
                                    onClick={() => props.onOpenPicker(branch.branchId)}
                                    disabled={!props.canAddProducts}
                                    className={cn(
                                        "w-full py-12 border-2 border-dashed rounded-xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 transition-all",
                                        props.canAddProducts
                                            ? "border-border bg-background hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary shadow-sm"
                                            : "border-border text-muted-foreground/60 cursor-not-allowed opacity-60"
                                    )}
                                >
                                    <div className="p-3 bg-muted rounded-full">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    Assign Products to this Hub
                                </button>
                            ) : (
                                <div className="space-y-4 w-full min-w-0">
                                    <div className="w-full overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
                                        <table className="min-w-[1200px] w-full text-[11px] border-separate border-spacing-0">
                                            <thead className="bg-muted/80 backdrop-blur-md">
                                            <tr>
                                                <th className="px-3 py-3 text-left text-[9px] font-black uppercase text-muted-foreground border-b border-border w-10 tracking-widest">#</th>
                                                <th className="px-3 py-3 text-left text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Brand</th>
                                                <th className="px-3 py-3 text-left text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Category</th>
                                                <th className="px-3 py-3 text-left text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Product Name</th>
                                                <th className="px-3 py-3 text-right text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Price</th>
                                                <th className="px-3 py-3 text-center text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">UOM</th>
                                                <th className="px-3 py-3 text-center text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Qty</th>
                                                <th className="px-3 py-3 text-right text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Gross</th>
                                                <th className="px-3 py-3 text-center text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Disc Type</th>
                                                <th className="px-3 py-3 text-right text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Disc Amt</th>
                                                <th className="px-3 py-3 text-right text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Net</th>
                                                <th className="px-3 py-3 text-right text-[9px] font-black uppercase text-muted-foreground border-b border-border tracking-widest">Action</th>
                                            </tr>
                                            </thead>

                                            <tbody className="divide-y divide-border">
                                            {paginatedItems.map((item: any, idx) => {
                                                const dtId = String(item?.discountTypeId ?? "");
                                                const dt = dtId ? discountTypeById.get(dtId) : undefined;
                                                const code = dt?.name ?? "No Discount";
                                                const pct = Number(dt?.percent ?? 0);
                                                
                                                const grossAmount = item.price * item.orderQty;
                                                const discAmount = grossAmount * (pct / 100);
                                                const netAmount = grossAmount - discAmount;

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className="hover:bg-muted/30 transition-colors group"
                                                    >
                                                        <td className="px-3 py-3 text-muted-foreground font-mono text-[9px]">
                                                            {startIndex + idx + 1}
                                                        </td>
                                                        <td className="px-3 py-3 font-black text-foreground uppercase tracking-tight text-[10px]">
                                                            {item.brand || "—"}
                                                        </td>
                                                        <td className="px-3 py-3 text-muted-foreground font-bold uppercase text-[9px]">
                                                            {item.category || "—"}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-black text-foreground tracking-tight uppercase group-hover:text-primary transition-colors text-[10px] truncate max-w-[180px]">{item.name}</span>
                                                                <span className="text-[8px] text-muted-foreground font-mono">
                                                                    ID: {item.id}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-right font-bold text-foreground/80 text-[10px]">
                                                            {money.format(item.price).replace("PHP", "").trim()}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[8px] font-black rounded uppercase">
                                                                {item.uom}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="flex items-center justify-center gap-2">
                                                                 <button
                                                                    onClick={() =>
                                                                        props.onUpdateQty(
                                                                            branch.branchId,
                                                                            item.id,
                                                                            item.orderQty - 1
                                                                        )
                                                                    }
                                                                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-30 shadow-sm transition-all hover:scale-110 active:scale-90"
                                                                    disabled={item.orderQty <= 1 || props.disabled}
                                                                >
                                                                    <Minus className="w-2.5 h-2.5" />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={item.orderQty}
                                                                    disabled={props.disabled}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        props.onUpdateQty(
                                                                            branch.branchId,
                                                                            item.id,
                                                                            isNaN(val) ? 0 : val
                                                                        );
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        if (isNaN(val) || val < 1) {
                                                                            props.onUpdateQty(branch.branchId, item.id, 1);
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "w-10 text-center font-black text-[11px] tracking-tighter bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                                        props.disabled && "text-muted-foreground cursor-not-allowed"
                                                                    )}
                                                                />
                                                                 <button
                                                                    onClick={() =>
                                                                        props.onUpdateQty(
                                                                            branch.branchId,
                                                                            item.id,
                                                                            item.orderQty + 1
                                                                        )
                                                                    }
                                                                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted shadow-sm transition-all hover:scale-110 active:scale-90"
                                                                    disabled={props.disabled}
                                                                >
                                                                    <Plus className="w-2.5 h-2.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-right font-bold text-muted-foreground text-[10px]">
                                                            {money.format(grossAmount).replace("PHP", "").trim()}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                                                                {code}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 text-right font-bold text-emerald-600/80 text-[10px]">
                                                            {money.format(discAmount).replace("PHP", "").trim()}
                                                        </td>
                                                        <td className="px-3 py-3 text-right font-black text-primary text-[11px] tracking-tighter">
                                                            {money.format(netAmount).replace("PHP", "").trim()}
                                                        </td>
                                                        <td className="px-3 py-3 text-right">
                                                            <button
                                                                onClick={() => props.onRemoveItem(branch.branchId, item.id)}
                                                                disabled={props.disabled}
                                                                className={cn(
                                                                    "p-1.5 rounded-md transition-all",
                                                                    props.disabled 
                                                                        ? "text-muted-foreground/30 cursor-not-allowed" 
                                                                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90"
                                                                )}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                                        <div className="flex items-center gap-4">
                                             <button
                                                onClick={() => props.onOpenPicker(branch.branchId)}
                                                disabled={!props.canAddProducts || props.disabled}
                                                className={cn(
                                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-95 active:translate-y-0",
                                                    (!props.canAddProducts || props.disabled) && "opacity-50 cursor-not-allowed grayscale border-muted text-muted-foreground hover:bg-background hover:text-muted-foreground shadow-none"
                                                )}
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add More Products
                                            </button>

                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
                                            </p>
                                        </div>

                                        {totalPages > 1 && (
                                            <div className="flex items-center gap-2 bg-background border rounded-xl p-1 shadow-sm">
                                                <button
                                                    onClick={() => setPages(prev => ({ ...prev, [branch.branchId]: Math.max(1, currentPage - 1) }))}
                                                    disabled={currentPage === 1}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-all hover:scale-110 active:scale-90 shadow-sm hover:shadow-md"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <div className="px-3 flex gap-1">
                                                    {Array.from({ length: totalPages }, (_, i) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                                currentPage === i + 1 ? "bg-primary w-4" : "bg-border hover:bg-muted-foreground"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setPages(prev => ({ ...prev, [branch.branchId]: Math.min(totalPages, currentPage + 1) }))}
                                                    disabled={currentPage === totalPages}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-all hover:scale-110 active:scale-90 shadow-sm hover:shadow-md"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
