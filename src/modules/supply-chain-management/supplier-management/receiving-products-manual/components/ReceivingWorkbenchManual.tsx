"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReceivingProductsManual } from "../providers/ReceivingProductsManualProvider";
// ❌ removed ScanPOStep (barcode scanner not needed anymore)
// import { ScanPOStep } from "./steps/ScanPOStep";
import { ReceiptDetailsStep } from "./steps/ReceiptDetailsStep";
import { ManualProductsStep } from "./steps/ManualProductsStep";

function StepDot({ active }: { active: boolean }) {
    return (
        <div
            className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-primary" : "bg-muted")}
        />
    );
}

export function ReceivingWorkbenchManual() {
    const { selectedPO } = useReceivingProductsManual();
    const [step, setStep] = React.useState<0 | 1 | 2>(0);

    // ✅ only auto-advance from 0 -> 1 when PO becomes available.
    // ✅ if user is already on step 2, do NOT force back to step 1 on selectedPO refresh.
    React.useEffect(() => {
        setStep((prev) => {
            if (!selectedPO) return 0;
            if (prev === 0) return 1;
            return prev;
        });
    }, [selectedPO]);

    return (
        <Card className="p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold">Receiving Workbench</div>
                    <div className="text-xs text-muted-foreground">
                        Follow the steps to verify and receive items
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <StepDot active={step === 0} />
                    <StepDot active={step === 1} />
                    <StepDot active={step === 2} />
                </div>
            </div>

            <div className="mt-4">
                {step === 0 ? (
                    // ✅ Replaced barcode scanner with a simple instruction state
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
                        <div className="text-sm font-semibold text-foreground">
                            Select a Purchase Order to start receiving
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Barcode scanning was removed here because it’s already handled in Tagging of PO.
                            Please select a PO from the list to continue.
                        </div>
                    </div>
                ) : step === 1 ? (
                    <ReceiptDetailsStep onContinue={() => setStep(2)} />
                ) : (
                    <ManualProductsStep />
                )}
            </div>
        </Card>
    );
}
