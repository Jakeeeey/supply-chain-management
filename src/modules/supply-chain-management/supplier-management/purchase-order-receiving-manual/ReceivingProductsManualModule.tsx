"use client";

import * as React from "react";
import { ReceivingProductsManualProvider } from "./providers/ReceivingProductsManualProvider";
import { AvailableForReceivingManual } from "./components/AvailableForReceivingManual";
import { ReceivingWorkbenchManual } from "./components/ReceivingWorkbenchManual";

export function ReceivingProductsManualModule({ receiverId }: { receiverId?: number }) {
    return (
        <ReceivingProductsManualProvider receiverId={receiverId}>
            <div className="w-full px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Receiving of Products Manual
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Scan and receive products from approved purchase orders (organized by delivery branch)
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] items-start">
                    <AvailableForReceivingManual />
                    <ReceivingWorkbenchManual />
                </div>
            </div>
        </ReceivingProductsManualProvider>
    );
}

export default ReceivingProductsManualModule;
