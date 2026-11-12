"use client";

import * as React from "react";
import type { PhysicalInventoryOffsetGroup } from "../types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, MessageSquare, Trash2 } from "lucide-react";

type Props = {
    groups: PhysicalInventoryOffsetGroup[];
    onEditGroup?: (groupId: string) => void;
    onDeleteGroup?: (groupId: string) => void;
    onUpdateRemarks?: (groupId: string, remarks: string) => void;
    disabled?: boolean;
    isPending?: boolean;
    unsavedGroupIds?: Set<string>;
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

export function OffsettingGroupsTable({
                                           groups,
                                           onEditGroup,
                                           onDeleteGroup,
                                           onUpdateRemarks,
                                           disabled = false,
                                           isPending = true,
                                           unsavedGroupIds,
                                       }: Props) {
    if (groups.length === 0) {
        return (
            <Card className="rounded-2xl border-dashed">
                <CardContent className="flex h-32 flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">No offset groups created yet.</p>
                    <p className="text-xs text-muted-foreground/60">
                        Select short and over items above to create a reconciliation group.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((group, index) => {
                const isGroupUnsaved = unsavedGroupIds?.has(group.id);

                return (
                    <Card
                        key={group.id}
                        className={`rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                            isGroupUnsaved ? "border-amber-300 dark:border-amber-700/50" : ""
                        }`}
                    >
                        <CardHeader className="pb-3 border-b bg-muted/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <span>Offset Group {index + 1}</span>
                                        {isGroupUnsaved && (
                                            <Badge
                                                variant="outline"
                                                className="border-amber-300 bg-amber-50 text-[9px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                            >
                                                Unsaved
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <p className="text-[10px] text-muted-foreground">
                                        {new Date(group.created_at.trim().replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, "")).toLocaleString("en-PH")}
                                    </p>
                                </div>
                                {isPending && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                            onClick={() => onEditGroup?.(group.id)}
                                            disabled={disabled}
                                            title="Disband group"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                                            onClick={() => onDeleteGroup?.(group.id)}
                                            disabled={disabled}
                                            title="Delete group"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 border rounded-lg bg-background p-2">
                                <div className="text-center">
                                    <p className="text-[9px] uppercase font-bold text-red-600">Short</p>
                                    <p className="text-xs font-semibold tabular-nums">₱{fmtMoney(group.short_total)}</p>
                                </div>
                                <div className="text-center border-x">
                                    <p className="text-[9px] uppercase font-bold text-emerald-600">Over</p>
                                    <p className="text-xs font-semibold tabular-nums">₱{fmtMoney(group.over_total)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Variance</p>
                                    <p className="text-xs font-bold tabular-nums">₱{fmtMoney(group.difference)}</p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="px-0 py-0 flex-1 overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto max-h-[180px] divide-y">
                                {/* Short Rows */}
                                <div className="bg-red-50/20 dark:bg-red-950/5">
                                    <div className="px-4 py-1 bg-red-100 dark:bg-red-950 sticky top-0 z-10 border-b border-red-200 dark:border-red-900/30">
                                        <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-tight">
                                            Short Items
                                        </span>
                                    </div>
                                    {group.short_rows.map((row) => (
                                        <div
                                            key={row.row_id}
                                            className="px-4 py-2 hover:bg-red-50/40 dark:hover:bg-red-950/10 transition-colors"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="text-xs font-medium truncate leading-tight"
                                                        title={row.product_label}
                                                    >
                                                        {row.product_label}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {row.unit_shortcut || row.unit_name || "PCS"} • Diff: ₱
                                                        {fmtMoney(Math.abs(row.difference_cost ?? 0))}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-bold text-red-700 dark:text-red-400">
                                                        -{fmtQty(Math.abs(row.variance))}
                                                    </p>
                                                    <p className="text-[10px] font-medium mt-0.5">
                                                        ₱{fmtMoney(row.selection_amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Over Rows */}
                                <div className="bg-emerald-50/20 dark:bg-emerald-950/5">
                                    <div className="px-4 py-1 bg-emerald-100 dark:bg-emerald-950 sticky top-0 z-10 border-b border-emerald-200 dark:border-emerald-900/30">
                                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
                                            Over Items
                                        </span>
                                    </div>
                                    {group.over_rows.map((row) => (
                                        <div
                                            key={row.row_id}
                                            className="px-4 py-2 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-colors"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="text-xs font-medium truncate leading-tight"
                                                        title={row.product_label}
                                                    >
                                                        {row.product_label}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {row.unit_shortcut || row.unit_name || "PCS"} • Diff: ₱
                                                        {fmtMoney(Math.abs(row.difference_cost ?? 0))}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                        +{fmtQty(Math.abs(row.variance))}
                                                    </p>
                                                    <p className="text-[10px] font-medium mt-0.5">
                                                        ₱{fmtMoney(row.selection_amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 bg-muted/20 border-t mt-auto space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">
                                        Net Difference
                                    </span>
                                    <span
                                        className={`text-sm font-black ${
                                            group.difference === 0
                                                ? "text-foreground"
                                                : group.difference > 0
                                                  ? "text-red-700 dark:text-red-400"
                                                  : "text-emerald-700 dark:text-emerald-400"
                                        }`}
                                    >
                                        ₱{fmtMoney(group.difference)}
                                    </span>
                                </div>

                                {/* Dedicated Remarks Space */}
                                <div className="pt-2 border-t border-dashed">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            Remarks
                                        </span>
                                    </div>
                                    <Textarea
                                        placeholder="Enter offset group remarks..."
                                        value={group.remarks || ""}
                                        onChange={(e) => onUpdateRemarks?.(group.id, e.target.value)}
                                        disabled={disabled || !isPending}
                                        rows={2}
                                        className="text-xs min-h-[56px] resize-y bg-background break-words disabled:opacity-75 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
