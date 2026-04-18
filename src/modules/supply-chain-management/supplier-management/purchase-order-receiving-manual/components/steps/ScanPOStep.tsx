"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useReceivingProductsManual } from "../../providers/ReceivingProductsManualProvider";
import { Scan } from "lucide-react";

export function ScanPOStep() {
    const { poBarcode, setPoBarcode, verifyPO, verifyError, selectedPO } =
        useReceivingProductsManual();

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        inputRef.current?.focus();
    }, []);

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

            <div className="rounded-lg border border-dashed p-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md border">
                    <Scan className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-sm font-medium">Scan Purchase Order Barcode</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    Optional: scan/enter PO number to verify (you can also select from the list)
                </div>

                <div className="mt-6 space-y-3 text-left">
                    <div className="text-xs font-medium text-muted-foreground">PO Barcode</div>
                    <Input
                        ref={inputRef}
                        value={poBarcode}
                        onChange={(e) => setPoBarcode(e.target.value)}
                        placeholder="Scan or type PO barcode..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") verifyPO();
                        }}
                    />

                    {verifyError ? (
                        <div className="text-xs text-destructive">{verifyError}</div>
                    ) : null}

                    <Button
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={verifyPO}
                        type="button"
                    >
                        Verify &amp; Continue
                    </Button>
                </div>
            </div>
        </div>
    );
}
