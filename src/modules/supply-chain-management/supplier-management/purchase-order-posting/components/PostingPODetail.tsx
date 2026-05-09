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
    if (s === "CLOSED" || s === "RECEIVED")
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "FOR POSTING")
        return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20";
    if (s === "PARTIAL_POSTED")
        return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20";
    if (s === "PARTIAL")
        return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
}

function statusLabel(status: string) {
    const s = String(status || "").toUpperCase();
    if (s === "FOR_POSTING" || s === "FOR POSTING") return "FOR POSTING";
    if (s === "PARTIAL_POSTED") return "PARTIAL POSTED";
    return s;
}

export function PostingPODetail() {
    const { selectedPO, postError, successMsg, clearSuccess, postAllReceipts, posting } =
        usePostingOfPo();

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

    const status = String(selectedPO.status || "").toUpperCase();
    const unposted = (selectedPO.receipts ?? []).filter(
        (r) => Number(r.isPosted) !== 1 && r.isPosted !== true
    );

    // Show "Post All" when:
    // - No receipts yet (status-only PO, e.g. PARTIAL) OR
    // - There are unposted receipts (PARTIAL_POSTED still has more to post) OR
    // - Status is RECEIVED (fully received, has unposted receipts)
    const showPostAll =
        selectedPO.receiptsCount === 0 ||
        selectedPO.unpostedReceiptsCount > 0 ||
        status === "PARTIAL" ||
        status === "PARTIAL_POSTED";

    // Info banner for partial-posted POs: clarify they can keep posting as more is received
    const isPartialPosted = status === "PARTIAL_POSTED";

    return (
        <div className={cn(
            "min-w-0 border border-border rounded-xl bg-background shadow-sm overflow-hidden flex flex-col",
            posting ? "opacity-70 pointer-events-none" : ""
        )}>
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                    <div className="text-sm font-black text-foreground uppercase tracking-tight truncate">
                        Purchase Order Posting
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                        {selectedPO.poNumber}
                    </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    {showPostAll && (
                        <Button
                            type="button"
                            size="sm"
                            disabled={posting}
                            onClick={() => postAllReceipts(String(selectedPO.id))}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] h-8 rounded-lg shadow-sm"
                        >
                            {posting ? "Posting..." : "Post All"}
                        </Button>
                    )}
                    <PostingPOPrintAction />
                </div>
            </div>

            <div className="p-4 space-y-4 bg-background">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Supplier</div>
                            <div className="text-sm font-black text-foreground truncate uppercase">{selectedPO.supplier?.name ?? "—"}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-bold">
                            <Badge
                                variant="secondary"
                                className={cn("text-[9px] font-black uppercase tracking-tight", statusBadge(selectedPO.status))}
                            >
                                {statusLabel(selectedPO.status)}
                            </Badge>
                            <span className="bg-background px-2 py-0.5 rounded border border-border/50">
                                {money(selectedPO.totalAmount ?? 0, selectedPO.currency ?? "PHP")}
                            </span>
                            <span className="bg-background px-2 py-0.5 rounded border border-border/50 text-primary">
                                {unposted.length} UNPOSTED RECEIPTS
                            </span>
                        </div>
                    </div>
                </div>

                {/* Partial-posted info banner */}
                {isPartialPosted && (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                        <span className="font-black uppercase mr-1">Partially posted.</span>
                        This PO has been partially received and posted. It will remain here so you can post additional receipts as more items are received.
                    </div>
                )}

                {successMsg ? (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate font-black uppercase italic">{successMsg}</div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] font-black uppercase rounded-md shadow-sm"
                                onClick={clearSuccess}
                            >
                                OK
                            </Button>
                        </div>
                    </div>
                ) : null}

                {postError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive font-bold uppercase tracking-tight">
                        {postError}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <ProductsReceivingStatusCard />
                    <ReceiptsCard />
                </div>

                <div className="">
                    <PODetailsBreakdownCard />
                </div>
            </div>
        </div>
    );
}