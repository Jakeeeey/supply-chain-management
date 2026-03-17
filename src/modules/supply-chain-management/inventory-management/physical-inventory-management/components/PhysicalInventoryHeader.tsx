"use client";

import * as React from "react";
import type { PhysicalInventoryHeaderRow, PhysicalInventoryStatus } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CalendarDays, FileText, Package2, PhilippinePeso } from "lucide-react";

import { PhysicalInventoryStatusBadge } from "./PhysicalInventoryStatusBadge";

type Props = {
    header: PhysicalInventoryHeaderRow | null;
    status: PhysicalInventoryStatus;
    canEdit: boolean;
    totalAmount: number;
    onChangePhNo: (value: string) => void;
    onChangeStockType: (value: "GOOD" | "BAD") => void;
    onChangeRemarks: (value: string) => void;
    onChangeCutoffDate: (value: string) => void;
    onChangeStartingDate: (value: string) => void;
};

function toInputDate(value: string | null | undefined): string {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.includes("T")) return trimmed.slice(0, 10);
    if (trimmed.includes(" ")) return trimmed.slice(0, 10);
    return trimmed;
}

function formatMoney(value: number): string {
    return value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDisplayDate(value: string | null | undefined): string {
    if (!value) return "Not saved yet";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function stockTypeTone(stockType: string | null | undefined): string {
    if (stockType === "BAD") {
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
}

export function PhysicalInventoryHeader(props: Props) {
    const {
        header,
        status,
        canEdit,
        totalAmount,
        onChangePhNo,
        onChangeStockType,
        onChangeRemarks,
        onChangeCutoffDate,
        onChangeStartingDate,
    } = props;

    return (
        <Card className="overflow-hidden rounded-2xl border shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-semibold tracking-tight">
                            Physical Inventory
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Create a PI session, load eligible variants, and count by UOM.
                        </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="flex min-w-[180px] items-start gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm">
                            <PhilippinePeso className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    Total Amount
                                </p>
                                <p className="truncate text-sm font-semibold tabular-nums">
                                    ₱ {formatMoney(totalAmount)}
                                </p>
                            </div>
                        </div>

                        <div className="flex min-w-[180px] items-start gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm">
                            <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    Date Encoded
                                </p>
                                <p className="truncate text-sm font-medium">
                                    {formatDisplayDate(header?.date_encoded)}
                                </p>
                            </div>
                        </div>

                        <div className="flex min-w-[180px] items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm">
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    Status
                                </p>
                                <div className="mt-1">
                                    <PhysicalInventoryStatusBadge status={status} />
                                </div>
                            </div>

                            <div
                                className={[
                                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                                    stockTypeTone(header?.stock_type),
                                ].join(" ")}
                            >
                                <Package2 className="mr-1.5 h-3.5 w-3.5" />
                                {header?.stock_type === "BAD" ? "BAD STOCK" : "GOOD STOCK"}
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="pi-ph-no">PH No</Label>
                        <Input
                            id="pi-ph-no"
                            value={header?.ph_no ?? ""}
                            onChange={(e) => onChangePhNo(e.target.value)}
                            placeholder="Enter PH No"
                            disabled={!canEdit}
                            className="font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pi-cutoff-date">Cut Off Date</Label>
                        <Input
                            id="pi-cutoff-date"
                            type="date"
                            value={toInputDate(header?.cutOff_date)}
                            onChange={(e) => onChangeCutoffDate(e.target.value)}
                            disabled={!canEdit}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pi-starting-date">Starting Date</Label>
                        <Input
                            id="pi-starting-date"
                            type="date"
                            value={toInputDate(header?.starting_date)}
                            onChange={(e) => onChangeStartingDate(e.target.value)}
                            disabled={!canEdit}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Stock Type</Label>
                        <Select
                            value={header?.stock_type === "BAD" ? "BAD" : "GOOD"}
                            onValueChange={(value) =>
                                onChangeStockType(value as "GOOD" | "BAD")
                            }
                            disabled={!canEdit}
                        >
                            <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder="Select stock type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GOOD">GOOD</SelectItem>
                                <SelectItem value="BAD">BAD</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="pi-remarks">Remarks</Label>
                    <div className="relative">
                        <FileText className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Textarea
                            id="pi-remarks"
                            placeholder="Enter remarks"
                            value={header?.remarks ?? ""}
                            onChange={(e) => onChangeRemarks(e.target.value)}
                            disabled={!canEdit}
                            rows={3}
                            className="min-h-[96px] pl-9 resize-y"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}