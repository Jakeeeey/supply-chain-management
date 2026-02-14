"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RefreshCw, Package, ChevronRight } from "lucide-react";
import { useReceivingProducts } from "../providers/ReceivingProductsProvider";

function statusBadge(status: string) {
    const s = String(status || "").toUpperCase();
    if (s === "CLOSED")
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "PARTIAL")
        return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
}

export function AvailableForReceiving() {
    const {
        poList,
        listLoading,
        listError,
        refreshList,
        selectAndVerifyPO,
        selectedPO,
    } = useReceivingProducts();

    const [q, setQ] = React.useState("");

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return poList ?? [];
        return (poList ?? []).filter((x: any) => {
            const a = String(x?.poNumber ?? "").toLowerCase();
            const b = String(x?.supplierName ?? "").toLowerCase();
            return a.includes(s) || b.includes(s);
        });
    }, [poList, q]);

    function handleSelectPO(po: any) {
        // ✅ Backward/forward compatible:
        // - some providers accept (poNumber)
        // - some accept (poId, poNumber)
        const fn: any = selectAndVerifyPO as any;
        if (typeof fn !== "function") return;

        const poId = po?.id;
        const poNumber = po?.poNumber;

        try {
            if (fn.length >= 2) {
                fn(poId, poNumber);
                return;
            }
            // old behavior: verify by PO barcode/number
            fn(poNumber);
        } catch {
            // last fallback
            try {
                fn(poNumber);
            } catch {}
        }
    }

    return (
        <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold">Available for Receiving</div>
                    <div className="text-xs text-muted-foreground">
                        Select a PO then proceed to receiving
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={refreshList}
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <div className="mt-4">
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search PO number or supplier..."
                />
            </div>

            {listError ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {listError}
                </div>
            ) : null}

            <div className="mt-4 space-y-2">
                {listLoading ? (
                    <>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-border p-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-56" />
                                    </div>
                                    <Skeleton className="h-8 w-20 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </>
                ) : filtered.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No purchase orders available.
                    </div>
                ) : (
                    filtered.map((po: any) => {
                        const active = selectedPO?.id === po.id;

                        return (
                            <button
                                key={po.id}
                                type="button"
                                onClick={() => handleSelectPO(po)}
                                className={cn(
                                    "w-full text-left rounded-xl border border-border p-3 transition",
                                    "hover:bg-muted/40",
                                    active ? "ring-2 ring-primary/25 bg-muted/30" : "bg-background"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-foreground">
                                                    {po.poNumber}
                                                </div>
                                                <div className="truncate text-xs text-muted-foreground">
                                                    {po.supplierName}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-[10px] font-bold",
                                                    statusBadge(po.status)
                                                )}
                                            >
                                                {po.status}
                                            </Badge>
                                            <span>
                        Items:{" "}
                                                <span className="font-semibold text-foreground">
                          {po.itemsCount}
                        </span>
                      </span>
                                            <span>
                        Branches:{" "}
                                                <span className="font-semibold text-foreground">
                          {po.branchesCount}
                        </span>
                      </span>
                                        </div>
                                    </div>

                                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </Card>
    );
}
