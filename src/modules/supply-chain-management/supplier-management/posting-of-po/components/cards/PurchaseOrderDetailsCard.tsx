"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import type { PostingPODetail } from "../../types";
import { money } from "../../utils/format";

export function PurchaseOrderDetailsCard({ po }: { po: PostingPODetail }) {
    return (
        <Card className="p-6">
            <div className="text-sm font-medium mb-4">Purchase Order Details</div>

            <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                <div className="text-muted-foreground">PO Number:</div>
                <div className="text-right font-medium">{po.poNumber}</div>

                <div className="text-muted-foreground">Supplier:</div>
                <div className="text-right font-medium">{po.supplierName}</div>

                <div className="text-muted-foreground">Branch:</div>
                <div className="text-right font-medium">{po.branchName}</div>

                <div className="text-muted-foreground">Total:</div>
                <div className="text-right font-medium">{money(po.totalAmount, po.currency)}</div>
            </div>
        </Card>
    );
}
