//src/modules/supply-chain-management/physical-inventory-list/components/PhysicalInventoryListTable.tsx
"use client";

import * as React from "react";
import type { PhysicalInventoryListRow } from "../types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

type Props = {
    rows: PhysicalInventoryListRow[];
    isLoading: boolean;
    selectedHeaderId?: number | null;
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onOpen: (row: PhysicalInventoryListRow) => void;
};

function fmtDate(value: string | null): string {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function fmtMoney(value: number | null): string {
    return (value ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function StatusBadge({ status }: { status: PhysicalInventoryListRow["status"] }) {
    if (status === "Committed") {
        return <Badge className="bg-emerald-600 hover:bg-emerald-600">Committed</Badge>;
    }

    if (status === "Cancelled") {
        return <Badge variant="destructive">Cancelled</Badge>;
    }

    if (status === "Pending") {
        return <Badge className="bg-amber-500 hover:bg-amber-500">Pending</Badge>;
    }

    return <Badge variant="secondary">Draft</Badge>;
}

function StockTypeBadge({ stockType }: { stockType: string | null }) {
    if (stockType === "BAD") {
        return (
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                BAD STOCK
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            GOOD STOCK
        </Badge>
    );
}

function LoadingState() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="rounded-2xl border shadow-sm">
                    <CardContent className="space-y-3 pt-5">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-72" />
                        <Skeleton className="h-4 w-56" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
            <div className="space-y-2">
                <p className="text-sm font-medium">No Physical Inventory records found</p>
                <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters.
                </p>
            </div>
        </div>
    );
}

export function PhysicalInventoryListTable(props: Props) {
    const {
        rows,
        isLoading,
        selectedHeaderId = null,
        page,
        pageSize,
        totalCount,
        onPageChange,
        onOpen,
    } = props;

    if (isLoading) {
        return <LoadingState />;
    }

    if (!rows.length) {
        return <EmptyState />;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endIndex = Math.min(page * pageSize, totalCount);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{startIndex}</span> to{" "}
                    <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalCount}</span> records
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Prev
                    </Button>

                    <div className="min-w-[90px] text-center text-sm font-medium">
                        Page {page} of {totalPages}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                    >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {rows.map((row) => {
                    const isSelected = selectedHeaderId === row.id;

                    return (
                        <Card
                            key={row.id}
                            className={[
                                "cursor-pointer rounded-2xl border shadow-sm transition-all",
                                "hover:border-primary/40 hover:bg-muted/20",
                                isSelected ? "border-primary bg-muted/30 ring-1 ring-primary/20" : "",
                            ].join(" ")}
                            onClick={() => onOpen(row)}
                        >
                            <CardContent className="pt-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-base font-semibold tracking-tight">
                                                {row.ph_no ?? "—"}
                                            </h3>
                                            <StockTypeBadge stockType={row.stock_type} />
                                        </div>

                                        <p className="truncate text-sm text-muted-foreground">
                                            {row.supplier_name ?? "—"}
                                        </p>

                                        <p className="truncate text-sm text-muted-foreground">
                                            {row.branch_name ?? "—"}
                                        </p>

                                        <p className="truncate text-xs text-muted-foreground">
                                            Category: {row.category_name ?? "—"}
                                        </p>

                                        <p className="truncate text-xs text-muted-foreground">
                                            Start: {fmtDate(row.starting_date)} • Cutoff: {fmtDate(row.cutOff_date)}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                        <StatusBadge status={row.status} />

                                        <div>
                                            <p className="text-xs text-muted-foreground">Total</p>
                                            <p className="text-lg font-semibold tabular-nums">
                                                ₱{fmtMoney(row.total_amount)}
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant={isSelected ? "default" : "outline"}
                                            size="sm"
                                            className="cursor-pointer"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onOpen(row);
                                            }}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            {isSelected ? "Opened" : "Open"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}