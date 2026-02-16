"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
                <div className="text-sm font-semibold">Selected PO Details</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">PO Number</div>
                    <div className="text-right font-medium">{selectedPO?.poNumber ?? "—"}</div>

                    <div className="text-muted-foreground">Supplier</div>
                    <div className="text-right font-medium">{selectedPO?.supplier?.name ?? "—"}</div>

                    <div className="text-muted-foreground">Delivery Branches</div>
                    <div className="text-right font-medium">{branchesLabel}</div>
                </div>
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
