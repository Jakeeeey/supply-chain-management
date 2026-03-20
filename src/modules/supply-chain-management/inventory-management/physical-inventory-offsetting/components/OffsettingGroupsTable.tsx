"use client";

import type { PhysicalInventoryOffsetGroup } from "../types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    groups: PhysicalInventoryOffsetGroup[];
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

export function OffsettingGroupsTable({ groups }: Props) {
    return (
        <Card className="rounded-2xl">
            <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm">Offset Groups</CardTitle>
                <p className="text-xs text-muted-foreground">
                    Rows already grouped for reconciliation are consumed and can no longer be reused.
                </p>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-0">
                <div className="overflow-hidden rounded-xl border">
                    <ScrollArea className="h-[220px] w-full whitespace-nowrap">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background">
                                <TableRow className="h-9">
                                    <TableHead className="py-2 text-xs">Group</TableHead>
                                    <TableHead className="py-2 text-xs">Short Rows</TableHead>
                                    <TableHead className="py-2 text-xs">Over Rows</TableHead>
                                    <TableHead className="py-2 text-right text-xs">Short Total</TableHead>
                                    <TableHead className="py-2 text-right text-xs">Over Total</TableHead>
                                    <TableHead className="py-2 text-right text-xs">Difference</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {groups.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-20 text-center text-xs text-muted-foreground"
                                        >
                                            No offset groups created yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groups.map((group, index) => (
                                        <TableRow key={group.id}>
                                            <TableCell className="py-2 align-top">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium">Group {index + 1}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {new Date(group.created_at).toLocaleString("en-PH")}
                                                    </p>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-2 align-top">
                                                <div className="flex max-w-[420px] flex-wrap gap-1">
                                                    {group.short_rows.map((row) => (
                                                        <Badge
                                                            key={`${group.id}-short-${row.row_id}`}
                                                            variant="outline"
                                                            className="rounded-full border-red-200 bg-red-50 px-2 py-0 text-[10px] text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                                                        >
                                                            {`${row.product_label} (${fmtQty(Math.abs(row.variance))} ${row.unit_shortcut || row.unit_name || "PCS"})`}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-2 align-top">
                                                <div className="flex max-w-[420px] flex-wrap gap-1">
                                                    {group.over_rows.map((row) => (
                                                        <Badge
                                                            key={`${group.id}-over-${row.row_id}`}
                                                            variant="outline"
                                                            className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                                                        >
                                                            {`${row.product_label} (${fmtQty(Math.abs(row.variance))} ${row.unit_shortcut || row.unit_name || "PCS"})`}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-2 text-right text-xs font-medium text-red-700 dark:text-red-300">
                                                ₱ {fmtMoney(group.short_total)}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                ₱ {fmtMoney(group.over_total)}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs font-semibold">
                                                ₱ {fmtMoney(group.difference)}
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