"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePostingOfPo } from "../../providers/PostingOfPoProvider";
import { ReceiptCard } from "./ReceiptCard";

export function ReceiptsCard() {
    const { selectedPO } = usePostingOfPo();

    const receipts = Array.isArray(selectedPO?.receipts) ? selectedPO!.receipts : [];

    return (
        <Card className="p-4 min-w-0">
            <div className="text-sm font-semibold">Receipts</div>
            <div className="text-xs text-muted-foreground">Post receipts to finalize</div>

            <div className="mt-3 rounded-lg border border-dashed">
                <ScrollArea className="h-72">
                    <div className="p-3 space-y-3">
                        {receipts.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                No receipts found for this PO.
                            </div>
                        ) : (
                            receipts.map((r) => <ReceiptCard key={r.receiptNo} receipt={r} />)
                        )}
                    </div>
                </ScrollArea>
            </div>
        </Card>
    );
}
