//src/modules/supply-chain-management/physical-inventory-management/PhysicalInventoryManagementModule.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";

import type {
    BranchRow,
    CategoryRow,
    GroupedPhysicalInventoryChildRow,
    GroupedPhysicalInventoryRow,
    PhysicalInventoryDetailRow,
    PhysicalInventoryFiltersType,
    PhysicalInventoryHeaderRow,
    PhysicalInventoryHeaderUpsertPayload,
    PhysicalInventoryStatus,
    PriceTypeRow,
    ProductLookupBundle,
    RunningInventoryRow,
    SupplierRow,
} from "./types";
import {
    buildEligibleVariants,
    buildGroupedPhysicalInventoryRows,
    buildVariantsFromSavedDetails,
    cancelPhysicalInventory,
    canEditPhysicalInventory,
    computeAmount,
    computeDifferenceCost,
    computeVariance,
    convertBaseQtyToDisplayQty,
    createPhysicalInventoryDetailsBulk,
    createPhysicalInventoryHeader,
    derivePhysicalInventoryStatus,
    fetchBranches,
    fetchLatestCommittedCutoffDateByBranch,
    fetchNextPhysicalInventoryNumber,
    fetchPhysicalInventoryById,
    fetchPhysicalInventoryDetails,
    fetchPhysicalInventoryRfidCountByHeader,
    fetchPriceTypes,
    fetchProductLookupBundle,
    fetchRunningInventoryFiltered,
    fetchSuppliers,
    getSupplierScopedCategoriesFromLookup,
    resolveRunningInventoryFilterParams,
    sumHeaderTotalAmount,
    updatePhysicalInventoryDetailsBulk,
    updatePhysicalInventoryHeader,
    validateLoadProductsFilters,
    type BulkPhysicalInventoryDetailUpdateItem,
} from "./index";

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
import {
    ArrowRightCircle,
    Ban,
    Boxes,
    ClipboardList,
    Loader2,
    RefreshCcw,
    ScanLine,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
    PhysicalInventoryFilters as PhysicalInventoryFiltersCard,
    PhysicalInventoryGlobalRFIDScannerDialog,
    PhysicalInventoryHeader,
    PhysicalInventoryRFIDDialog,
    PhysicalInventoryTable,
} from "./components";

type Props = {
    initialHeaderId?: number | null;
    onRecordChange?: (header: PhysicalInventoryHeaderRow) => void;
    currentUser?: { id: number; name: string } | null;
};

type RebuildInput = {
    nextDetails?: PhysicalInventoryDetailRow[];
    nextHeader?: PhysicalInventoryHeaderRow | null;
    nextFilters?: PhysicalInventoryFiltersType;
    nextRunningInventoryRows?: RunningInventoryRow[];
    nextRfidCountByDetailId?: Record<number, number>;
};

type LocalRfidSavedPayload = {
    updatedDetail: PhysicalInventoryDetailRow;
    rfidCount: number;
};

function nowInputValue(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
}

function toNullableNumberInput(value: string): number {
    if (!value.trim()) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function fmtBaseQty(value: number): string {
    return `${value.toLocaleString("en-PH", {
        maximumFractionDigits: 0,
    })} PCS`;
}

function fmtInteger(value: number): string {
    return value.toLocaleString("en-PH", {
        maximumFractionDigits: 0,
    });
}

function fmtMoney(value: number): string {
    return value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function valueTone(value: number): string {
    if (value > 0) return "text-emerald-700 dark:text-emerald-300";
    if (value < 0) return "text-red-700 dark:text-red-300";
    return "text-foreground";
}

function kpiCardTone(value: number): string {
    if (value > 0) {
        return "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20";
    }
    if (value < 0) {
        return "border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20";
    }
    return "border-border bg-background";
}

function buildRunningInventoryCacheKey(input: {
    branchName: string;
    supplierShortcut: string;
    productCategory?: string;
}): string {
    return [
        input.branchName.trim().toLowerCase(),
        input.supplierShortcut.trim().toLowerCase(),
        (input.productCategory ?? "__all__").trim().toLowerCase(),
    ].join("::");
}

function normalizeSearchText(value: string): string {
    return value.trim().toLowerCase();
}

function matchesGroupedRowSearch(
    row: GroupedPhysicalInventoryRow,
    keyword: string,
): boolean {
    const normalizedKeyword = normalizeSearchText(keyword);
    if (!normalizedKeyword) return true;

    const haystack = [
        row.base_product_name,
        row.base_product_code ?? "",
        row.base_barcode ?? "",
        row.category_name ?? "",
        ...row.rows.map((child) => child.product_name),
        ...row.rows.map((child) => child.product_code ?? ""),
        ...row.rows.map((child) => child.barcode ?? ""),
        ...row.rows.map((child) => child.unit_name ?? ""),
        ...row.rows.map((child) => child.unit_shortcut ?? ""),
    ]
        .join(" ")
        .toLowerCase();

    return haystack.includes(normalizedKeyword);
}

function groupedRowHasVariance(row: GroupedPhysicalInventoryRow): boolean {
    return row.rows.some((child) => child.variance !== 0 || child.variance_base !== 0);
}

function groupedRowHasRfid(row: GroupedPhysicalInventoryRow): boolean {
    return row.rows.some((child) => child.requires_rfid);
}

function groupedRowHasUncounted(row: GroupedPhysicalInventoryRow): boolean {
    return row.rows.some((child) => child.physical_count === 0);
}

export function PhysicalInventoryManagementModule(props: Props) {
    const { initialHeaderId = null, onRecordChange, currentUser } = props;
    const router = useRouter();

    const [isBootLoading, setIsBootLoading] = React.useState(true);
    const [isLoadingProducts, setIsLoadingProducts] = React.useState(false);
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [openCancelDialog, setOpenCancelDialog] = React.useState(false);
    const [isHydratingRecord, setIsHydratingRecord] = React.useState(false);
    const [isRebuildingGroups, setIsRebuildingGroups] = React.useState(false);
    const [isSavingDetailBatch, setIsSavingDetailBatch] = React.useState(false);

    const [branches, setBranches] = React.useState<BranchRow[]>([]);
    const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
    const [categories, setCategories] = React.useState<CategoryRow[]>([]);
    const [priceTypes, setPriceTypes] = React.useState<PriceTypeRow[]>([]);
    const [lookupBundle, setLookupBundle] = React.useState<ProductLookupBundle | null>(null);

    const filteredRunningInventoryCacheRef = React.useRef<Record<string, RunningInventoryRow[]>>(
        {},
    );
    const dirtyDetailIdsRef = React.useRef<Set<number>>(new Set());

    const [runningInventoryRows, setRunningInventoryRows] = React.useState<RunningInventoryRow[]>([]);
    const [rfidCountByDetailId, setRfidCountByDetailId] = React.useState<Record<number, number>>(
        {},
    );

    const [header, setHeader] = React.useState<PhysicalInventoryHeaderRow | null>(null);
    const [detailRows, setDetailRows] = React.useState<PhysicalInventoryDetailRow[]>([]);
    const [groupedRows, setGroupedRows] = React.useState<GroupedPhysicalInventoryRow[]>([]);
    const [rfidDialogRow, setRfidDialogRow] =
        React.useState<GroupedPhysicalInventoryChildRow | null>(null);
    const [isGlobalScannerOpen, setIsGlobalScannerOpen] = React.useState(false);

    const [filters, setFilters] = React.useState<PhysicalInventoryFiltersType>({
        branch_id: null,
        supplier_id: null,
        category_id: null,
        price_type_id: null,
    });

    const [productSearch, setProductSearch] = React.useState("");
    const [activeQuickFilter, setActiveQuickFilter] = React.useState<
        "ALL" | "VARIANCE" | "RFID" | "UNCOUNTED"
    >("ALL");
    const [activeQuickCategory, setActiveQuickCategory] = React.useState<string>("ALL");

    React.useEffect(() => {
        if (filters.branch_id && currentUser) {
            setHeader((prev) => {
                if (!prev) return prev;
                if (prev.id !== 0) return prev;
                if (prev.date_encoded && prev.encoder_id) return prev;
                return {
                    ...prev,
                    date_encoded: new Date().toISOString(),
                    encoder_id: {
                        user_id: currentUser.id,
                        user_fname: currentUser.name,
                        user_lname: "",
                    } as any,
                };
            });
        }
    }, [filters.branch_id, currentUser]);

    const hasLoadedDetails = detailRows.length > 0;

    const status: PhysicalInventoryStatus = derivePhysicalInventoryStatus({
        isCancelled: header?.isCancelled,
        isComitted: header?.isComitted,
    });

    const canEdit = canEditPhysicalInventory({
        isCancelled: header?.isCancelled,
        isComitted: header?.isComitted,
    });

    const totalAmount = React.useMemo(() => sumHeaderTotalAmount(detailRows), [detailRows]);

    const grandTotals = React.useMemo(() => {
        return groupedRows.reduce(
            (acc, group) => {
                acc.system_base += group.total_system_count_base;
                acc.physical_base += group.total_physical_count_base;
                acc.variance_base += group.total_variance_base;
                acc.difference_cost += group.total_difference_cost;
                acc.amount += group.total_amount;
                return acc;
            },
            {
                system_base: 0,
                physical_base: 0,
                variance_base: 0,
                difference_cost: 0,
                amount: 0,
            },
        );
    }, [groupedRows]);

    const operationalSummary = React.useMemo(() => {
        let rfidRowsCount = 0;
        let rowsWithVariance = 0;
        let uncountedRows = 0;

        for (const group of groupedRows) {
            for (const row of group.rows) {
                if (row.requires_rfid) {
                    rfidRowsCount += 1;
                }
                if (row.variance !== 0 || row.variance_base !== 0) {
                    rowsWithVariance += 1;
                }
                if (row.physical_count === 0) {
                    uncountedRows += 1;
                }
            }
        }

        return {
            skuGroups: groupedRows.length,
            detailRows: detailRows.length,
            rowsWithVariance,
            rfidRowsCount,
            uncountedRows,
        };
    }, [detailRows.length, groupedRows]);

    const quickFilterCounts = React.useMemo(() => {
        return {
            ALL: groupedRows.length,
            VARIANCE: groupedRows.filter(groupedRowHasVariance).length,
            RFID: groupedRows.filter(groupedRowHasRfid).length,
            UNCOUNTED: groupedRows.filter(groupedRowHasUncounted).length,
        };
    }, [groupedRows]);

    const quickCategoryOptions = React.useMemo(() => {
        const counts = new Map<string, number>();

        for (const group of groupedRows) {
            const categoryLabel = (group.category_name ?? "Uncategorized").trim() || "Uncategorized";
            counts.set(categoryLabel, (counts.get(categoryLabel) ?? 0) + 1);
        }

        return [
            {
                key: "ALL",
                label: "All Categories",
                count: groupedRows.length,
            },
            ...Array.from(counts.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([label, count]) => ({
                    key: label,
                    label,
                    count,
                })),
        ];
    }, [groupedRows]);

    const visibleGroupedRows = React.useMemo(() => {
        return groupedRows.filter((group) => {
            const categoryLabel = (group.category_name ?? "Uncategorized").trim() || "Uncategorized";

            const matchesCategory =
                activeQuickCategory === "ALL" || categoryLabel === activeQuickCategory;

            const matchesSearch = matchesGroupedRowSearch(group, productSearch);

            const matchesOperationalFilter =
                activeQuickFilter === "ALL" ||
                (activeQuickFilter === "VARIANCE" && groupedRowHasVariance(group)) ||
                (activeQuickFilter === "RFID" && groupedRowHasRfid(group)) ||
                (activeQuickFilter === "UNCOUNTED" && groupedRowHasUncounted(group));

            return matchesCategory && matchesSearch && matchesOperationalFilter;
        });
    }, [activeQuickCategory, activeQuickFilter, groupedRows, productSearch]);

    const allGroupedChildRows = React.useMemo(
        () => groupedRows.flatMap((group) => group.rows),
        [groupedRows],
    );

    const rebuildGroupedRows = React.useCallback(
        (input?: RebuildInput) => {
            const activeHeader = input?.nextHeader ?? header;
            const activeDetails = input?.nextDetails ?? detailRows;
            const activeFilters = input?.nextFilters ?? filters;
            const activeLookup = lookupBundle;
            const activeRunningInventoryRows =
                input?.nextRunningInventoryRows ?? runningInventoryRows;
            const activeRfidCountByDetailId =
                input?.nextRfidCountByDetailId ?? rfidCountByDetailId;

            if (
                !activeLookup ||
                !activeFilters.branch_id ||
                !activeFilters.supplier_id ||
                !activeFilters.category_id ||
                !activeFilters.price_type_id
            ) {
                setGroupedRows([]);
                return;
            }

            if (activeDetails.length === 0) {
                setGroupedRows([]);
                return;
            }

            try {
                setIsRebuildingGroups(true);

                const variants = buildVariantsFromSavedDetails({
                    details: activeDetails,
                    priceTypeId: activeFilters.price_type_id,
                    lookup: activeLookup,
                });

                const nextGrouped = buildGroupedPhysicalInventoryRows({
                    branch_id: activeFilters.branch_id,
                    variants,
                    details: activeDetails,
                    runningInventoryRows: activeRunningInventoryRows,
                    ph_id: activeHeader?.id ?? null,
                    rfidCountByDetailId: activeRfidCountByDetailId,
                });

                setGroupedRows(nextGrouped);
            } finally {
                setIsRebuildingGroups(false);
            }
        },
        [detailRows, filters, header, lookupBundle, rfidCountByDetailId, runningInventoryRows],
    );

    const refreshRfidCountMap = React.useCallback(
        async (phId: number): Promise<Record<number, number>> => {
            const nextMap = await fetchPhysicalInventoryRfidCountByHeader(phId);
            setRfidCountByDetailId(nextMap);
            return nextMap;
        },
        [],
    );

    const refreshRunningInventoryReadModel = React.useCallback(
        async (
            nextFilters: PhysicalInventoryFiltersType,
            nextLookup?: ProductLookupBundle | null,
        ): Promise<RunningInventoryRow[]> => {
            const activeLookup = nextLookup ?? lookupBundle;

            if (
                !activeLookup ||
                !nextFilters.branch_id ||
                !nextFilters.supplier_id ||
                !nextFilters.category_id ||
                !branches.length ||
                !suppliers.length
            ) {
                setRunningInventoryRows([]);
                return [];
            }

            const params = resolveRunningInventoryFilterParams({
                branchId: nextFilters.branch_id,
                supplierId: nextFilters.supplier_id,
                categoryId: nextFilters.category_id,
                branches,
                suppliers,
                lookup: activeLookup,
            });

            const cacheKey = buildRunningInventoryCacheKey(params);
            const cached = filteredRunningInventoryCacheRef.current[cacheKey];

            if (cached) {
                setRunningInventoryRows(cached);
                return cached;
            }

            const rows = await fetchRunningInventoryFiltered(params);
            filteredRunningInventoryCacheRef.current[cacheKey] = rows;
            setRunningInventoryRows(rows);
            return rows;
        },
        [branches, lookupBundle, suppliers],
    );

    const flushDirtyDetails = React.useCallback(async () => {
        if (!header?.id) return;
        if (!dirtyDetailIdsRef.current.size) return;

        const dirtyIds = new Set(dirtyDetailIdsRef.current);

        const updates: BulkPhysicalInventoryDetailUpdateItem[] = detailRows
            .filter((detail) => dirtyIds.has(detail.id))
            .map((detail) => ({
                id: detail.id,
                physical_count: detail.physical_count,
                variance: detail.variance,
                difference_cost: detail.difference_cost,
                amount: detail.amount,
            }));

        if (!updates.length) {
            dirtyDetailIdsRef.current.clear();
            return;
        }

        try {
            setIsSavingDetailBatch(true);

            const updatedRows = await updatePhysicalInventoryDetailsBulk(updates);
            const updatedMap = new Map(updatedRows.map((row) => [row.id, row]));

            const nextDetails = detailRows.map((detail) => updatedMap.get(detail.id) ?? detail);

            setDetailRows(nextDetails);
            for (const id of dirtyIds) {
                dirtyDetailIdsRef.current.delete(id);
            }

            const nextHeader = await updatePhysicalInventoryHeader(header.id, {
                total_amount: sumHeaderTotalAmount(nextDetails),
            });

            setHeader(nextHeader);
            onRecordChange?.(nextHeader);

            rebuildGroupedRows({
                nextDetails,
                nextHeader,
                nextFilters: filters,
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to save physical count batch.";
            toast.error(message);
        } finally {
            setIsSavingDetailBatch(false);
        }
    }, [detailRows, filters, header, onRecordChange, rebuildGroupedRows]);

    const applyLocalRfidSavedPayload = React.useCallback(
        (payload: LocalRfidSavedPayload) => {
            const nextDetails = detailRows.map((detail) =>
                detail.id === payload.updatedDetail.id ? payload.updatedDetail : detail,
            );

            const nextRfidCountByDetailId = {
                ...rfidCountByDetailId,
                [payload.updatedDetail.id]: payload.rfidCount,
            };

            setDetailRows(nextDetails);
            setRfidCountByDetailId(nextRfidCountByDetailId);

            if (header) {
                const nextHeader: PhysicalInventoryHeaderRow = {
                    ...header,
                    total_amount: sumHeaderTotalAmount(nextDetails),
                };

                setHeader(nextHeader);
                onRecordChange?.(nextHeader);

                if (header.id > 0) {
                    void updatePhysicalInventoryHeader(header.id, {
                        total_amount: nextHeader.total_amount,
                    }).catch(() => {
                        // keep UI responsive; explicit refresh still re-syncs
                    });
                }

                rebuildGroupedRows({
                    nextDetails,
                    nextHeader,
                    nextFilters: filters,
                    nextRfidCountByDetailId,
                });
                return;
            }

            rebuildGroupedRows({
                nextDetails,
                nextFilters: filters,
                nextRfidCountByDetailId,
            });
        },
        [detailRows, filters, header, onRecordChange, rebuildGroupedRows, rfidCountByDetailId],
    );

    React.useEffect(() => {
        let cancelled = false;

        async function boot() {
            try {
                setIsBootLoading(true);
                setGroupedRows([]);
                setDetailRows([]);
                setCategories([]);
                setRunningInventoryRows([]);
                setRfidCountByDetailId({});
                dirtyDetailIdsRef.current.clear();

                const [nextBranches, nextSuppliers, nextPriceTypes, nextLookup] =
                    await Promise.all([
                        fetchBranches(),
                        fetchSuppliers(),
                        fetchPriceTypes(),
                        fetchProductLookupBundle(),
                    ]);

                if (cancelled) return;

                setBranches(nextBranches);
                setSuppliers(nextSuppliers);
                setPriceTypes(nextPriceTypes);
                setLookupBundle(nextLookup);

                if (initialHeaderId && initialHeaderId > 0) {
                    setIsHydratingRecord(true);

                    const [existingHeader, existingDetails] = await Promise.all([
                        fetchPhysicalInventoryById(initialHeaderId),
                        fetchPhysicalInventoryDetails(initialHeaderId),
                    ]);

                    if (cancelled) return;

                    const nextFilters: PhysicalInventoryFiltersType = {
                        branch_id: existingHeader.branch_id,
                        supplier_id: existingHeader.supplier_id,
                        category_id: existingHeader.category_id,
                        price_type_id: existingHeader.price_type,
                    };

                    setHeader(existingHeader);
                    setDetailRows(existingDetails);
                    setFilters(nextFilters);

                    if (existingHeader.supplier_id) {
                        const scopedCategories = getSupplierScopedCategoriesFromLookup(
                            existingHeader.supplier_id,
                            nextLookup,
                        );

                        if (!cancelled) {
                            setCategories(scopedCategories);
                        }
                    } else {
                        setCategories([]);
                    }

                    const nextRunningRows = await (async (): Promise<RunningInventoryRow[]> => {
                        const branchId = nextFilters.branch_id;
                        const supplierId = nextFilters.supplier_id;
                        const categoryId = nextFilters.category_id;
                        const priceTypeId = nextFilters.price_type_id;

                        if (!branchId || !supplierId || !categoryId || !priceTypeId) {
                            return [];
                        }

                        const params = resolveRunningInventoryFilterParams({
                            branchId,
                            supplierId,
                            categoryId,
                            branches: nextBranches,
                            suppliers: nextSuppliers,
                            lookup: nextLookup,
                        });

                        const cacheKey = buildRunningInventoryCacheKey(params);
                        const cached = filteredRunningInventoryCacheRef.current[cacheKey];

                        if (cached) {
                            return cached;
                        }

                        const rows = await fetchRunningInventoryFiltered(params);
                        filteredRunningInventoryCacheRef.current[cacheKey] = rows;
                        return rows;
                    })();

                    const nextRfidCountByDetailId =
                        await fetchPhysicalInventoryRfidCountByHeader(initialHeaderId);

                    if (cancelled) return;

                    setRunningInventoryRows(nextRunningRows);
                    setRfidCountByDetailId(nextRfidCountByDetailId);

                    if (
                        nextFilters.branch_id &&
                        nextFilters.supplier_id &&
                        nextFilters.category_id &&
                        nextFilters.price_type_id &&
                        existingDetails.length > 0
                    ) {
                        const variants = buildVariantsFromSavedDetails({
                            details: existingDetails,
                            priceTypeId: nextFilters.price_type_id,
                            lookup: nextLookup,
                        });

                        const nextGrouped = buildGroupedPhysicalInventoryRows({
                            branch_id: nextFilters.branch_id,
                            variants,
                            details: existingDetails,
                            runningInventoryRows: nextRunningRows,
                            ph_id: existingHeader.id ?? null,
                            rfidCountByDetailId: nextRfidCountByDetailId,
                        });

                        setGroupedRows(nextGrouped);
                    } else {
                        setGroupedRows([]);
                    }

                    setIsHydratingRecord(false);
                    return;
                }

                const nextPhNo = await fetchNextPhysicalInventoryNumber();

                const draftHeader: PhysicalInventoryHeaderRow = {
                    id: 0,
                    ph_no: nextPhNo,
                    date_encoded: null,
                    cutOff_date: nowInputValue(),
                    starting_date: null,
                    price_type: null,
                    stock_type: "GOOD",
                    branch_id: null,
                    remarks: "",
                    isComitted: 0,
                    isCancelled: 0,
                    total_amount: 0,
                    supplier_id: null,
                    category_id: null,
                    encoder_id: null,
                };

                if (cancelled) return;

                setHeader(draftHeader);
                setDetailRows([]);
                setGroupedRows([]);
                setCategories([]);
                setRunningInventoryRows([]);
                setRfidCountByDetailId({});
                setFilters({
                    branch_id: null,
                    supplier_id: null,
                    category_id: null,
                    price_type_id: null,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to load module.";
                toast.error(message);
            } finally {
                if (!cancelled) {
                    setIsBootLoading(false);
                    setIsHydratingRecord(false);
                }
            }
        }

        void boot();

        return () => {
            cancelled = true;
        };
    }, [initialHeaderId]);

    React.useEffect(() => {
        async function syncStartingDate() {
            if (!filters.branch_id || hasLoadedDetails || (header?.id ?? 0) > 0) return;

            try {
                const latestCutoff = await fetchLatestCommittedCutoffDateByBranch(filters.branch_id);

                setHeader((prev) => {
                    if (!prev) return prev;

                    if (prev.branch_id === filters.branch_id && prev.starting_date === latestCutoff) {
                        return prev;
                    }

                    return {
                        ...prev,
                        branch_id: filters.branch_id,
                        starting_date: latestCutoff,
                    };
                });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Failed to derive starting date.";
                toast.error(message);
            }
        }

        void syncStartingDate();
    }, [filters.branch_id, hasLoadedDetails, header?.id]);

    React.useEffect(() => {
        if (!lookupBundle || !filters.supplier_id) {
            setCategories([]);
            return;
        }

        const rows = getSupplierScopedCategoriesFromLookup(filters.supplier_id, lookupBundle);
        setCategories(rows);
    }, [filters.supplier_id, lookupBundle]);

    React.useEffect(() => {
        if (isBootLoading || !lookupBundle) return;

        if (
            !filters.branch_id ||
            !filters.supplier_id ||
            !filters.category_id ||
            !filters.price_type_id
        ) {
            setRunningInventoryRows([]);
            setGroupedRows([]);
            return;
        }

        void refreshRunningInventoryReadModel({
            branch_id: filters.branch_id,
            supplier_id: filters.supplier_id,
            category_id: filters.category_id,
            price_type_id: filters.price_type_id,
        });
    }, [
        filters.branch_id,
        filters.supplier_id,
        filters.category_id,
        filters.price_type_id,
        isBootLoading,
        lookupBundle,
        refreshRunningInventoryReadModel,
    ]);

    React.useEffect(() => {
        if (isBootLoading || !lookupBundle) return;

        if (
            !filters.branch_id ||
            !filters.supplier_id ||
            !filters.category_id ||
            !filters.price_type_id
        ) {
            setGroupedRows([]);
            return;
        }

        rebuildGroupedRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters.branch_id,
        filters.supplier_id,
        filters.category_id,
        filters.price_type_id,
        isBootLoading,
        lookupBundle,
        rfidCountByDetailId,
        runningInventoryRows,
    ]);

    React.useEffect(() => {
        if (activeQuickCategory === "ALL") return;

        const exists = quickCategoryOptions.some(
            (option) => option.key === activeQuickCategory,
        );

        if (!exists) {
            setActiveQuickCategory("ALL");
        }
    }, [activeQuickCategory, quickCategoryOptions]);

    const ensureHeaderSaved = React.useCallback(async (): Promise<PhysicalInventoryHeaderRow> => {
        if (!header) {
            throw new Error("Header state is not initialized.");
        }

        if (!(header.ph_no ?? "").trim()) {
            throw new Error("PH No is required.");
        }

        if (!header.stock_type) {
            throw new Error("Stock type is required.");
        }

        if (!filters.branch_id) {
            throw new Error("Branch is required.");
        }

        if (!filters.supplier_id) {
            throw new Error("Supplier is required.");
        }

        if (!filters.category_id) {
            throw new Error("Category is required.");
        }

        if (!filters.price_type_id) {
            throw new Error("Price type is required.");
        }

        if (!header.starting_date) {
            throw new Error("Starting date is required.");
        }

        const payload: PhysicalInventoryHeaderUpsertPayload = {
            ph_no: (header.ph_no ?? "").trim(),
            cutOff_date: header.cutOff_date,
            starting_date: header.starting_date,
            price_type: filters.price_type_id,
            stock_type: header.stock_type ?? "GOOD",
            branch_id: filters.branch_id,
            remarks: header.remarks ?? "",
            supplier_id: filters.supplier_id,
            category_id: filters.category_id,
            isComitted: header.isComitted,
            isCancelled: header.isCancelled,
            total_amount: totalAmount,
        };

        if (header.id > 0) {
            const updated = await updatePhysicalInventoryHeader(header.id, payload);
            setHeader(updated);
            onRecordChange?.(updated);
            return updated;
        }

        const created = await createPhysicalInventoryHeader(payload);
        setHeader(created);
        onRecordChange?.(created);
        return created;
    }, [
        filters.branch_id,
        filters.category_id,
        filters.price_type_id,
        filters.supplier_id,
        header,
        onRecordChange,
        totalAmount,
    ]);

    const handleResetFilters = React.useCallback(() => {
        if (!canEdit) return;

        setFilters({
            branch_id: null,
            supplier_id: null,
            category_id: null,
            price_type_id: null,
        });
        setCategories([]);
        setDetailRows([]);
        setGroupedRows([]);
        setRunningInventoryRows([]);
        setRfidCountByDetailId({});
        setProductSearch("");
        setActiveQuickFilter("ALL");
        setActiveQuickCategory("ALL");
        dirtyDetailIdsRef.current.clear();
        setHeader((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                branch_id: null,
                supplier_id: null,
                category_id: null,
                price_type: null,
                starting_date: null,
                total_amount: 0,
            };
        });
    }, [canEdit]);

    const handleLoadProducts = React.useCallback(async () => {
        const validation = validateLoadProductsFilters(filters);
        if (!validation.ok) {
            toast.error(validation.message ?? "Please complete the required filters.");
            return;
        }

        if (!canEdit) {
            toast.error("This PI can no longer be edited.");
            return;
        }

        if (hasLoadedDetails) {
            toast.error("Products are already loaded.");
            return;
        }

        if (!lookupBundle) {
            toast.error("Product lookup data is still loading.");
            return;
        }

        try {
            setIsLoadingProducts(true);

            const savedHeader = await ensureHeaderSaved();

            const runningInventoryFilterParams = resolveRunningInventoryFilterParams({
                branchId: filters.branch_id as number,
                supplierId: filters.supplier_id as number,
                categoryId: filters.category_id as number,
                branches,
                suppliers,
                lookup: lookupBundle,
            });

            const runningInventoryCacheKey = buildRunningInventoryCacheKey(
                runningInventoryFilterParams,
            );

            const cachedRunningInventoryRows =
                filteredRunningInventoryCacheRef.current[runningInventoryCacheKey];

            const nextRunningInventoryRows =
                cachedRunningInventoryRows ??
                (await fetchRunningInventoryFiltered(runningInventoryFilterParams));

            filteredRunningInventoryCacheRef.current[runningInventoryCacheKey] =
                nextRunningInventoryRows;
            setRunningInventoryRows(nextRunningInventoryRows);

            const eligibleVariants = buildEligibleVariants({
                supplierId: filters.supplier_id as number,
                categoryId: filters.category_id as number,
                priceTypeId: filters.price_type_id as number,
                lookup: lookupBundle,
            });

            if (!eligibleVariants.length) {
                toast.error("No eligible products found for the selected filters.");
                return;
            }

            const runningInventoryByProductId = new Map<number, RunningInventoryRow>();
            for (const row of nextRunningInventoryRows) {
                if (!runningInventoryByProductId.has(row.product_id)) {
                    runningInventoryByProductId.set(row.product_id, row);
                }
            }

            const detailPayloads = eligibleVariants.map((variant) => {
                const matchedRunning = runningInventoryByProductId.get(variant.product_id);

                const systemCount = convertBaseQtyToDisplayQty(
                    matchedRunning?.running_inventory,
                    variant.unit_count,
                );

                const physicalCount = 0;
                const variance = computeVariance(physicalCount, systemCount);
                const differenceCost = computeDifferenceCost(variance, variant.unit_price);
                const amount = computeAmount(physicalCount, variant.unit_price);

                return {
                    ph_id: savedHeader.id,
                    product_id: variant.product_id,
                    unit_price: variant.unit_price,
                    system_count: systemCount,
                    physical_count: physicalCount,
                    variance,
                    difference_cost: differenceCost,
                    amount,
                    offset_match: 0,
                };
            });

            await createPhysicalInventoryDetailsBulk(detailPayloads);

            const persistedDetails = await fetchPhysicalInventoryDetails(savedHeader.id);
            setDetailRows(persistedDetails);
            setRfidCountByDetailId({});
            dirtyDetailIdsRef.current.clear();

            const nextHeader = await updatePhysicalInventoryHeader(savedHeader.id, {
                total_amount: sumHeaderTotalAmount(persistedDetails),
            });

            setHeader(nextHeader);
            onRecordChange?.(nextHeader);

            rebuildGroupedRows({
                nextDetails: persistedDetails,
                nextHeader,
                nextFilters: filters,
                nextRunningInventoryRows,
                nextRfidCountByDetailId: {},
            });

            toast.success("Products loaded successfully.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load products.";
            toast.error(message);
        } finally {
            setIsLoadingProducts(false);
        }
    }, [
        branches,
        canEdit,
        ensureHeaderSaved,
        filters,
        hasLoadedDetails,
        lookupBundle,
        onRecordChange,
        rebuildGroupedRows,
        suppliers,
    ]);

    const handlePhysicalCountChange = React.useCallback(
        (row: GroupedPhysicalInventoryChildRow, value: string) => {
            const parsed = toNullableNumberInput(value);

            if (row.detail_id) {
                dirtyDetailIdsRef.current.add(row.detail_id);
            }

            setGroupedRows((prev) =>
                prev.map((group) => {
                    if (group.family_key !== row.family_key) return group;

                    const nextRows = group.rows.map((child) => {
                        if (child.product_id !== row.product_id) return child;

                        const nextPhysical = parsed;
                        const nextVariance = computeVariance(nextPhysical, child.system_count);
                        const nextDifferenceCost = computeDifferenceCost(
                            nextVariance,
                            child.unit_price,
                        );
                        const nextAmount = computeAmount(nextPhysical, child.unit_price);

                        return {
                            ...child,
                            physical_count: nextPhysical,
                            variance: nextVariance,
                            variance_base: nextVariance * child.unit_count,
                            difference_cost: nextDifferenceCost,
                            amount: nextAmount,
                        };
                    });

                    return {
                        ...group,
                        rows: nextRows,
                        total_system_count_base: nextRows.reduce(
                            (acc, child) => acc + child.system_count * child.unit_count,
                            0,
                        ),
                        total_physical_count_base: nextRows.reduce(
                            (acc, child) => acc + child.physical_count * child.unit_count,
                            0,
                        ),
                        total_variance_base: nextRows.reduce(
                            (acc, child) => acc + child.variance_base,
                            0,
                        ),
                        total_difference_cost: nextRows.reduce(
                            (acc, child) => acc + child.difference_cost,
                            0,
                        ),
                        total_amount: nextRows.reduce((acc, child) => acc + child.amount, 0),
                    };
                }),
            );

            setDetailRows((prev) =>
                prev.map((detail) => {
                    if (detail.product_id !== row.product_id) return detail;

                    const nextVariance = computeVariance(parsed, detail.system_count ?? 0);
                    const nextDifferenceCost = computeDifferenceCost(
                        nextVariance,
                        detail.unit_price,
                    );
                    const nextAmount = computeAmount(parsed, detail.unit_price);

                    return {
                        ...detail,
                        physical_count: parsed,
                        variance: nextVariance,
                        difference_cost: nextDifferenceCost,
                        amount: nextAmount,
                    };
                }),
            );
        },
        [],
    );

    const handlePhysicalCountBlur = React.useCallback(async () => {
        await flushDirtyDetails();
    }, [flushDirtyDetails]);

    const handleRefreshGroups = React.useCallback(async () => {
        try {
            if (!header?.id) return;

            const [nextDetails, nextRfidCountByDetailId, nextRunningInventoryRows] =
                await Promise.all([
                    fetchPhysicalInventoryDetails(header.id),
                    refreshRfidCountMap(header.id),
                    refreshRunningInventoryReadModel(filters),
                ]);

            setDetailRows(nextDetails);
            dirtyDetailIdsRef.current.clear();

            rebuildGroupedRows({
                nextDetails,
                nextHeader: header,
                nextFilters: filters,
                nextRunningInventoryRows,
                nextRfidCountByDetailId,
            });

            toast.success("Detail view refreshed.");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to refresh details.";
            toast.error(message);
        }
    }, [filters, header, rebuildGroupedRows, refreshRfidCountMap, refreshRunningInventoryReadModel]);

    const handleRfidSaved = React.useCallback(
        async (payload: LocalRfidSavedPayload) => {
            applyLocalRfidSavedPayload(payload);
        },
        [applyLocalRfidSavedPayload],
    );

    const handleAfterAnyScan = React.useCallback(
        async (payload: LocalRfidSavedPayload) => {
            applyLocalRfidSavedPayload(payload);
        },
        [applyLocalRfidSavedPayload],
    );

    const handleCancel = React.useCallback(async () => {
        if (!header?.id) {
            toast.error("This PI must exist before cancel.");
            return;
        }

        if (!canEdit) {
            toast.error("This PI can no longer be edited.");
            return;
        }

        try {
            setIsCancelling(true);

            const updatedHeader = await cancelPhysicalInventory(header.id);

            setHeader(updatedHeader);
            onRecordChange?.(updatedHeader);

            rebuildGroupedRows({
                nextDetails: detailRows,
                nextHeader: updatedHeader,
                nextFilters: filters,
            });

            setOpenCancelDialog(false);
            toast.success("Physical Inventory cancelled successfully.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to cancel PI.";
            toast.error(message);
        } finally {
            setIsCancelling(false);
        }
    }, [canEdit, detailRows, filters, header?.id, onRecordChange, rebuildGroupedRows]);

    const canCancelAction =
        Boolean(header?.id) &&
        canEdit &&
        !isBootLoading &&
        !isLoadingProducts &&
        !isSavingDetailBatch &&
        !isCancelling &&
        !isRebuildingGroups;

    if (isBootLoading || !header) {
        return (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border bg-background">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading Physical Inventory module...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border bg-background px-3 py-3 shadow-sm sm:px-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl border bg-muted/40 p-2">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">
                                    Physical Inventory Management
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Review the header, scope products, count inventory, and save
                                    the latest variance snapshot for the offsetting workflow.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            className="cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
                            onClick={() =>
                                router.push(
                                    `/scm/inventory-management/physical-inventory/offsetting?id=${header.id}`,
                                )
                            }
                            disabled={!header.id}
                        >
                            <ArrowRightCircle className="mr-2 h-4 w-4" />
                            Go to Offsetting
                        </Button>

                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setIsGlobalScannerOpen(true)}
                            disabled={!canEdit || !header.id || !hasLoadedDetails}
                        >
                            <ScanLine className="mr-2 h-4 w-4" />
                            Global RFID Scanner
                        </Button>

                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={handleRefreshGroups}
                            disabled={
                                !header.id ||
                                isBootLoading ||
                                isLoadingProducts ||
                                isSavingDetailBatch ||
                                isRebuildingGroups
                            }
                        >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>

                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setOpenCancelDialog(true)}
                            disabled={!canCancelAction}
                        >
                            <Ban className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>

            <PhysicalInventoryHeader
                header={header}
                status={status}
                canEdit={canEdit}
                totalAmount={totalAmount}
                onChangePhNo={(value) =>
                    setHeader((prev) => (prev ? { ...prev, ph_no: value } : prev))
                }
                onChangeStockType={(value) =>
                    setHeader((prev) => (prev ? { ...prev, stock_type: value } : prev))
                }
                onChangeRemarks={(value) =>
                    setHeader((prev) => (prev ? { ...prev, remarks: value } : prev))
                }
                onChangeCutoffDate={(value) =>
                    setHeader((prev) => (prev ? { ...prev, cutOff_date: value } : prev))
                }
                onChangeStartingDate={(value) =>
                    setHeader((prev) => (prev ? { ...prev, starting_date: value } : prev))
                }
            />

            <PhysicalInventoryFiltersCard
                filters={filters}
                branches={branches}
                suppliers={suppliers}
                categories={categories}
                priceTypes={priceTypes}
                canEdit={canEdit}
                hasLoadedDetails={hasLoadedDetails}
                isLoadingProducts={isLoadingProducts}
                onChangeBranch={(value) => {
                    setFilters((prev) => ({
                        ...prev,
                        branch_id: value,
                    }));

                    setHeader((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            branch_id: value,
                        };
                    });
                }}
                onChangeSupplier={(value) => {
                    setFilters((prev) => ({
                        ...prev,
                        supplier_id: value,
                        category_id: null,
                    }));

                    setHeader((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            supplier_id: value,
                            category_id: null,
                        };
                    });
                }}
                onChangeCategory={(value) => {
                    setFilters((prev) => ({
                        ...prev,
                        category_id: value,
                    }));

                    setHeader((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            category_id: value,
                        };
                    });
                }}
                onChangePriceType={(value) => {
                    setFilters((prev) => ({
                        ...prev,
                        price_type_id: value,
                    }));

                    setHeader((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            price_type: value,
                        };
                    });
                }}
                onReset={handleResetFilters}
                onLoadProducts={handleLoadProducts}
            />

            {groupedRows.length > 0 ? (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                        <div
                            className={`rounded-2xl border px-4 py-3 shadow-sm ${kpiCardTone(
                                grandTotals.system_base,
                            )}`}
                        >
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Total System Count
                            </p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">
                                {fmtBaseQty(grandTotals.system_base)}
                            </p>
                        </div>

                        <div
                            className={`rounded-2xl border px-4 py-3 shadow-sm ${kpiCardTone(
                                grandTotals.physical_base,
                            )}`}
                        >
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Total Physical Count
                            </p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">
                                {fmtBaseQty(grandTotals.physical_base)}
                            </p>
                        </div>

                        <div
                            className={`rounded-2xl border px-4 py-3 shadow-sm ${kpiCardTone(
                                grandTotals.variance_base,
                            )}`}
                        >
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Total Variance
                            </p>
                            <p
                                className={`mt-1 text-lg font-semibold tabular-nums ${valueTone(
                                    grandTotals.variance_base,
                                )}`}
                            >
                                {fmtBaseQty(grandTotals.variance_base)}
                            </p>
                        </div>

                        <div
                            className={`rounded-2xl border px-4 py-3 shadow-sm ${kpiCardTone(
                                grandTotals.difference_cost,
                            )}`}
                        >
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Total Diff Cost
                            </p>
                            <p
                                className={`mt-1 text-lg font-semibold tabular-nums ${valueTone(
                                    grandTotals.difference_cost,
                                )}`}
                            >
                                ₱ {fmtMoney(grandTotals.difference_cost)}
                            </p>
                        </div>

                        <div
                            className={`rounded-2xl border px-4 py-3 shadow-sm ${kpiCardTone(
                                grandTotals.amount,
                            )}`}
                        >
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Total Amount
                            </p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">
                                ₱ {fmtMoney(grandTotals.amount)}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                        <div className="rounded-2xl border bg-muted/15 px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Boxes className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Loaded SKU Groups
                                </p>
                            </div>
                            <p className="mt-1 text-base font-semibold tabular-nums">
                                {fmtInteger(operationalSummary.skuGroups)}
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-muted/15 px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Detail Rows
                                </p>
                            </div>
                            <p className="mt-1 text-base font-semibold tabular-nums">
                                {fmtInteger(operationalSummary.detailRows)}
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-muted/15 px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-2">
                                <ScanLine className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    RFID Rows
                                </p>
                            </div>
                            <p className="mt-1 text-base font-semibold tabular-nums">
                                {fmtInteger(operationalSummary.rfidRowsCount)}
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-muted/15 px-4 py-3 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Rows With Variance
                            </p>
                            <p
                                className={`mt-1 text-base font-semibold tabular-nums ${valueTone(
                                    operationalSummary.rowsWithVariance,
                                )}`}
                            >
                                {fmtInteger(operationalSummary.rowsWithVariance)}
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-muted/15 px-4 py-3 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Zero / Uncounted Rows
                            </p>
                            <p className="mt-1 text-base font-semibold tabular-nums">
                                {fmtInteger(operationalSummary.uncountedRows)}
                            </p>
                        </div>
                    </div>
                </>
            ) : null}

            <div className="rounded-2xl border bg-background px-4 py-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold tracking-tight">Product Finder</h3>
                        <p className="text-sm text-muted-foreground">
                            Search loaded products and quickly narrow the counting view.
                        </p>
                    </div>

                    <div className="w-full xl:max-w-sm">
                        <input
                            value={productSearch}
                            onChange={(event) => setProductSearch(event.target.value)}
                            placeholder="Search product code, name, barcode, UOM..."
                            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {[
                            {
                                key: "ALL" as const,
                                label: "All",
                                count: quickFilterCounts.ALL,
                            },
                            {
                                key: "VARIANCE" as const,
                                label: "With Variance",
                                count: quickFilterCounts.VARIANCE,
                            },
                            {
                                key: "RFID" as const,
                                label: "RFID",
                                count: quickFilterCounts.RFID,
                            },
                            {
                                key: "UNCOUNTED" as const,
                                label: "Uncounted",
                                count: quickFilterCounts.UNCOUNTED,
                            },
                        ].map((option) => {
                            const isActive = activeQuickFilter === option.key;

                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setActiveQuickFilter(option.key)}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition cursor-pointer",
                                        isActive
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                                    ].join(" ")}
                                >
                                    <span>{option.label}</span>
                                    <span
                                        className={[
                                            "rounded-full px-1.5 py-0.5 text-[10px]",
                                            isActive
                                                ? "bg-primary-foreground/15 text-primary-foreground"
                                                : "bg-background text-foreground",
                                        ].join(" ")}
                                    >
                                        {option.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {quickCategoryOptions.map((option) => {
                            const isActive = activeQuickCategory === option.key;

                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setActiveQuickCategory(option.key)}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition cursor-pointer",
                                        isActive
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                                    ].join(" ")}
                                >
                                    <span>{option.label}</span>
                                    <span
                                        className={[
                                            "rounded-full px-1.5 py-0.5 text-[10px]",
                                            isActive
                                                ? "bg-white/15 text-white"
                                                : "bg-muted text-foreground",
                                        ].join(" ")}
                                    >
                                        {option.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                        Showing{" "}
                        <span className="font-semibold text-foreground">
                            {visibleGroupedRows.length}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-foreground">
                            {groupedRows.length}
                        </span>{" "}
                        SKU groups
                    </span>
                    <span>
                        Filter:{" "}
                        <span className="font-semibold text-foreground">{activeQuickFilter}</span>
                    </span>
                    <span>
                        Category:{" "}
                        <span className="font-semibold text-foreground">{activeQuickCategory}</span>
                    </span>
                </div>
            </div>

            <PhysicalInventoryTable
                rows={visibleGroupedRows}
                isLoading={isBootLoading || isHydratingRecord || isLoadingProducts}
                canEdit={canEdit}
                onPhysicalCountChange={handlePhysicalCountChange}
                onPhysicalCountBlur={handlePhysicalCountBlur}
                onOpenRfid={(row) => setRfidDialogRow(row)}
            />

            <PhysicalInventoryRFIDDialog
                open={rfidDialogRow !== null}
                row={rfidDialogRow}
                branchId={filters.branch_id}
                onOpenChange={(open) => {
                    if (!open) setRfidDialogRow(null);
                }}
                onSaved={handleRfidSaved}
            />

            <PhysicalInventoryGlobalRFIDScannerDialog
                open={isGlobalScannerOpen}
                branchId={filters.branch_id}
                phId={header.id > 0 ? header.id : null}
                rows={allGroupedChildRows}
                canEdit={canEdit}
                onOpenChange={setIsGlobalScannerOpen}
                onSaved={handleAfterAnyScan}
            />

            <AlertDialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Physical Inventory?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will mark the record as cancelled and make it read-only.
                            Use this only for invalid or abandoned draft sessions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="cursor-pointer"
                            disabled={isCancelling}
                        >
                            Back
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer"
                            onClick={(event) => {
                                event.preventDefault();
                                void handleCancel();
                            }}
                            disabled={isCancelling}
                        >
                            {isCancelling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                "Cancel PI"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}