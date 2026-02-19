"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

    const [localError, setLocalError] = React.useState("");

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
        setLocalError("");
        if (!selectedPO) return setLocalError("Select a PO first.");
        if (!receiptNo.trim()) return setLocalError("Receipt Number is required.");
        if (!receiptType.trim()) return setLocalError("Receipt Type is required.");
        if (!receiptDate.trim()) return setLocalError("Receipt Date is required.");
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

            <Card className="p-4">
                <div className="text-sm font-semibold">Receipt Details</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    Create receipt first, then continue to product RFID scanning.
                </div>

                <div className="mt-4 grid gap-4">
                    <div className="grid gap-2">
                        <Label>Receipt Number *</Label>
                        <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
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

                    {localError ? (
                        <div className="text-xs text-destructive">{localError}</div>
                    ) : null}

                    <Button type="button" className="w-full" onClick={handleContinue}>
                        Continue Product Scanning
                    </Button>
                </div>
            </Card>
        </div>
    );
}
