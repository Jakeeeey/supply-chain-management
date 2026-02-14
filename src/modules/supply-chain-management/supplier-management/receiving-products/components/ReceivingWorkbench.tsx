"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReceivingProducts } from "../providers/ReceivingProductsProvider";
import { ScanPOStep } from "./steps/ScanPOStep";
import { ReceiptDetailsStep } from "./steps/ReceiptDetailsStep";
import { ScanProductsStep } from "./steps/ScanProductsStep";

function StepDot({ active }: { active: boolean }) {
    return (
        <div
            className={cn(
                "h-2.5 w-2.5 rounded-full",
                active ? "bg-primary" : "bg-muted"
            )}
        />
    );
}

export function ReceivingWorkbench() {
    const { selectedPO } = useReceivingProducts();
    const [step, setStep] = React.useState<0 | 1 | 2>(0);

    // ✅ once a PO is selected/verified, move forward automatically
    React.useEffect(() => {
        if (selectedPO) setStep(1);
        else setStep(0);
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
                    <ScanPOStep />
                ) : step === 1 ? (
                    <ReceiptDetailsStep onContinue={() => setStep(2)} />
                ) : (
                    <ScanProductsStep />
                )}
            </div>
        </Card>
    );
}
