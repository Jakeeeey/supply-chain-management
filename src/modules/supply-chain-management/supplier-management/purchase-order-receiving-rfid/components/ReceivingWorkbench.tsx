"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReceivingProducts } from "../providers/ReceivingProductsProvider";
import { ReceiptDetailsStep } from "./steps/ReceiptDetailsStep";
import ScanBarcodeStep from "./steps/ScanBarcodeStep";
import { TagRFIDStep } from "./steps/TagRFIDStep";
import { ReviewReceiptStep } from "./steps/ReviewReceiptStep";

function StepDot({ active }: { active: boolean }) {
    return (
        <div
            className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-primary" : "bg-muted")}
        />
    );
}

export function ReceivingWorkbench({ receiverName }: { receiverName?: string }) {
    const { selectedPO } = useReceivingProducts();
    const [step, setStep] = React.useState<0 | 1 | 2 | 3 | 4>(0);

    // ✅ only auto-advance from 0 -> 1 when PO becomes available.
    // ✅ if user is already on a deeper step, do NOT force back to step 1 on selectedPO refresh.
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
                    <StepDot active={step === 3} />
                    <StepDot active={step === 4} />
                </div>
            </div>

            <div className="mt-4">
                {step === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
                        <div className="text-sm font-semibold text-foreground">
                            Select a Purchase Order to start receiving
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            New RFID tags will be automatically assigned during scanning.
                            Select a PO from the list to continue.
                        </div>
                    </div>
                ) : step === 1 ? (
                    <ReceiptDetailsStep onContinue={() => setStep(2)} />
                ) : step === 2 && selectedPO ? (
                    <ScanBarcodeStep poDetail={selectedPO} onContinue={() => setStep(3)} />
                ) : step === 3 ? (
                    <TagRFIDStep onContinue={() => setStep(4)} />
                ) : (
                    <ReviewReceiptStep onBack={() => setStep(3)} receiverName={receiverName} />
                )}
            </div>
        </Card>
    );
}
