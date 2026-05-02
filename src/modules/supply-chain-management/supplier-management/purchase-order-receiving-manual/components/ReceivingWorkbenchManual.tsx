"use client";

import * as React from "react";
import { useReceivingProductsManual } from "../providers/ReceivingProductsManualProvider";
import { ReceiptDetailsStep } from "./steps/ReceiptDetailsStep";
import { ProductVerificationStep } from "./steps/ProductVerificationStep";
import { ManualProductsStep } from "./steps/ManualProductsStep";
import { ReviewReceiptStep } from "./steps/ReviewReceiptStep";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StepDot({ active }: { active: boolean }) {
    return (
        <div
            className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-primary" : "bg-muted")}
        />
    );
}

export function ReceivingWorkbenchManual({ receiverName }: { receiverName?: string }) {
    const { selectedPO, receiptSaved } = useReceivingProductsManual();
    const [step, setStep] = React.useState(0);

    // Reset to step 0 if PO is deselected
    React.useEffect(() => {
        if (!selectedPO) setStep(0);
    }, [selectedPO]);

    // If receipt is saved, we usually stay on step 3 or the module handles visibility
    React.useEffect(() => {
        if (receiptSaved) {
            // Keep on review step (index 3) to show success state
            setStep(3);
        }
    }, [receiptSaved]);

    if (!selectedPO) {
        return (
            <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <div>
                    <div className="text-lg font-semibold">No Purchase Order Selected</div>
                    <div className="text-sm text-muted-foreground">Select a PO from the sidebar to begin receiving</div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold">Receiving Workbench Manual</div>
                    <div className="text-xs text-muted-foreground">
                        Follow the steps to receive items for {selectedPO.poNumber}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <StepDot active={step === 0} />
                    <StepDot active={step === 1} />
                    <StepDot active={step === 2} />
                    <StepDot active={step === 3} />
                </div>
            </div>

            <div className="mt-4">
                {step === 0 ? (
                    <ReceiptDetailsStep onContinue={() => setStep(1)} />
                ) : step === 1 ? (
                    <ProductVerificationStep onContinue={() => setStep(2)} />
                ) : step === 2 ? (
                    <ManualProductsStep onContinue={() => setStep(3)} onBack={() => setStep(1)} />
                ) : step === 3 ? (
                    <ReviewReceiptStep onBack={() => setStep(2)} receiverName={receiverName} />
                ) : null}
            </div>
        </Card>
    );
}
