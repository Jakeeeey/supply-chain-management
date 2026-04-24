"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RefreshCw, FileCheck2, ChevronRight, ChevronLeft } from "lucide-react";
import { usePostingOfPo } from "../providers/PostingOfPoProvider";

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

export function PostingPOList() {
    const {
        list,
        listLoading,
        listError,
        refreshList,
        openPO,
        selectedPO,
        q,
        setQ,
        page,
        setPage,
        pageSize,
    } = usePostingOfPo();

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return list ?? [];
        return (list ?? []).filter((x) => {
            const a = String(x?.poNumber ?? "").toLowerCase();
            const b = String(x?.supplierName ?? "").toLowerCase();
            return a.includes(s) || b.includes(s);
        });
    }, [list, q]);

    const totalPages = React.useMemo(
        () => Math.max(1, Math.ceil(filtered.length / pageSize)),
        [filtered.length, pageSize]
    );

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages, setPage]);

    const pageItems = React.useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    return (
        <div className="min-w-0 border border-border rounded-xl bg-background shadow-sm overflow-hidden flex flex-col sticky top-4 self-start">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                    <div className="text-sm font-black text-foreground uppercase tracking-tight">
                        Received Purchase Orders
                    </div>
                    <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {filtered.length} filtered / {list?.length ?? 0} total
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-[10px] font-black uppercase"
                    onClick={refreshList}
                >
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    Refresh
                </Button>
            </div>

            <div className="p-3 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search PO number or supplier..."
                    className="h-10 rounded-xl shadow-sm border-border bg-background text-xs"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                            10 Rows per page
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mr-1">
                            {page} of {totalPages}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={cn(
                "p-3 space-y-2",
                listLoading ? "opacity-70 pointer-events-none" : ""
            )}>
                {listError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                        {listError}
                    </div>
                ) : null}

                {listLoading ? (
                    <>
                        {Array.from({ length: pageSize }).map((_, i) => (
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
                ) : pageItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No received purchase orders.
                    </div>
                ) : (
                    pageItems.map((po) => {
                        const active = selectedPO?.id === po.id;

                        return (
                            <div
                                key={po.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => openPO(po.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openPO(po.id);
                                    }
                                }}
                                className={cn(
                                    "w-full text-left rounded-xl border border-border p-3 transition outline-none",
                                    "hover:bg-muted/40",
                                    active ? "ring-2 ring-primary/40 border-primary/50 bg-muted/30 shadow-sm" : "bg-background"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                                                <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-[13px] font-black text-foreground uppercase tracking-tight">
                                                    {po.poNumber}
                                                </div>
                                                <div className="truncate text-[11px] text-muted-foreground font-medium">
                                                    {po.supplierName}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black">
                                            <Badge
                                                variant="secondary"
                                                className={cn("text-[9px] font-black uppercase tracking-tight", statusBadge(po.status))}
                                            >
                                                {statusLabel(po.status)}
                                            </Badge>
                                            <span className="bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                                                {po.itemsCount} ITEMS
                                            </span>
                                            <span className="bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 text-primary">
                                                {po.unpostedReceiptsCount} UNPOSTED
                                            </span>
                                        </div>

                                        {po.status === "PARTIAL_POSTED" && (
                                            <div className="mt-2 text-[9px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                <div className="h-1 w-1 rounded-full bg-current animate-pulse" />
                                                PARTIALLY POSTED — AWAITING RECEIVING
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center h-9 self-center">
                                        <ChevronRight className={cn("h-4 w-4 transition-transform", active ? "text-primary translate-x-0.5" : "text-muted-foreground")} />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="px-4 py-2 border-t border-border bg-muted/20">
                <div className="text-[9px] font-black uppercase text-muted-foreground text-center tracking-widest">
                    Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} total POs
                </div>
            </div>
        </div>
    );
}