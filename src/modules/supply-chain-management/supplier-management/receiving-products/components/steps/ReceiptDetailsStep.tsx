"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useReceivingProducts } from "../../providers/ReceivingProductsProvider";

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

    const branchesText = React.useMemo(() => {
        const alloc = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const names = alloc
            .map((a) => a?.branch?.name)
            .filter(Boolean) as string[];
        return names.length ? names.join(", ") : "—";
    }, [selectedPO]);

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
                    <div className="text-right font-medium">{branchesText}</div>
                </div>
            </Card>

            <Card className="p-4 space-y-4">
                <div className="text-sm font-semibold">Receipt Details</div>

                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Receipt Number *</div>
                    <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="REC-0001" />
                </div>

                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Receipt Type *</div>
                    <Select value={receiptType} onValueChange={setReceiptType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SI-CHARGE">Charge Sales Invoice [SI-CHARGE]</SelectItem>
                            <SelectItem value="SI-CASH">Cash Sales Invoice [SI-CASH]</SelectItem>
                            <SelectItem value="DR">Delivery Receipt [DR]</SelectItem>
                            <SelectItem value="INV">Supplier Invoice [INV]</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Receipt Date *</div>
                    <Input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                    />
                </div>

                <Button
                    type="button"
                    className="w-full"
                    onClick={onContinue}
                    disabled={!receiptNo.trim() || !receiptType.trim() || !receiptDate.trim()}
                >
                    Continue to Product Scanning
                </Button>
            </Card>
        </div>
    );
}
