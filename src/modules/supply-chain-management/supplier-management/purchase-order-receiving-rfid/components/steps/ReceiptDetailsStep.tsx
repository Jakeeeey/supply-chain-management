/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useReceivingProducts } from "../../providers/ReceivingProductsProvider";

const RECEIPT_TYPES = [
    { value: "SI-CHARGE", label: "Charge Sales Invoice [SI-CHARGE]" },
    { value: "SI-CASH", label: "Cash Sales Invoice [SI-CASH]" },
    { value: "DR", label: "Delivery Receipt [DR]" },
];

function statusBadgeClasses(status?: string) {
    const s = String(status || "").toUpperCase();
    if (s === "CLOSED") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "PARTIAL") return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
}

export function ReceiptDetailsStep({ onContinue }: { onContinue: () => void }) {
    const {
        selectedPO,
        receiptNo,
        setReceiptNo,
        receiptType,
        setReceiptType,
        receiptDate,
        setReceiptDate,
    } = useReceivingProducts();

    const branchesLabel = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const names = allocs
            .map((a) => String(a?.branch?.name || "").trim())
            .filter(Boolean);
        if (!names.length) return "—";
        return Array.from(new Set(names)).join(", ");
    }, [selectedPO]);

    const progress = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const items = allocs.flatMap((a) => (Array.isArray(a?.items) ? a.items : []));
        const totalTagged = items.reduce((acc, it: any) => acc + (Number(it?.taggedQty) || 0), 0);
        const totalReceived = items.reduce((acc, it: any) => acc + (Number(it?.receivedQty) || 0), 0);
        return { totalTagged, totalReceived };
    }, [selectedPO]);

    const receiptHint = React.useMemo(() => {
        if (!selectedPO) return "";
        const { totalTagged, totalReceived } = progress;
        if (totalTagged <= 0) return "";
        if (totalReceived >= totalTagged) return "This PO appears fully received already.";
        if (totalReceived > 0) return "This will be a partial receiving receipt (continuation is allowed).";
        return "This will start receiving for this PO.";
    }, [selectedPO, progress]);

    const handleContinue = () => {
        if (!selectedPO) {
            toast.error("Process aborted", { description: "Select a PO first." });
            return;
        }

        const errs: string[] = [];
        if (!receiptNo.trim()) errs.push("Receipt Number is required.");
        if (!receiptType.trim()) errs.push("Receipt Type is required.");
        if (!receiptDate.trim()) errs.push("Receipt Date is required.");

        if (errs.length > 0) {
            toast.error("Required fields missing", {
                description: errs.join(" "),
            });
            return;
        }

        onContinue();
    };

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold">Selected PO Details</div>
                    {selectedPO?.status ? (
                        <Badge variant="secondary" className={statusBadgeClasses(selectedPO.status)}>
                            {selectedPO.status}
                        </Badge>
                    ) : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">PO Number</div>
                    <div className="text-right font-medium">{selectedPO?.poNumber ?? "—"}</div>

                    <div className="text-muted-foreground">Supplier</div>
                    <div className="text-right font-medium">{selectedPO?.supplier?.name ?? "—"}</div>

                    <div className="text-muted-foreground">Delivery Branches</div>
                    <div className="text-right font-medium">{branchesLabel}</div>

                    <div className="text-muted-foreground">Receiving Progress</div>
                    <div className="text-right font-medium">
                        {progress.totalReceived} / {progress.totalTagged}
                    </div>
                </div>

                {receiptHint ? (
                    <div className="mt-3 text-xs text-muted-foreground">{receiptHint}</div>
                ) : null}
            </Card>

            {/* ✅ MERGED: Previous Receipts History */}
            {selectedPO?.history && selectedPO.history.length > 0 && (
                <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Previous Receipts History
                    </div>
                    <div className="mt-3 space-y-2">
                        {selectedPO.history.map((h) => (
                            <div
                                key={h.receiptNo}
                                className="flex items-center justify-between gap-3 text-xs border-b border-amber-500/10 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="flex flex-col">
                                    <span className="font-mono font-medium text-amber-900 dark:text-amber-100">
                                        {h.receiptNo}
                                    </span>
                                    <span className="text-[10px] text-amber-700/70 dark:text-amber-400/60">
                                        {h.receiptDate || "N/A"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                        {h.itemsCount} {h.itemsCount === 1 ? "item" : "items"}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] uppercase h-4 px-1 leading-none border-amber-500/30",
                                            h.isPosted ? "bg-amber-100 text-amber-800" : "bg-white text-muted-foreground"
                                        )}
                                    >
                                        {h.isPosted ? "Posted" : "Unposted"}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card className="p-4">
                <div className="text-sm font-semibold">Receipt Details</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    Create receipt first, then continue to product RFID scanning.
                </div>

                <div className="mt-4 grid gap-4">
                    <div className="grid gap-2">
                        <Label>Receipt Number *</Label>
                        <Input 
                            value={receiptNo} 
                            onChange={(e) => setReceiptNo(e.target.value)} 
                            placeholder="Enter Receipt Number..."
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Receipt Type *</Label>
                        <Select value={receiptType} onValueChange={setReceiptType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {RECEIPT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Receipt Date *</Label>
                        <Input
                            type="date"
                            value={receiptDate}
                            onChange={(e) => setReceiptDate(e.target.value)}
                        />
                    </div>



                    <Button type="button" className="w-full" onClick={handleContinue}>
                        Continue to Product Checklist
                    </Button>
                </div>
            </Card>
        </div>
    );
}
