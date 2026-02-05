"use client";

import * as React from "react";
import type { BranchAllocation, CartItem, Supplier } from "../types";
import { buildMoneyFormatter } from "../utils/calculations";
import { cn } from "../utils/calculations";
import { Building2, Trash2, Plus, Minus, X } from "lucide-react"; // Inasahan na may icons ka

export function PurchaseOrderSummary(props: {
    visible: boolean;
    poNumber: string;
    poDate: string;
    supplier: Supplier | null;
    branches: BranchAllocation[];
    allItemsFlat: Array<{ branchName: string; item: CartItem }>;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    onSave: () => void;
    canSave: boolean;
}) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    const [page, setPage] = React.useState(1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(props.allItemsFlat.length / itemsPerPage);
    const paginatedItems = props.allItemsFlat.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    if (!props.visible) return null;

    return (
        <div className="bg-background border border-border rounded-xl p-4 sm:p-6 shadow-sm w-full min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wider">Purchase Order Summary</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* LEFT COLUMN: Order Details */}
                <div className="flex flex-col h-[550px] border border-border rounded-xl bg-muted/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/30 shrink-0">
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight">Order Details</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PO Information</p>
                            <div className="text-sm border border-border rounded-lg p-4 bg-background shadow-sm space-y-2">
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">PO Number:</span>
                                    <span className="font-mono font-bold text-foreground">{props.poNumber}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium text-foreground">{props.poDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Supplier</p>
                            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                                <p className="text-sm font-bold text-foreground">{props.supplier?.name || "—"}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    A/P Balance: <span className="text-foreground font-medium">{props.supplier ? money.format(props.supplier.apBalance) : "—"}</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Allocated Branches</p>
                            <div className="space-y-2">
                                {props.branches.map((b) => (
                                    <div key={b.branchId} className="rounded-lg border border-border bg-background p-3 flex justify-between items-center">
                                        <span className="text-xs font-semibold text-foreground">{b.branchName}</span>
                                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold">{b.items.length} ITEMS</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Products & Financials */}
                <div className="flex flex-col h-[550px] space-y-4">
                    {/* Paginated Table Container */}
                    <div className="flex-1 flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-border bg-muted/50 shrink-0 flex justify-between items-center">
                            <p className="text-sm font-bold text-foreground">Products ({props.allItemsFlat.length})</p>
                            <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border uppercase">
                                Page {page} of {totalPages || 1}
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar bg-background/50">
                            <table className="w-full text-sm border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                                <tr className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                    <th className="px-4 py-3 text-left border-b border-border">Item</th>
                                    <th className="px-4 py-3 text-center border-b border-border">Qty</th>
                                    <th className="px-4 py-3 text-right border-b border-border">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                {paginatedItems.map(({ branchName, item }, idx) => (
                                    <tr key={`${branchName}-${item.id}-${idx}`} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-foreground text-xs line-clamp-1">{item.name}</div>
                                            <div className="text-[10px] text-primary font-bold uppercase tracking-tighter">{branchName}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="text-foreground font-bold">{item.orderQty}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">{item.selectedUom}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-foreground">
                                            {money.format(item.price * item.orderQty)}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="text-[10px] font-black uppercase px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 transition"
                            >
                                Prev
                            </button>
                            <div className="flex gap-1.5">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                                    <div key={i} className={cn("w-1.5 h-1.5 rounded-full", page === i + 1 ? "bg-primary" : "bg-border")} />
                                ))}
                            </div>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="text-[10px] font-black uppercase px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="p-5 border border-border rounded-xl bg-muted/30 space-y-3 shrink-0">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium uppercase">Subtotal</span>
                            <span className="font-bold text-foreground">{money.format(props.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium uppercase">Discount</span>
                            <span className="font-bold text-emerald-600">-{money.format(props.discount)}</span>
                        </div>
                        <div className="flex justify-between text-xs border-b border-border/50 pb-3">
                            <span className="text-muted-foreground font-medium uppercase">Tax (12%)</span>
                            <span className="font-bold text-foreground">{money.format(props.tax)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="font-black text-foreground uppercase tracking-tighter text-sm">Grand Total</span>
                            <span className="font-black text-2xl text-primary tracking-tighter">
                                {money.format(props.total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTON AREA - Fixed position at the very bottom */}
            <div className="mt-8 flex justify-end border-t border-border pt-6">
                <button
                    onClick={props.onSave}
                    disabled={!props.canSave}
                    className={cn(
                        "px-12 h-14 rounded-xl bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
                    )}
                >
                    Save Purchase Order
                </button>
            </div>
        </div>
    );
}