"use client";

import * as React from "react";
import { toast } from "sonner";

import type { PhysicalInventoryHeaderRow } from "../physical-inventory-management/types";
import type {
    OffsettingSelectableRow,
    PhysicalInventoryOffsetGroup,
    PhysicalInventoryOffsettingReportMeta,
} from "./types";
import {
    commitPhysicalInventoryFromOffsetting,
    loadPhysicalInventoryOffsettingSnapshot,
} from "./providers/fetchProvider";
import {
    canEditPhysicalInventory,
    derivePhysicalInventoryStatus,
} from "../physical-inventory-management/utils/compute";
import { printPhysicalInventoryOffsettingReport } from "./utils/printPhysicalInventoryOffsettingReport";

import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardList,
    GitCompareArrows,
    Loader2,
    Plus,
    Printer,
    RefreshCcw,
} from "lucide-react";

import { OffsettingGroupsTable } from "./components/OffsettingGroupsTable";
import { OffsettingSelectionTable } from "./components/OffsettingSelectionTable";

type Props = {
    phId: number;
    onBack?: () => void;
    onCommitted?: (header: PhysicalInventoryHeaderRow) => void;
    currentUser?: { id: number; name: string };
};

function fmtMoney(value: number): string {
    return value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function createOffsetGroupId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `offset-group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PhysicalInventoryOffsettingModule({
                                                      phId,
                                                      onBack,
                                                      onCommitted,
                                                      currentUser,
                                                  }: Props) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [isCommitting, setIsCommitting] = React.useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);
    const [openCommitDialog, setOpenCommitDialog] = React.useState(false);

    const [header, setHeader] = React.useState<PhysicalInventoryHeaderRow | null>(null);
    const [varianceRows, setVarianceRows] = React.useState<OffsettingSelectableRow[]>([]);
    const [offsetGroups, setOffsetGroups] = React.useState<PhysicalInventoryOffsetGroup[]>([]);
    const [reportMeta, setReportMeta] = React.useState<PhysicalInventoryOffsettingReportMeta>({
        branch_name: "",
        supplier_name: "",
        category_name: "",
        encoder_name: "",
    });

    const [selectedShortIds, setSelectedShortIds] = React.useState<number[]>([]);
    const [selectedOverIds, setSelectedOverIds] = React.useState<number[]>([]);

    const consumedRowIds = React.useMemo(() => {
        return new Set(
            offsetGroups.flatMap((group) => [
                ...group.short_rows.map((row) => row.row_id),
                ...group.over_rows.map((row) => row.row_id),
            ]),
        );
    }, [offsetGroups]);

    const allShortRows = React.useMemo(() => {
        return varianceRows.filter((row) => row.offset_direction === "SHORT");
    }, [varianceRows]);

    const allOverRows = React.useMemo(() => {
        return varianceRows.filter((row) => row.offset_direction === "OVER");
    }, [varianceRows]);

    const openShortRows = React.useMemo(() => {
        return allShortRows.filter((row) => !consumedRowIds.has(row.row_id));
    }, [allShortRows, consumedRowIds]);

    const openOverRows = React.useMemo(() => {
        return allOverRows.filter((row) => !consumedRowIds.has(row.row_id));
    }, [allOverRows, consumedRowIds]);

    const selectedShortRows = React.useMemo(() => {
        const selected = new Set(selectedShortIds);
        return openShortRows.filter((row) => selected.has(row.row_id));
    }, [openShortRows, selectedShortIds]);

    const selectedOverRows = React.useMemo(() => {
        const selected = new Set(selectedOverIds);
        return openOverRows.filter((row) => selected.has(row.row_id));
    }, [openOverRows, selectedOverIds]);

    const selectedShortTotal = React.useMemo(() => {
        return selectedShortRows.reduce((acc, row) => acc + row.selection_amount, 0);
    }, [selectedShortRows]);

    const selectedOverTotal = React.useMemo(() => {
        return selectedOverRows.reduce((acc, row) => acc + row.selection_amount, 0);
    }, [selectedOverRows]);

    const selectedDifference = React.useMemo(() => {
        return selectedShortTotal - selectedOverTotal;
    }, [selectedOverTotal, selectedShortTotal]);

    const unmatchedShortTotal = React.useMemo(() => {
        return openShortRows.reduce((acc, row) => acc + row.selection_amount, 0);
    }, [openShortRows]);

    const unmatchedOverTotal = React.useMemo(() => {
        return openOverRows.reduce((acc, row) => acc + row.selection_amount, 0);
    }, [openOverRows]);

    const loadSnapshot = React.useCallback(async () => {
        try {
            setIsLoading(true);

            const snapshot = await loadPhysicalInventoryOffsettingSnapshot(phId);

            setHeader(snapshot.header);
            setVarianceRows(snapshot.rows);
            setReportMeta(snapshot.reportMeta);
            setSelectedShortIds([]);
            setSelectedOverIds([]);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to load Physical Inventory offsetting data.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, [phId]);

    React.useEffect(() => {
        void loadSnapshot();
    }, [loadSnapshot]);

    const handleToggleShortRow = React.useCallback((rowId: number, checked: boolean) => {
        setSelectedShortIds((prev) =>
            checked ? [...new Set([...prev, rowId])] : prev.filter((id) => id !== rowId),
        );
    }, []);

    const handleToggleOverRow = React.useCallback((rowId: number, checked: boolean) => {
        setSelectedOverIds((prev) =>
            checked ? [...new Set([...prev, rowId])] : prev.filter((id) => id !== rowId),
        );
    }, []);

    const handleToggleAllShort = React.useCallback(
        (checked: boolean) => {
            setSelectedShortIds(checked ? openShortRows.map((row) => row.row_id) : []);
        },
        [openShortRows],
    );

    const handleToggleAllOver = React.useCallback(
        (checked: boolean) => {
            setSelectedOverIds(checked ? openOverRows.map((row) => row.row_id) : []);
        },
        [openOverRows],
    );

    const handleCreateOffsetGroup = React.useCallback(async () => {
        if (!header?.id) {
            toast.error("Physical Inventory header is missing.");
            return;
        }

        if (!selectedShortRows.length) {
            toast.error("Select at least one SHORT row.");
            return;
        }

        if (!selectedOverRows.length) {
            toast.error("Select at least one OVER row.");
            return;
        }

        try {
            setIsCreatingGroup(true);

            const nextGroup: PhysicalInventoryOffsetGroup = {
                id: createOffsetGroupId(),
                ph_id: header.id,
                created_at: new Date().toISOString(),
                short_rows: selectedShortRows,
                over_rows: selectedOverRows,
                short_total: selectedShortTotal,
                over_total: selectedOverTotal,
                difference: selectedDifference,
            };

            setOffsetGroups((prev) => [...prev, nextGroup]);
            setSelectedShortIds([]);
            setSelectedOverIds([]);

            toast.success("Offset group created.");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to create offset group.";
            toast.error(message);
        } finally {
            setIsCreatingGroup(false);
        }
    }, [
        header?.id,
        selectedDifference,
        selectedOverRows,
        selectedOverTotal,
        selectedShortRows,
        selectedShortTotal,
    ]);

    const handlePrintReport = React.useCallback(() => {
        if (!header) {
            toast.error("Physical Inventory header is missing.");
            return;
        }

        try {
            printPhysicalInventoryOffsettingReport({
                header,
                reportMeta,
                allShortRows,
                allOverRows,
                unresolvedShortRows: openShortRows,
                unresolvedOverRows: openOverRows,
                offsetGroups,
                preparedBy: currentUser?.name || reportMeta.encoder_name,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to print the reconciliation report.";
            toast.error(message);
        }
    }, [
        allOverRows,
        allShortRows,
        header,
        offsetGroups,
        openOverRows,
        openShortRows,
        reportMeta,
        currentUser?.name,
    ]);

    const handleCommit = React.useCallback(async () => {
        if (!header?.id) {
            toast.error("Physical Inventory header is missing.");
            return;
        }

        try {
            setIsCommitting(true);

            const committedHeader = await commitPhysicalInventoryFromOffsetting(header.id);

            setHeader(committedHeader);
            setOpenCommitDialog(false);
            onCommitted?.(committedHeader);

            toast.success("Physical Inventory committed successfully.");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to commit Physical Inventory.";
            toast.error(message);
        } finally {
            setIsCommitting(false);
        }
    }, [header?.id, onCommitted]);

    const handleEditOffsetGroup = React.useCallback(
        (groupId: string) => {
            const group = offsetGroups.find((g) => g.id === groupId);
            if (!group) return;

            // Restore products to selection
            setSelectedShortIds((prev) => [
                ...new Set([...prev, ...group.short_rows.map((r) => r.row_id)]),
            ]);
            setSelectedOverIds((prev) => [
                ...new Set([...prev, ...group.over_rows.map((r) => r.row_id)]),
            ]);

            // Remove group
            setOffsetGroups((prev) => prev.filter((g) => g.id !== groupId));
            toast.info("Group disbanded. Items restored to selection pool.");
        },
        [offsetGroups],
    );

    const handleDeleteOffsetGroup = React.useCallback((groupId: string) => {
        setOffsetGroups((prev) => prev.filter((g) => g.id !== groupId));
        toast.info("Offset group removed.");
    }, []);

    const isPending = React.useMemo(() => {
        if (!header) return false;
        return canEditPhysicalInventory({
            isCancelled: header.isCancelled,
            isComitted: header.isComitted,
        });
    }, [header]);

    const statusText = React.useMemo(() => {
        if (!header) return "";
        return derivePhysicalInventoryStatus({
            isCancelled: header.isCancelled,
            isComitted: header.isComitted,
        });
    }, [header]);

    const canCreateGroup =
        selectedShortRows.length > 0 &&
        selectedOverRows.length > 0 &&
        !isCreatingGroup &&
        isPending;

    const canCommit = Boolean(header?.id) && !isLoading && !isCommitting && isPending;

    if (isLoading || !header) {
        return (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border bg-background">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading Physical Inventory offsetting module...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="rounded-2xl border bg-background px-3 py-2 shadow-sm sm:px-4">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl border bg-muted/40 p-1.5">
                                <GitCompareArrows className="h-4 w-4" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold tracking-tight">
                                    Physical Inventory Offsetting
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Reconcile SHORT and OVER rows through manual multi-row grouping before final commit.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {onBack ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={onBack}
                            >
                                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                                Back
                            </Button>
                        ) : null}

                        <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => {
                                void loadSnapshot();
                            }}
                            disabled={isLoading || isCommitting}
                        >
                            <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                            Refresh
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={handlePrintReport}
                            disabled={isLoading || isCommitting}
                        >
                            <Printer className="mr-2 h-3.5 w-3.5" />
                            Print Report
                        </Button>

                        <Button
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => setOpenCommitDialog(true)}
                            disabled={!canCommit}
                        >
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                            {statusText === "Pending" ? "Commit PI" : statusText}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Card className="rounded-2xl">
                    <CardContent className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            PI No
                        </p>
                        <p className="mt-1 text-sm font-semibold">{header.ph_no || `PI #${header.id}`}</p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Created By
                        </p>
                        <p className="mt-1 text-sm font-semibold truncate" title={reportMeta.encoder_name}>
                            {reportMeta.encoder_name || "—"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Open Short
                        </p>
                        <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">
                            ₱ {fmtMoney(unmatchedShortTotal)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Open Over
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            ₱ {fmtMoney(unmatchedOverTotal)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Offset Groups
                        </p>
                        <p className="mt-1 text-sm font-semibold">{offsetGroups.length}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
                <OffsettingSelectionTable
                    title="SHORT Pool"
                    direction="SHORT"
                    rows={openShortRows}
                    selectedIds={selectedShortIds}
                    onToggleRow={handleToggleShortRow}
                    onToggleAll={handleToggleAllShort}
                    disabled={isCreatingGroup || isCommitting || !isPending}
                />

                <OffsettingSelectionTable
                    title="OVER Pool"
                    direction="OVER"
                    rows={openOverRows}
                    selectedIds={selectedOverIds}
                    onToggleRow={handleToggleOverRow}
                    onToggleAll={handleToggleAllOver}
                    disabled={isCreatingGroup || isCommitting || !isPending}
                />
            </div>

            <Card className="rounded-2xl">
                <CardContent className="px-4 py-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-xl border bg-muted/20 px-4 py-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Selected Short Total
                                </p>
                                <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">
                                    ₱ {fmtMoney(selectedShortTotal)}
                                </p>
                            </div>

                            <div className="rounded-xl border bg-muted/20 px-4 py-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Selected Over Total
                                </p>
                                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                    ₱ {fmtMoney(selectedOverTotal)}
                                </p>
                            </div>

                            <div className="rounded-xl border bg-muted/20 px-4 py-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Difference
                                </p>
                                <p className="mt-1 text-sm font-semibold">
                                    ₱ {fmtMoney(selectedDifference)}
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => {
                                    void handleCreateOffsetGroup();
                                }}
                                disabled={!canCreateGroup}
                            >
                                {isCreatingGroup ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-3.5 w-3.5" />
                                        Create Offset Group
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-tight">Reconciliation Groups</h2>
                </div>
                <OffsettingGroupsTable
                    groups={offsetGroups}
                    onEditGroup={handleEditOffsetGroup}
                    onDeleteGroup={handleDeleteOffsetGroup}
                    isPending={isPending}
                    disabled={isCommitting}
                />
            </div>

            <AlertDialog open={openCommitDialog} onOpenChange={setOpenCommitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Commit Physical Inventory?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will finalize the Physical Inventory and make it read-only.
                            Unmatched SHORT and OVER rows may still remain, and that is allowed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                            <ClipboardList className="h-4 w-4" />
                            Commit Summary
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                            <p>Open SHORT total: ₱ {fmtMoney(unmatchedShortTotal)}</p>
                            <p>Open OVER total: ₱ {fmtMoney(unmatchedOverTotal)}</p>
                            <p>Offset groups: {offsetGroups.length}</p>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isCommitting}>
                            Back
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer"
                            onClick={(event) => {
                                event.preventDefault();
                                void handleCommit();
                            }}
                            disabled={isCommitting}
                        >
                            {isCommitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Committing...
                                </>
                            ) : (
                                "Commit PI"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}