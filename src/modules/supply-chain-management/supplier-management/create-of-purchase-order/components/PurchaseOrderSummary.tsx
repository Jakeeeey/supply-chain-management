// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/components/PurchaseOrderSummary.tsx
"use client";

import * as React from "react";
import type { BranchAllocation, CartItem, Supplier } from "../types";
import { buildMoneyFormatter } from "../utils/format";

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

    if (!props.visible) return null;

    return (
        <div className="bg-background border border-border rounded-xl p-4 sm:p-6 shadow-sm w-full min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-5">Purchase Order Summary</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 min-w-0">
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">PO Information</p>
                        <div className="text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">PO Number:</span>
                                <span className="font-medium text-foreground break-all text-right">{props.poNumber}</span>
                            </div>
                            <div className="flex justify-between gap-4 mt-2">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-medium text-foreground">{props.poDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Supplier</p>
                        <div className="rounded-lg border border-border bg-primary/5 p-4">
                            <p className="text-sm font-semibold text-foreground break-words">{props.supplier?.name || "—"}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                A/P: {props.supplier ? money.format(props.supplier.apBalance) : "—"}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Delivery Branches ({props.branches.length})</p>
                        <div className="space-y-2">
                            {props.branches.map((b) => (
                                <div key={b.branchId} className="rounded-lg border border-border bg-emerald-500/10 p-4">
                                    <p className="text-sm font-semibold text-foreground break-words">{b.branchName}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{b.items.length} product(s)</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 min-w-0">
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Products ({props.allItemsFlat.length})</p>
                        <div className="space-y-3">
                            {props.allItemsFlat.map(({ branchName, item }, idx) => (
                                <div key={`${branchName}-${item.id}-${idx}`} className="rounded-lg border border-border p-4 bg-background">
                                    <div className="flex justify-between gap-4">
                                        <p className="text-sm font-semibold text-foreground break-words">{item.name}</p>
                                        <p className="text-sm font-semibold text-foreground shrink-0">
                                            {money.format(item.price * item.orderQty)}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 break-words">Branch: {branchName}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Qty: {item.orderQty} × {money.format(item.price)} ({item.selectedUom})
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                        <p className="text-sm font-semibold text-foreground mb-3">Financial Summary</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span className="font-medium text-foreground">{money.format(props.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount:</span>
                                <span className="font-medium text-emerald-600">{money.format(-props.discount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax (12%):</span>
                                <span className="font-medium text-foreground">{money.format(props.tax)}</span>
                            </div>

                            <div className="flex justify-between pt-3 border-t border-border">
                                <span className="font-semibold text-foreground">Total:</span>
                                <span className="font-bold text-lg text-foreground">{money.format(props.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={props.onSave}
                    disabled={!props.canSave}
                    className="px-8 h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Save Purchase Order
                </button>
            </div>
        </div>
    );
}
