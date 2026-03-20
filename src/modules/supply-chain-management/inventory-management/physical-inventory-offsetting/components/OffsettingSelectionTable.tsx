"use client";

import * as React from "react";

import type { OffsettingSelectableRow } from "../types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Props = {
    title: string;
    direction: "SHORT" | "OVER";
    rows: OffsettingSelectableRow[];
    selectedIds: number[];
    disabled?: boolean;
    onToggleRow: (rowId: number, checked: boolean) => void;
    onToggleAll: (checked: boolean) => void;
};

function fmtMoney(value: number): string {
    return value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtQty(value: number): string {
    return value.toLocaleString("en-PH", {
        maximumFractionDigits: 2,
    });
}

export function OffsettingSelectionTable({
                                             title,
                                             direction,
                                             rows,
                                             selectedIds,
                                             disabled = false,
                                             onToggleRow,
                                             onToggleAll,
                                         }: Props) {
    const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
    const allChecked = rows.length > 0 && rows.every((row) => selectedSet.has(row.row_id));
    const someChecked = rows.some((row) => selectedSet.has(row.row_id));

    const selectedCount = rows.filter((row) => selectedSet.has(row.row_id)).length;

    return (
        <Card className="rounded-2xl">
            <CardHeader className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-sm">{title}</CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {rows.length} open row{rows.length === 1 ? "" : "s"} • {selectedCount} selected
                        </p>
                    </div>

                    <Badge
                        variant="outline"
                        className={`h-5 rounded-full px-2 text-[10px] ${
                            direction === "SHORT"
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                        }`}
                    >
                        {direction}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-0">
                <div className="overflow-hidden rounded-xl border">
                    <ScrollArea className="h-[320px] w-full whitespace-nowrap">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background">
                                <TableRow className="h-9">
                                    <TableHead className="w-[40px] py-2">
                                        <Checkbox
                                            checked={allChecked || (someChecked ? "indeterminate" : false)}
                                            disabled={disabled || rows.length === 0}
                                            onCheckedChange={(checked) => {
                                                onToggleAll(Boolean(checked));
                                            }}
                                            aria-label={`Select all ${direction.toLowerCase()} rows`}
                                        />
                                    </TableHead>
                                    <TableHead className="py-2 text-xs">Product</TableHead>
                                    <TableHead className="py-2 text-xs">UOM</TableHead>
                                    <TableHead className="py-2 text-right text-xs">Variance</TableHead>
                                    <TableHead className="py-2 text-right text-xs">Diff Cost</TableHead>
                                    <TableHead className="py-2 text-right text-xs">Selection Total</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-20 text-center text-xs text-muted-foreground"
                                        >
                                            No open {direction.toLowerCase()} rows.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => (
                                        <TableRow key={row.row_id} className="h-11">
                                            <TableCell className="py-2">
                                                <Checkbox
                                                    checked={selectedSet.has(row.row_id)}
                                                    disabled={disabled}
                                                    onCheckedChange={(checked) => {
                                                        onToggleRow(row.row_id, Boolean(checked));
                                                    }}
                                                    aria-label={`Select ${row.product_label}`}
                                                />
                                            </TableCell>
                                            <TableCell className="py-2 align-top">
                                                <div className="min-w-0">
                                                    <p className="max-w-[320px] truncate text-xs font-medium leading-4">
                                                        {row.product_label}
                                                    </p>
                                                    <p className="text-[10px] leading-4 text-muted-foreground">
                                                        Detail #{row.detail_id || row.product_id}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs">
                                                {row.unit_shortcut || row.unit_name || "PCS"}
                                            </TableCell>
                                            <TableCell
                                                className={`py-2 text-right text-xs font-medium ${
                                                    direction === "SHORT"
                                                        ? "text-red-700 dark:text-red-300"
                                                        : "text-emerald-700 dark:text-emerald-300"
                                                }`}
                                            >
                                                {fmtQty(Math.abs(row.variance))}
                                            </TableCell>
                                            <TableCell
                                                className={`py-2 text-right text-xs font-medium ${
                                                    direction === "SHORT"
                                                        ? "text-red-700 dark:text-red-300"
                                                        : "text-emerald-700 dark:text-emerald-300"
                                                }`}
                                            >
                                                ₱ {fmtMoney(Math.abs(row.difference_cost ?? 0))}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs font-semibold">
                                                ₱ {fmtMoney(row.selection_amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}