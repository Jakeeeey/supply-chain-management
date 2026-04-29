/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PostingPODetail } from "../../types";
import { money } from "../../utils/format";

function statusBadgeClasses(status?: string) {
    const s = String(status || "").toUpperCase();
    if (s === "CLOSED" || s === "RECEIVED")
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "PARTIAL")
        return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
}

export function PurchaseOrderDetailsCard({ po }: { po: PostingPODetail }) {
    // ✅ Backward-compatible: support either {supplierName, branchName} OR {supplier:{name}, allocations[]}
    const supplierName =
        (po as any)?.supplier?.name ?? (po as any)?.supplierName ?? "—";

    const branchName =
        (po as any)?.branchName ??
        (() => {
            const allocs = Array.isArray((po as any)?.allocations) ? (po as any).allocations : [];
            const names = allocs
                .map((a: any) => String(a?.branch?.name || "").trim())
                .filter(Boolean);
            return names.length ? Array.from(new Set(names)).join(", ") : "—";
        })();

    const statusText = String((po as any)?.status || "").trim();

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="text-sm font-medium">Purchase Order Details</div>

                {statusText ? (
                    <Badge variant="secondary" className={statusBadgeClasses(statusText)}>
                        {statusText}
                    </Badge>
                ) : null}
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                <div className="text-muted-foreground">PO Number:</div>
                <div className="text-right font-medium">{(po as any)?.poNumber ?? "—"}</div>

                <div className="text-muted-foreground">Supplier:</div>
                <div className="text-right font-medium">{supplierName}</div>

                <div className="text-muted-foreground">Branch:</div>
                <div className="text-right font-medium">{branchName}</div>

                <div className="text-muted-foreground">Total:</div>
                <div className="text-right font-medium">
                    {money((po as any)?.totalAmount ?? 0, (po as any)?.currency ?? "PHP")}
                </div>
            </div>

            {/* ✅ optional non-breaking helper line */}
            {(po as any)?.postingReady === false ? (
                <div className="mt-4 text-xs text-muted-foreground">
                    This PO is not ready for posting yet. Complete receiving (RFID verification) first.
                </div>
            ) : null}
        </Card>
    );
}