"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { RefreshCw, FileCheck2, ChevronRight, UploadCloud } from "lucide-react";
import { usePostingOfPo } from "../providers/PostingOfPoProvider";
import type { POListItem } from "../types";

function statusBadge(status: string) {
    const s = String(status || "").toUpperCase();
    if (s === "CLOSED")
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "RECEIVED")
        return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20";
    if (s === "PARTIAL")
        return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
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
        setPageSize,

        postAllReceipts,
        posting,
    } = usePostingOfPo();

    // ✅ confirm dialog state (for the "Post" button)
    const [confirmPo, setConfirmPo] = React.useState<POListItem | null>(null);
    const confirmOpen = Boolean(confirmPo);

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return list ?? [];
        return (list ?? []).filter((x) => {
            const a = String(x?.poNumber ?? "").toLowerCase();
            const b = String(x?.supplierName ?? "").toLowerCase();
            return a.includes(s) || b.includes(s);
        });
    }, [list, q]);

    const totalPages = React.useMemo(() => {
        const n = filtered.length;
        return Math.max(1, Math.ceil(n / pageSize));
    }, [filtered.length, pageSize]);

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages, setPage]);

    const pageItems = React.useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const closeConfirm = React.useCallback(() => setConfirmPo(null), []);

    const runConfirmPost = React.useCallback(async () => {
        if (!confirmPo) return;
        // provider handles posting state + refresh + openPO
        await postAllReceipts(confirmPo.id);
        closeConfirm();
    }, [confirmPo, postAllReceipts, closeConfirm]);

    return (
        <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold">Received Purchase Orders</div>
                    <div className="text-xs text-muted-foreground">
                        Select a PO then post receipts
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

            <div className="mt-4 space-y-3">
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search PO number or supplier..."
                />

                <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                        Page {page} / {totalPages}
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={String(pageSize)}
                            onValueChange={(v) =>
                                setPageSize((Number(v) === 3 ? 3 : 5) as 3 | 5)
                            }
                        >
                            <SelectTrigger className="h-8 w-[110px]">
                                <SelectValue placeholder="Per page" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="3">3 / page</SelectItem>
                                <SelectItem value="5">5 / page</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Prev
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {listError ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {listError}
                </div>
            ) : null}

            <div className="mt-4 space-y-2">
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
                        No received purchase orders to post.
                    </div>
                ) : (
                    pageItems.map((po) => {
                        const active = selectedPO?.id === po.id;
                        const canPost = (po.unpostedReceiptsCount ?? 0) > 0;

                        return (
                            // ✅ FIX: not a <button> anymore (prevents nested button + hydration error)
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
                                    active ? "ring-2 ring-primary/25 bg-muted/30" : "bg-background"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                                <FileCheck2 className="h-4 w-4 text-muted-foreground" />
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
                                                className={cn("text-[10px] font-bold", statusBadge(po.status))}
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
                                            <span>
                        Receipts:{" "}
                                                <span className="font-semibold text-foreground">
                          {po.receiptsCount}
                        </span>
                      </span>
                                            <span>
                        Unposted:{" "}
                                                <span className="font-semibold text-foreground">
                          {po.unpostedReceiptsCount}
                        </span>
                      </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* ✅ Post button now opens confirm dialog */}
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={canPost ? "default" : "outline"}
                                            className="h-8 gap-2"
                                            disabled={!canPost || posting}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setConfirmPo(po);
                                            }}
                                        >
                                            <UploadCloud className="h-4 w-4" />
                                            Post
                                        </Button>

                                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ✅ Confirm dialog (shadcn) */}
            <AlertDialog
                open={confirmOpen}
                onOpenChange={(o) => {
                    if (!o) closeConfirm();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Post Receipt</AlertDialogTitle>
                        <AlertDialogDescription>
                            Once posted, this receipt cannot be edited. Continue?
                            {confirmPo?.poNumber ? (
                                <span className="block mt-2 text-xs text-muted-foreground">
                  PO: <span className="font-semibold">{confirmPo.poNumber}</span>
                                    {confirmPo?.supplierName ? (
                                        <>
                                            {" "}
                                            • Supplier:{" "}
                                            <span className="font-semibold">{confirmPo.supplierName}</span>
                                        </>
                                    ) : null}
                </span>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button type="button" variant="outline" disabled={posting}>
                                Cancel
                            </Button>
                        </AlertDialogCancel>

                        <AlertDialogAction asChild>
                            <Button type="button" onClick={runConfirmPost} disabled={posting}>
                                OK
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
