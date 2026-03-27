"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePostingOfPo } from "../providers/PostingOfPoProvider";
import { money } from "../utils/format";
import { ProductsReceivingStatusCard } from "./cards/ProductsReceivingStatusCard";
import { ReceiptsCard } from "./cards/ReceiptsCard";
import { PODetailsBreakdownCard } from "./cards/PODetailsBreakdownCard";
import { PostingPOPrintAction } from "./PostingPOPrintAction";

function statusBadge(status: string) {
    const s = String(status || "").toUpperCase();
    if (s === "CLOSED") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "PARTIAL") return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
}

export function PostingPODetail() {
    const { selectedPO, postError, successMsg, clearSuccess, postAllReceipts, posting } = usePostingOfPo();

    if (!selectedPO) {
        return (
            <Card className="p-6 min-w-0">
                <div className="text-sm font-semibold">PO Details</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    Select a received PO from the left list.
                </div>

                <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No PO selected.
                </div>
            </Card>
        );
    }

    const unposted = (selectedPO.receipts ?? []).filter((r) => !r.isPosted);

    return (
        <Card className="p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-base font-semibold truncate">{selectedPO.poNumber}</div>
                    <div className="text-xs text-muted-foreground truncate">{selectedPO.supplier?.name ?? "—"}</div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className={cn("text-[10px] font-bold", statusBadge(selectedPO.status))}>
                            {selectedPO.status}
                        </Badge>
                        <span>
              Total:{" "}
                            <span className="font-semibold text-foreground">
                {money(selectedPO.totalAmount ?? 0, selectedPO.currency ?? "PHP")}
              </span>
            </span>
                        <span>
              Unposted Receipts:{" "}
                            <span className="font-semibold text-foreground">{unposted.length}</span>
            </span>
                    </div>
                </div>
                
                <div className="shrink-0 pt-1 flex items-center gap-2">
                    {/* ✅ Post All button for partially-received POs (no receipts yet) */}
                    {selectedPO && (selectedPO.receiptsCount === 0 || selectedPO.unpostedReceiptsCount > 0) && (
                        <Button
                            type="button"
                            size="sm"
                            disabled={posting}
                            onClick={() => postAllReceipts(String((selectedPO as any).id))}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                        >
                            {posting ? "Posting..." : "Post All"}
                        </Button>
                    )}
                    <PostingPOPrintAction />
                </div>
            </div>

            {successMsg ? (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate">{successMsg}</div>
                        <Button type="button" variant="outline" size="sm" className="h-7" onClick={clearSuccess}>
                            OK
                        </Button>
                    </div>
                </div>
            ) : null}

            {postError ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {postError}
                </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ProductsReceivingStatusCard />
                <ReceiptsCard />
            </div>

            <div className="mt-4">
                <PODetailsBreakdownCard />
            </div>
        </Card>
    );
}
