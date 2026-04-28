"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { money } from "../../utils/format";

import { usePostingOfPo } from "../../providers/PostingOfPoProvider";

export function PODetailsBreakdownCard() {
    const { selectedPO } = usePostingOfPo();

    if (!selectedPO) return null;

    const allocations = selectedPO.allocations || [];
    if (allocations.length === 0) return null;

    const isInvoice = Number(selectedPO.vatAmount) > 0 || Number(selectedPO.withholdingTaxAmount) > 0;

    // Use backend-provided discount amounts directly (already calculated with full precision)
    const totalDiscount = allocations.reduce((sum, alloc) => {
        return sum + alloc.items.reduce((itemSum, it) => {
            return itemSum + (it.discountAmount ?? 0);
        }, 0);
    }, 0);

    const finalDiscount = Number(totalDiscount.toFixed(2));

    // Compute live gross from allocations for accurate totals
    const liveGross = allocations.reduce((sum, alloc) => {
        return sum + alloc.items.reduce((s, it) => {
            const qty = it.receivedQty || it.expectedQty || 0;
            return s + (it.unitPrice || 0) * qty;
        }, 0);
    }, 0);

    const liveGrandTotal = Number((liveGross - finalDiscount).toFixed(2));


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
                                            let discountAmt = it.discountAmount ?? 0;

                                            if (it.discountLabel && discountAmt > 0) {
                                                discountDisplay = `${it.discountLabel} ${money(discountAmt, selectedPO.currency || "PHP")}`;
                                            } else if (discountAmt > 0) {
                                                discountDisplay = money(discountAmt, selectedPO.currency || "PHP");
                                            }

                                            const netTotal = it.netAmount ?? (gross - discountAmt);

                                            return (
                                                <TableRow key={it.productId} className="border-border transition-colors hover:bg-muted/30">
                                                    <TableCell className="h-8 py-1 align-middle text-muted-foreground">{it.barcode}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle font-medium" title={it.name}>{it.name}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle text-right">{qty}</TableCell>
                                                    <TableCell className="h-8 py-1 align-middle text-right">
                                                        {money(uprice, selectedPO.currency || "PHP")}
                                                    </TableCell>
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
                    <span>{money(liveGross || selectedPO.grossAmount || 0, selectedPO.currency || "PHP")}</span>
                </div>
                {finalDiscount > 0 && (
                    <div className="flex justify-between items-center text-red-500/80 dark:text-red-400">
                        <span>Total Discount:</span>
                        <span>-{money(finalDiscount, selectedPO.currency || "PHP")}</span>
                    </div>
                )}
                {isInvoice && Number(selectedPO.vatAmount) > 0 && (
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span>VAT Details:</span>
                        <span>{money(selectedPO.vatAmount || 0, selectedPO.currency || "PHP")}</span>
                    </div>
                )}
                {isInvoice && Number(selectedPO.withholdingTaxAmount) > 0 && (
                    <div className="flex justify-between items-center text-red-500/80 dark:text-red-400">
                        <span>EWT:</span>
                        <span>{money(selectedPO.withholdingTaxAmount || 0, selectedPO.currency || "PHP")}</span>
                    </div>
                )}
                <div className="flex justify-between items-center font-bold text-base mt-2 pt-2 border-t border-border/30">
                    <span>Grand Total:</span>
                    <span>{money(liveGrandTotal || Number(selectedPO.grossAmount || 0) - Number(selectedPO.discountAmount || 0), selectedPO.currency || "PHP")}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight">
                    Note: VAT and EWT figures are for reference and have not been deducted from the total.
                </p>
            </div>
        </Card>
    );
}
