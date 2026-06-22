"use client";

import * as React from "react";
import { ReceivingProductsProvider } from "./providers/ReceivingProductsProvider";
import { AvailableForReceiving } from "./components/AvailableForReceiving";
import { ReceivingWorkbench } from "./components/ReceivingWorkbench";

export function ReceivingProductsModule({ receiverId }: { receiverId?: number; receiverName?: string }) {
    return (
        <ReceivingProductsProvider receiverId={receiverId}>
            <div className="w-full px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        RFID Tagging
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Scan and tag products with RFID from approved purchase orders
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] items-start">
                    <AvailableForReceiving />
                    <ReceivingWorkbench />
                </div>
            </div>
        </ReceivingProductsProvider>
    );
}

export default ReceivingProductsModule;
