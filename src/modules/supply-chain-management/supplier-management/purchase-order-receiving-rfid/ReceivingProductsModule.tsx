"use client";

import * as React from "react";
import { ReceivingProductsProvider } from "./providers/ReceivingProductsProvider";
import { AvailableForReceiving } from "./components/AvailableForReceiving";
import { ReceivingWorkbench } from "./components/ReceivingWorkbench";

export function ReceivingProductsModule() {
    return (
        <ReceivingProductsProvider>
            <div className="w-full px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Receiving of Products RFID
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Scan and receive products from approved purchase orders (organized by delivery branch)
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
                    <AvailableForReceiving />
                    <ReceivingWorkbench />
                </div>
            </div>
        </ReceivingProductsProvider>
    );
}

export default ReceivingProductsModule;
