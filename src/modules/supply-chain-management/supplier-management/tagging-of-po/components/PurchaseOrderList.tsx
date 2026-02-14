"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TaggablePOListItem } from "../types";
import { CalendarDays, Barcode } from "lucide-react";

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

type Props = {
    items: TaggablePOListItem[];
    loading: boolean;
    onTagItems: (id: string) => void;
};

const PAGE_SIZE = 3;

function pct(tagged: number, total: number) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((tagged / total) * 100)));
}

function getPaginationModel(totalPages: number, currentPage: number) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1) as Array<number | "ellipsis">;
    }

    const items: Array<number | "ellipsis"> = [];
    items.push(1);

    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);

    if (left > 2) items.push("ellipsis");

    for (let p = left; p <= right; p++) items.push(p);

    if (right < totalPages - 1) items.push("ellipsis");

    items.push(totalPages);
    return items;
}

export default function PurchaseOrderList({ items, loading, onTagItems }: Props) {
    const [page, setPage] = React.useState(1);

    const totalPages = React.useMemo(
        () => Math.max(1, Math.ceil((items?.length ?? 0) / PAGE_SIZE)),
        [items?.length]
    );

    React.useEffect(() => {
        setPage((p) => Math.min(Math.max(1, p), totalPages));
    }, [totalPages, items?.length]);

    const paginated = React.useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return (items ?? []).slice(start, start + PAGE_SIZE);
    }, [items, page]);

    const paginationModel = React.useMemo(
        () => getPaginationModel(totalPages, page),
        [totalPages, page]
    );

    const goToPage = React.useCallback(
        (p: number) => setPage(Math.min(Math.max(1, p), totalPages)),
        [totalPages]
    );

    const onPrev = React.useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
    const onNext = React.useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

    return (
        <div className="min-w-0 space-y-3">
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-border bg-background shadow-sm p-4"
                        >
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-56" />
                                    <Skeleton className="h-2 w-full" />
                                </div>
                                <Skeleton className="h-10 w-28 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
                    No purchase orders available for tagging.
                </div>
            ) : (
                <>
                    {paginated.map((po) => {
                        const progress = pct(po.taggedItems, po.totalItems);

                        return (
                            <div
                                key={po.id}
                                className={cn(
                                    "rounded-xl border border-border bg-background shadow-sm p-4",
                                    "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                                )}
                            >
                                <div className="flex items-start gap-4 min-w-0">
                                    <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                                        <div className="text-xs font-black text-primary">PO</div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-base font-black truncate text-foreground">
                                            {po.poNumber}
                                        </div>

                                        <div className="text-sm text-muted-foreground truncate">
                                            {po.supplierName}
                                        </div>

                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                            <CalendarDays className="h-4 w-4" />
                                            <span>{po.date}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 sm:px-6">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="font-medium">Processing Progress</span>
                                        <span className="font-black text-primary">
                                            {po.taggedItems} / {po.totalItems} Items
                                        </span>
                                    </div>

                                    <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "text-[10px] font-black",
                                                po.status === "completed"
                                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                                    : "bg-primary/15 text-primary"
                                            )}
                                        >
                                            {po.status === "completed" ? "Completed" : "Tagging in Progress"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 rounded-xl font-black gap-2"
                                        onClick={() => onTagItems(po.id)}
                                    >
                                        <Barcode className="h-4 w-4" />
                                        Tag Items
                                    </Button>
                                </div>
                            </div>
                        );
                    })}

                    {/* ✅ Pagination */}
                    {items.length > PAGE_SIZE ? (
                        <div className="pt-1">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            aria-disabled={page === 1}
                                            className={cn(page === 1 ? "pointer-events-none opacity-50" : "")}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (page === 1) return;
                                                onPrev();
                                            }}
                                        />
                                    </PaginationItem>

                                    {paginationModel.map((it, idx) => {
                                        if (it === "ellipsis") {
                                            return (
                                                <PaginationItem key={`el-${idx}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            );
                                        }

                                        const p = it;
                                        const active = p === page;

                                        return (
                                            <PaginationItem key={p}>
                                                <PaginationLink
                                                    href="#"
                                                    isActive={active}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        goToPage(p);
                                                    }}
                                                >
                                                    {p}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}

                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            aria-disabled={page >= totalPages}
                                            className={cn(page >= totalPages ? "pointer-events-none opacity-50" : "")}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (page >= totalPages) return;
                                                onNext();
                                            }}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
