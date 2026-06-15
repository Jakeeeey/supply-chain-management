"use client";

import * as React from "react";
import { useReceivingProducts } from "../providers/ReceivingProductsProvider";
import { TagRFIDStep } from "./steps";

import { Card } from "@/components/ui/card";

export function ReceivingWorkbench() {
    const { selectedPO } = useReceivingProducts();

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
                    <div className="text-sm text-muted-foreground">Select a PO from the sidebar to begin tagging</div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold">RFID Tagging Workbench</div>
                    <div className="text-xs text-muted-foreground">
                        Tag products with RFID for {selectedPO.poNumber}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">
                        RFID Tagging
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <TagRFIDStep />
            </div>
        </Card>
    );
}
