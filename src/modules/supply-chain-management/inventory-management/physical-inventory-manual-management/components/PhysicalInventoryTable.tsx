// src/modules/supply-chain-management/physical-inventory-manual-management/components/PhysicalInventoryTable.tsx
"use client";

import * as React from "react";
import type {
    GroupedPhysicalInventoryChildRow,
    GroupedPhysicalInventoryRow,
} from "../types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
    rows: GroupedPhysicalInventoryRow[];
    isLoading: boolean;
    canEdit: boolean;
    onPhysicalCountChange: (row: GroupedPhysicalInventoryChildRow, value: string) => void;
    onPhysicalCountBlur: (row: GroupedPhysicalInventoryChildRow) => void;
};

function fmtQty(value: number): string {
    return Number.isFinite(value)
        ? value.toLocaleString("en-PH", { maximumFractionDigits: 0 })
        : "0";
}

function fmtMoney(value: number): string {
    return value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function qtyTone(value: number): string {
    if (value > 0) {
        return "text-emerald-700 dark:text-emerald-300";
    }
    if (value < 0) {
        return "text-red-700 dark:text-red-300";
    }
    return "text-muted-foreground";
}

function moneyTone(value: number): string {
    if (value > 0) {
        return "text-emerald-700 dark:text-emerald-300";
    }
    if (value < 0) {
        return "text-red-700 dark:text-red-300";
    }
    return "text-foreground";
}

function summaryChipClass(value: number): string {
    if (value > 0) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";
    }
    if (value < 0) {
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300";
    }
    return "border-border bg-background text-foreground";
}

function EmptyState() {
    return (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
            <div className="space-y-2">
                <p className="text-sm font-medium">No loaded products yet</p>
                <p className="text-sm text-muted-foreground">
                    Complete the filters, then click Load Products.
                </p>
            </div>
        </div>
    );
}

function LoadingState() {
    return (

        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="rounded-2xl border shadow-sm">
                    <CardContent className="space-y-3 pt-6">
                        <Skeleton className="h-5 w-64" />
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-28 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

type SummaryChipProps = {
    label: string;
    value: string;
    numericValue: number;
};

function SummaryChip({ label, value, numericValue }: SummaryChipProps) {
    return (
        <div
            className={[
                "rounded-full border px-3 py-1.5 text-xs shadow-sm",
                summaryChipClass(numericValue),
            ].join(" ")}
        >
            <span className="mr-1.5 text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
        </div>
    );
}

export function PhysicalInventoryTable(props: Props) {
    const {
        rows,
        isLoading,
        canEdit,
        onPhysicalCountChange,
        onPhysicalCountBlur,
    } = props;

    if (isLoading) {
        return <LoadingState />;
    }

    if (!rows.length) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-4">
            {rows.map((group) => (
                <Card key={group.family_key} className="overflow-hidden rounded-2xl border shadow-sm">
                    <CardContent className="p-0">
                        <div className="border-b bg-muted/20 px-5 py-4">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <h3 className="truncate text-base font-semibold">
                                        {group.base_product_name}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        <span>Code: {group.base_product_code ?? "—"}</span>
                                        <span>Barcode: {group.base_barcode ?? "—"}</span>
                                        <span>Category: {group.category_name ?? "—"}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <SummaryChip
                                        label="System Base"
                                        value={fmtQty(group.total_system_count_base)}
                                        numericValue={group.total_system_count_base}
                                    />
                                    <SummaryChip
                                        label="Physical Base"
                                        value={fmtQty(group.total_physical_count_base)}
                                        numericValue={group.total_physical_count_base}
                                    />
                                    <SummaryChip
                                        label="Variance Base"
                                        value={fmtQty(group.total_variance_base)}
                                        numericValue={group.total_variance_base}
                                    />
                                    <SummaryChip
                                        label="Diff Cost"
                                        value={`₱ ${fmtMoney(group.total_difference_cost)}`}
                                        numericValue={group.total_difference_cost}
                                    />
                                    <SummaryChip
                                        label="Amount"
                                        value={`₱ ${fmtMoney(group.total_amount)}`}
                                        numericValue={group.total_amount}
                                    />
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="w-full">
                            <div className="min-w-[1100px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-background">
                                            <TableHead>UOM</TableHead>
                                            <TableHead className="text-right">UOM Count</TableHead>
                                            <TableHead className="text-right">System Count</TableHead>
                                            <TableHead className="text-right">Physical Count</TableHead>
                                            <TableHead className="text-right">Variance</TableHead>
                                            <TableHead className="text-right">Variance Base</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Difference Cost</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {group.rows.map((row) => {
                                            const varianceClass = qtyTone(row.variance);
                                            const varianceBaseClass = qtyTone(row.variance_base);
                                            const amountClass = moneyTone(row.amount);
                                            const diffCostClass = moneyTone(row.difference_cost);
                                            return (
                                                <TableRow key={row.product_id} className="hover:bg-muted/20">
                                                    <TableCell className="font-medium">
                                                        {row.unit_name ?? row.unit_shortcut ?? "—"}
                                                    </TableCell>

                                                    <TableCell className="text-right font-medium tabular-nums">
                                                        {fmtQty(row.unit_count)}
                                                    </TableCell>

                                                    <TableCell className="text-right tabular-nums">
                                                        {fmtQty(row.system_count)}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Input
                                                            inputMode="decimal"
                                                            className="ml-auto w-28 border-border bg-background text-right font-semibold tabular-nums shadow-sm focus-visible:ring-2"
                                                            value={String(row.physical_count)}
                                                            onChange={(e) =>
                                                                onPhysicalCountChange(row, e.target.value)
                                                            }
                                                            onBlur={() => onPhysicalCountBlur(row)}
                                                            disabled={!canEdit}
                                                            placeholder="0"
                                                        />
                                                    </TableCell>

                                                    <TableCell
                                                        className={`text-right font-medium tabular-nums ${varianceClass}`}
                                                    >
                                                        {fmtQty(row.variance)}
                                                    </TableCell>

                                                    <TableCell
                                                        className={`text-right font-medium tabular-nums ${varianceBaseClass}`}
                                                    >
                                                        {fmtQty(row.variance_base)}
                                                    </TableCell>

                                                    <TableCell className="text-right tabular-nums">
                                                        ₱ {fmtMoney(row.unit_price ?? 0)}
                                                    </TableCell>

                                                    <TableCell
                                                        className={`text-right font-medium tabular-nums ${amountClass}`}
                                                    >
                                                        ₱ {fmtMoney(row.amount)}
                                                    </TableCell>

                                                    <TableCell
                                                        className={`text-right font-medium tabular-nums ${diffCostClass}`}
                                                    >
                                                        ₱ {fmtMoney(row.difference_cost)}
                                                    </TableCell>

                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}