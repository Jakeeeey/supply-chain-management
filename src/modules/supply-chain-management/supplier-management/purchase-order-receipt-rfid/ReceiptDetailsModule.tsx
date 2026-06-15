"use client";

import * as React from "react";
import { ReceivingProductsProvider } from "./providers/ReceivingProductsProvider";
import { AvailableForReceiving } from "./components/AvailableForReceiving";
import { ReceiptDetailsWorkbench } from "./components/ReceiptDetailsWorkbench";

export function ReceiptDetailsModule({ receiverId, receiverName }: { receiverId?: number; receiverName?: string }) {
    return (
        <ReceivingProductsProvider receiverId={receiverId}>
            <div className="w-full px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Purchase Order Receipt RFID
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Enter receipt details and finalize received products from approved purchase orders
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] items-start">
                    <AvailableForReceiving />
                    <ReceiptDetailsWorkbench receiverName={receiverName} />
                </div>
            </div>
        </ReceivingProductsProvider>
    );
}

export default ReceiptDetailsModule;
