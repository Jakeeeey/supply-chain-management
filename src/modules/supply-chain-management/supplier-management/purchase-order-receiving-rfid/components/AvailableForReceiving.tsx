"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RefreshCw, Package, ChevronRight, ChevronLeft } from "lucide-react";
import { useReceivingProducts } from "../providers/ReceivingProductsProvider";
import {
} from "@/components/ui/select";

function statusBadge(status: string) {
    const s = String(status || "").toUpperCase();
    if (s === "CLOSED" || s === "RECEIVED")
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "PARTIAL")
        return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
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

    // ✅ pagination state (locked to 10)
    const pageSize = 10;
    const [page, setPage] = React.useState(1);

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return poList ?? [];
        return (poList ?? []).filter((x) => {
            const a = String(x?.poNumber ?? "").toLowerCase();
            const b = String(x?.supplierName ?? "").toLowerCase();
            return a.includes(s) || b.includes(s);
        });
    }, [poList, q]);

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // ✅ reset to page 1 when search changes
    React.useEffect(() => {
        setPage(1);
    }, [q]);

    // ✅ clamp page if list shrinks
    React.useEffect(() => {
        setPage((p) => clamp(p, 1, totalPages));
    }, [totalPages]);

    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pageItems = React.useMemo(() => {
        return filtered.slice(startIndex, endIndex);
    }, [filtered, startIndex, endIndex]);

    return (
        <Card className="p-4 sticky top-4 self-start">
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

            {/* ✅ page size + counts */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                    {listLoading ? (
                        "Loading..."
                    ) : totalItems === 0 ? (
                        "0 results"
                    ) : (
                        <>
                            Showing{" "}
                            <span className="font-semibold text-foreground">
                {startIndex + 1}-{endIndex}
              </span>{" "}
                            of{" "}
                            <span className="font-semibold text-foreground">{totalItems}</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Size selection removed as per user request */}
                </div>
            </div>

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
                ) : totalItems === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No purchase orders available.
                    </div>
                ) : (
                    pageItems.map((po) => {
                        const active = selectedPO?.id === po.id;

                        return (
                            <button
                                key={po.id}
                                type="button"
                                // ✅ IMPORTANT: pass (poId, poNumber) so provider uses open_po directly
                                onClick={() => selectAndVerifyPO(po.id, po.poNumber)}
                                className={cn(
                                    "w-full text-left rounded-xl border border-border p-3 transition",
                                    "hover:bg-muted/40",
                                    active
                                        ? "ring-2 ring-primary/25 bg-muted/30"
                                        : "bg-background"
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

            {/* ✅ Pagination Controls */}
            {!listLoading && totalItems > 0 ? (
                <div className="mt-4 flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
                        disabled={page <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                    </Button>

                    <div className="text-xs text-muted-foreground">
                        Page{" "}
                        <span className="font-semibold text-foreground">{page}</span> of{" "}
                        <span className="font-semibold text-foreground">{totalPages}</span>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))}
                        disabled={page >= totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            ) : null}
        </Card>
    );
}
