"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePostingOfPo } from "../../providers/PostingOfPoProvider";
import { money } from "../../utils/format";

export function PODetailsBreakdownCard() {
    const { selectedPO, discountTypes } = usePostingOfPo();

    if (!selectedPO) return null;

    const allocations = selectedPO.allocations || [];
    if (allocations.length === 0) return null;

    const computedDiscount = allocations.reduce((sum, alloc) => {
        return sum + alloc.items.reduce((itemSum, it) => {
            const uprice = it.unitPrice || 0;
            const qty = it.receivedQty || it.expectedQty || 0;
            const gross = uprice * qty;

            if (!it.discountTypeId || it.discountTypeId === "null") return itemSum;
            const dt = discountTypes.find(d => String(d.id) === String(it.discountTypeId) || String(d.name) === String(it.discountTypeId));
            if (dt) return itemSum + ((dt.percent / 100) * gross);
            const nums = (it.discountTypeId.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 100);
            if (nums.length) {
                const factor = nums.reduce((a, p) => a * (1 - p / 100), 1);
                return itemSum + (gross * (1 - factor));
            }
            return itemSum;
        }, 0);
    }, 0);

    const finalDiscount = Number(selectedPO.discountAmount) > 0 ? Number(selectedPO.discountAmount) : computedDiscount;

    return (
        <Card className="flex flex-col border border-border bg-card shadow-sm p-4 w-full">
            <h3 className="font-semibold text-sm mb-4">Detailed Allocations</h3>
            
            <div className="space-y-6">
                {allocations.map((alloc) => {
                    const branchName = alloc.branch?.name || "Unknown Branch";
                    const branchId = alloc.branch?.id || "unknown";

                    // Total for this branch — use received qty for accurate Net Total
                    const branchTotal = alloc.items.reduce((sum, item) => {
                        const qty = item.receivedQty || item.expectedQty || 0;
                        return sum + (item.unitPrice || 0) * qty;
                    }, 0);

                    return (
                        <div key={branchId} className="space-y-2 border border-border/50 rounded-lg p-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <span className="font-medium text-sm text-primary">{branchName}</span>
                                <Badge variant="secondary" className="text-xs">
                                    {money(branchTotal, selectedPO.currency || "PHP")}
                                </Badge>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <Table className="w-full text-xs">
                                    <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="w-[120px] font-medium h-8 py-1">SKU/Barcode</TableHead>
                                            <TableHead className="min-w-[150px] font-medium h-8 py-1">Item</TableHead>
                                            <TableHead className="text-right font-medium h-8 py-1">Qty</TableHead>
                                            <TableHead className="text-right font-medium h-8 py-1">Unit Price</TableHead>
                                            <TableHead className="text-right font-medium h-8 py-1">Discount</TableHead>
                                            <TableHead className="text-right font-medium h-8 py-1">Net Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {alloc.items.map((it) => {
                                            const uprice = it.unitPrice || 0;
                                            const qty = it.receivedQty || it.expectedQty || 0;
                                            const gross = uprice * qty;

                                            let discountDisplay = "—";
                                            if (it.discountTypeId && it.discountTypeId !== "null") {
                                                // First, try to find it in the fetched discount types
                                                const dt = discountTypes.find(d => String(d.id) === String(it.discountTypeId) || String(d.name) === String(it.discountTypeId));
                                                if (dt) {
                                                    const discAmt = (dt.percent / 100) * gross;
                                                    discountDisplay = `${dt.name} ${money(discAmt, selectedPO.currency || "PHP")}`;
                                                } else {
                                                    // discountTypeId is already the name (e.g., "L3/L1.5")
                                                    // Try to derive percent from the name to show the amount
                                                    const nums = (it.discountTypeId.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 100);
                                                    if (nums.length) {
                                                        const factor = nums.reduce((a, p) => a * (1 - p / 100), 1);
                                                        const discAmt = gross * (1 - factor);
                                                        discountDisplay = `${it.discountTypeId} ${money(discAmt, selectedPO.currency || "PHP")}`;
                                                    } else {
                                                        discountDisplay = it.discountTypeId;
                                                    }
                                                }
                                            }

                                            const netTotal = gross - ((() => {
                                                if (!it.discountTypeId || it.discountTypeId === "null") return 0;
                                                const dt = discountTypes.find(d => String(d.id) === String(it.discountTypeId) || String(d.name) === String(it.discountTypeId));
                                                if (dt) return (dt.percent / 100) * gross;
                                                const nums = (it.discountTypeId.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 100);
                                                if (nums.length) {
                                                    const factor = nums.reduce((a, p) => a * (1 - p / 100), 1);
                                                    return gross * (1 - factor);
                                                }
                                                return 0;
                                            })());

                                            return (
                                                <TableRow key={it.productId} className="border-border transition-colors hover:bg-muted/30">
                                                    <TableCell className="h-8 py-1 align-middle text-muted-foreground">{it.barcode}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle font-medium truncate max-w-[200px]" title={it.name}>{it.name}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle text-right">{qty}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle text-right">{money(uprice, selectedPO.currency || "PHP")}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle text-right text-muted-foreground">{discountDisplay}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle text-right font-medium">{money(netTotal, selectedPO.currency || "PHP")}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 border-t border-border/50 pt-4 flex flex-col gap-2 w-full max-w-sm ml-auto text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span>Gross Amount:</span>
                    <span>{money(selectedPO.grossAmount || 0, selectedPO.currency || "PHP")}</span>
                </div>
                {finalDiscount > 0 && (
                    <div className="flex justify-between items-center text-red-500/80 dark:text-red-400">
                        <span>Total Discount:</span>
                        <span>-{money(finalDiscount, selectedPO.currency || "PHP")}</span>
                    </div>
                )}
                {Number(selectedPO.vatAmount) > 0 && (
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span>VAT Details:</span>
                        <span>{money(selectedPO.vatAmount || 0, selectedPO.currency || "PHP")}</span>
                    </div>
                )}
                {Number(selectedPO.withholdingTaxAmount) > 0 && (
                    <div className="flex justify-between items-center text-red-500/80 dark:text-red-400">
                        <span>EWT:</span>
                        <span>{money(selectedPO.withholdingTaxAmount || 0, selectedPO.currency || "PHP")}</span>
                    </div>
                )}
                <div className="flex justify-between items-center font-bold text-base mt-2 pt-2 border-t border-border/30">
                    <span>Grand Total:</span>
                    <span>{money(selectedPO.totalAmount || 0, selectedPO.currency || "PHP")}</span>
                </div>
            </div>
        </Card>
    );
}
