//src/modules/supply-chain-management/physical-inventory-manual-management/MockLedgerModule.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";

import type {
    BranchRow,
    CategoryRow,
    EligibleVariantRow,
    GroupedPhysicalInventoryChildRow,
    GroupedPhysicalInventoryRow,
    PhysicalInventoryDetailRow,
    PhysicalInventoryDetailUpsertPayload,
    MockLedgerFiltersType,
    MockLedgerHeaderRow,
    MockLedgerHeaderUpsertPayload,
    PhysicalInventoryStatus,
    PriceTypeRow,
    ProductLookupBundle,
    RunningInventoryRow,
    SupplierRow,
    WarehousemanRow,
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
    createMockLedgerHeader,
    createPhysicalInventoryDetailsBulk,
    derivePhysicalInventoryStatus,
    commitMockLedger,
    fetchBranches,
    fetchLatestCommittedCutoffDateByBranch,
    fetchNextPhysicalInventoryNumber,
    fetchPhysicalInventoryById,
    fetchPhysicalInventoryDetails,
    fetchPriceTypes,
    fetchProductLookupBundle,
    fetchRunningInventoryFiltered,
    fetchSuppliers,
    fetchWarehousemen,
    getSupplierScopedCategoriesFromLookup,
    resolveRunningInventoryFilterParams,
    sumHeaderTotalAmount,
    updatePhysicalInventoryDetailsBulk,
    updateMockLedgerHeader,
    validateLoadProductsFilters,
    generateAuditSheetPdf,
    generateAuditReportPdf,
    generateManualTallySheetPdf,
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
    Ban,
    Boxes,
    CheckCircle2,
    ClipboardList,
    Eye,
    EyeOff,
    Loader2,
    Plus,
    Printer,
    RefreshCcw,
    Search,
    Save,
    X,
} from "lucide-react";

import {
    MockLedgerAddProductDialog,
    MockLedgerFilters as MockLedgerFiltersCard,
    MockLedgerHeader,
    MockLedgerTable,
} from "./components";

type Props = {
    initialHeaderId?: number | null;
    onRecordChange?: (header: MockLedgerHeaderRow) => void;
    currentUser?: { id: number; name: string } | null;
};

type RebuildInput = {
    nextDetails?: PhysicalInventoryDetailRow[];
    nextHeader?: MockLedgerHeaderRow | null;
    nextFilters?: MockLedgerFiltersType;
    nextRunningInventoryRows?: RunningInventoryRow[];
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
    supplierShortcut?: string;
    productCategory?: string;
    cutOffDate?: string;
}): string {
    return [
        input.branchName.trim().toLowerCase(),
        (input.supplierShortcut ?? "__any__").trim().toLowerCase(),
        (input.productCategory ?? "__all__").trim().toLowerCase(),
        (input.cutOffDate ?? "__no_cutoff__").trim().toLowerCase(),
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

function groupedRowHasUncounted(row: GroupedPhysicalInventoryRow): boolean {
    return row.rows.some((child) => child.physical_count === 0);
}

export function MockLedgerModule(props: Props) {
    const { initialHeaderId = null, onRecordChange, currentUser } = props;
    const [isBootLoading, setIsBootLoading] = React.useState(true);
    const [isLoadingProducts, setIsLoadingProducts] = React.useState(false);
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [openCancelDialog, setOpenCancelDialog] = React.useState(false);
    const [isHydratingRecord, setIsHydratingRecord] = React.useState(false);
    const [isRebuildingGroups, setIsRebuildingGroups] = React.useState(false);
    const [isSavingDetailBatch, setIsSavingDetailBatch] = React.useState(false);
    const [openAddProductDialog, setOpenAddProductDialog] = React.useState(false);
    const [isToolbarExpanded, setIsToolbarExpanded] = React.useState(false);

    const [openCommitDialog, setOpenCommitDialog] = React.useState(false);
    const [isCommitting, setIsCommitting] = React.useState(false);
    const [openPrintChoiceDialog, setOpenPrintChoiceDialog] = React.useState(false);

    const [openPreviewDialog, setOpenPreviewDialog] = React.useState(false);
    const [previewBlobUrl, setPreviewBlobUrl] = React.useState<string | null>(null);
    const [activeDocInstance, setActiveDocInstance] = React.useState<jsPDF | null>(null);
    const [activeDocName, setActiveDocName] = React.useState("");

    React.useEffect(() => {
        return () => {
            if (previewBlobUrl) {
                URL.revokeObjectURL(previewBlobUrl);
            }
        };
    }, [previewBlobUrl]);

    const [branches, setBranches] = React.useState<BranchRow[]>([]);
    const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
    const [categories, setCategories] = React.useState<CategoryRow[]>([]);
    const [priceTypes, setPriceTypes] = React.useState<PriceTypeRow[]>([]);
    const [lookupBundle, setLookupBundle] = React.useState<ProductLookupBundle | null>(null);
    const [warehousemen, setWarehousemen] = React.useState<WarehousemanRow[]>([]);
    const [selectedWarehousemanId, setSelectedWarehousemanId] = React.useState<number | null>(null);

    const filteredRunningInventoryCacheRef = React.useRef<Record<string, RunningInventoryRow[]>>(
        {},
    );
    const dirtyDetailIdsRef = React.useRef<Set<number>>(new Set());

    React.useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (dirtyDetailIdsRef.current.size > 0) {
                event.preventDefault();
                event.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    const [runningInventoryRows, setRunningInventoryRows] = React.useState<RunningInventoryRow[]>([]);

    const [header, setHeader] = React.useState<MockLedgerHeaderRow | null>(null);
    const [detailRows, setDetailRows] = React.useState<PhysicalInventoryDetailRow[]>([]);
    const detailRowsRef = React.useRef(detailRows);
    React.useEffect(() => {
        detailRowsRef.current = detailRows;
    }, [detailRows]);
    const [groupedRows, setGroupedRows] = React.useState<GroupedPhysicalInventoryRow[]>([]);

    const [filters, setFilters] = React.useState<MockLedgerFiltersType>({
        branch_id: null,
        supplier_id: null,
        category_id: null,
        price_type_id: null,
    });

    const [productSearch, setProductSearch] = React.useState("");
    const deferredProductSearch = React.useDeferredValue(productSearch);
    const [activeQuickFilter, setActiveQuickFilter] = React.useState<
        "ALL" | "VARIANCE" | "UNCOUNTED"
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
                    },
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

    const { shortTotal, overTotal } = React.useMemo(() => {
        let st = 0;
        let ot = 0;
        for (const group of groupedRows) {
            for (const row of group.rows) {
                const diff = row.difference_cost ?? 0;
                if (diff < 0) {
                    st += Math.abs(diff);
                } else if (diff > 0) {
                    ot += diff;
                }
            }
        }
        return { shortTotal: st, overTotal: ot };
    }, [groupedRows]);

    const operationalSummary = React.useMemo(() => {
        let rowsWithVariance = 0;
        let uncountedRows = 0;

        for (const group of groupedRows) {
            for (const row of group.rows) {
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
            uncountedRows,
        };
    }, [detailRows.length, groupedRows]);

    const quickFilterCounts = React.useMemo(() => {
        return {
            ALL: groupedRows.length,
            VARIANCE: groupedRows.filter(groupedRowHasVariance).length,
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

            const matchesSearch = matchesGroupedRowSearch(group, deferredProductSearch);

            const matchesOperationalFilter =
                activeQuickFilter === "ALL" ||
                (activeQuickFilter === "VARIANCE" && groupedRowHasVariance(group)) ||
                (activeQuickFilter === "UNCOUNTED" && groupedRowHasUncounted(group));

            return matchesCategory && matchesSearch && matchesOperationalFilter;
        });
    }, [activeQuickCategory, activeQuickFilter, groupedRows, deferredProductSearch]);

    const eligibleVariants = React.useMemo(() => {
        const sId = Number(filters.supplier_id);
        const cId = Number(filters.category_id);
        const pId = Number(filters.price_type_id);

        if (!lookupBundle || !sId || !cId || !pId) return [];

        return buildEligibleVariants({
            supplierId: sId,
            categoryId: cId,
            priceTypeId: pId,
            lookup: lookupBundle,
        });
    }, [filters.supplier_id, filters.category_id, filters.price_type_id, lookupBundle]);

    const rebuildGroupedRows = React.useCallback(
        (input?: RebuildInput) => {
            const activeHeader = input?.nextHeader ?? header;
            const activeDetails = input?.nextDetails ?? detailRows;
            const activeFilters = input?.nextFilters ?? filters;
            const activeLookup = lookupBundle;
            const activeRunningInventoryRows =
                input?.nextRunningInventoryRows ?? runningInventoryRows;

            if (!activeLookup || !activeFilters.branch_id) {
                setGroupedRows([]);
                return;
            }

            if (
                activeDetails.length === 0 &&
                (!activeFilters.supplier_id ||
                    !activeFilters.category_id ||
                    !activeFilters.price_type_id)
            ) {
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
                    ignoreRfid: true,
                });

                setGroupedRows(nextGrouped);
            } finally {
                setIsRebuildingGroups(false);
            }
        },
        [detailRows, filters, header, lookupBundle, runningInventoryRows],
    );

    const refreshRunningInventoryReadModel = React.useCallback(
        async (
            nextFilters: MockLedgerFiltersType & { cutOffDate?: string | null },
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
                cutOffDate: nextFilters.cutOffDate,
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

    const reloadDetails = React.useCallback(async (id: number) => {
        const [nextDetails] = await Promise.all([
            fetchPhysicalInventoryDetails(id),
            updateMockLedgerHeader(id, { total_amount: 0 }),
        ]);

        const finalHeader = await updateMockLedgerHeader(id, {
            total_amount: sumHeaderTotalAmount(nextDetails)
        });

        setDetailRows(nextDetails);
        setHeader(finalHeader);
        onRecordChange?.(finalHeader);

        rebuildGroupedRows({
            nextDetails,
            nextHeader: finalHeader,
            nextFilters: filters,
        });
    }, [filters, onRecordChange, rebuildGroupedRows]);

    const flushDirtyDetails = React.useCallback(async () => {
        if (!header?.id) return;
        if (!dirtyDetailIdsRef.current.size) return;

        const dirtyIds = new Set(dirtyDetailIdsRef.current);

        const updates: BulkPhysicalInventoryDetailUpdateItem[] = detailRowsRef.current
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

            const nextDetails = detailRowsRef.current.map((detail) => updatedMap.get(detail.id) ?? detail);

            setDetailRows(nextDetails);
            for (const id of dirtyIds) {
                dirtyDetailIdsRef.current.delete(id);
            }

            const nextHeader = await updateMockLedgerHeader(header.id, {
                total_amount: sumHeaderTotalAmount(nextDetails),
            });

            setHeader(nextHeader);
            onRecordChange?.(nextHeader);

            // Surgically patch only the rows that were saved.
            // Do NOT call rebuildGroupedRows here — that would overwrite any
            // in-progress edits the user is currently making in other input fields.
            setGroupedRows((prevGrouped) =>
                prevGrouped.map((group) => {
                    const nextRows = group.rows.map((child) => {
                        const saved = updatedMap.get(child.detail_id ?? -1);
                        if (!saved) return child;
                        return {
                            ...child,
                            physical_count: saved.physical_count ?? 0,
                            variance: saved.variance ?? 0,
                            variance_base: (saved.variance ?? 0) * child.unit_count,
                            difference_cost: saved.difference_cost ?? 0,
                            amount: saved.amount ?? 0,
                        };
                    });

                    const didChange = nextRows.some((r, i) => r !== group.rows[i]);
                    if (!didChange) return group;

                    return {
                        ...group,
                        rows: nextRows,
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
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to save physical count batch.";
            toast.error(message);
        } finally {
            setIsSavingDetailBatch(false);
        }
    }, [header, onRecordChange]);

    React.useEffect(() => {
        let cancelled = false;

        async function boot() {
            try {
                setIsBootLoading(true);
                setGroupedRows([]);
                setDetailRows([]);
                setCategories([]);
                setRunningInventoryRows([]);
                dirtyDetailIdsRef.current.clear();

                const [nextBranches, nextSuppliers, nextPriceTypes, nextLookup, nextWarehousemen] =
                    await Promise.all([
                        fetchBranches(),
                        fetchSuppliers(),
                        fetchPriceTypes(),
                        fetchProductLookupBundle(),
                        fetchWarehousemen(),
                    ]);

                if (cancelled) return;

                setBranches(nextBranches);
                setSuppliers(nextSuppliers);
                setPriceTypes(nextPriceTypes);
                setLookupBundle(nextLookup);
                setWarehousemen(nextWarehousemen);

                if (initialHeaderId && initialHeaderId > 0) {
                    setIsHydratingRecord(true);

                    const [existingHeader, existingDetails] = await Promise.all([
                        fetchPhysicalInventoryById(initialHeaderId),
                        fetchPhysicalInventoryDetails(initialHeaderId),
                    ]);

                    if (cancelled) return;

                    const nextFilters: MockLedgerFiltersType = {
                        branch_id: existingHeader.branch_id ? Number(existingHeader.branch_id) : null,
                        supplier_id: existingHeader.supplier_id ? Number(existingHeader.supplier_id) : null,
                        category_id: existingHeader.category_id ? Number(existingHeader.category_id) : null,
                        price_type_id: existingHeader.price_type ? Number(existingHeader.price_type) : null,
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
                            cutOffDate: existingHeader.cutOff_date,
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

                    if (cancelled) return;

                    setRunningInventoryRows(nextRunningRows);

                    if (nextFilters.branch_id && existingDetails.length > 0) {
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
                            ignoreRfid: true,
                        });

                        setGroupedRows(nextGrouped);
                    } else {
                        setGroupedRows([]);
                    }

                    setIsHydratingRecord(false);
                    return;
                }

                const nextPhNo = await fetchNextPhysicalInventoryNumber();

                const draftHeader: MockLedgerHeaderRow = {
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
                    committed_at: null,
                    cancelled_at: null,
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
            if (!hasLoadedDetails) {
                setRunningInventoryRows([]);
                setGroupedRows([]);
            }
            return;
        }

        void refreshRunningInventoryReadModel({
            branch_id: filters.branch_id,
            supplier_id: filters.supplier_id,
            category_id: filters.category_id,
            price_type_id: filters.price_type_id,
            cutOffDate: header?.cutOff_date,
        });
    }, [
        filters.branch_id,
        filters.supplier_id,
        filters.category_id,
        filters.price_type_id,
        isBootLoading,
        lookupBundle,
        refreshRunningInventoryReadModel,
        header?.cutOff_date,
        hasLoadedDetails,
    ]);

    React.useEffect(() => {
        if (isBootLoading || !lookupBundle) return;

        if (
            !filters.branch_id ||
            !filters.supplier_id ||
            !filters.category_id ||
            !filters.price_type_id
        ) {
            if (!hasLoadedDetails) {
                setGroupedRows([]);
            }
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
        runningInventoryRows,
        hasLoadedDetails,
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

    const ensureHeaderSaved = React.useCallback(async (): Promise<MockLedgerHeaderRow> => {
        if (!header) {
            throw new Error("Header state is not initialized.");
        }

        if (!(header.ph_no ?? "").trim()) {
            throw new Error("ML No is required.");
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

        const payload: MockLedgerHeaderUpsertPayload = {
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
            const updated = await updateMockLedgerHeader(header.id, payload);
            setHeader(updated);
            onRecordChange?.(updated);
            return updated;
        }

        const created = await createMockLedgerHeader(payload);
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
                supplierId: null, // Always get branch-wide stock to ensure accurate system counts
                categoryId: filters.category_id as number,
                branches,
                suppliers,
                lookup: lookupBundle,
                cutOffDate: savedHeader.cutOff_date,
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

            // Aggregate running inventory by product ID across all suppliers
            const runningInventoryByProductId = new Map<number, number>();
            for (const row of nextRunningInventoryRows) {
                const current = runningInventoryByProductId.get(row.product_id) ?? 0;
                runningInventoryByProductId.set(row.product_id, current + (row.running_inventory ?? 0));
            }

            // Identify product families with stock
            const familiesWithStock = new Set<number>();

            for (const variant of eligibleVariants) {
                const familyKey = variant.parent_id ?? variant.product_id;
                const stock = runningInventoryByProductId.get(variant.product_id) ?? 0;

                if (stock !== 0) {
                    familiesWithStock.add(familyKey);
                }
            }

            // Compute allocations directly based on specific variant's stock
            const systemCountAllocations = new Map<number, number>();

            for (const variant of eligibleVariants) {
                const familyKey = variant.parent_id ?? variant.product_id;
                if (!familiesWithStock.has(familyKey)) continue;

                const stock = runningInventoryByProductId.get(variant.product_id) ?? 0;
                const systemCount = convertBaseQtyToDisplayQty(stock, variant.unit_count);
                systemCountAllocations.set(variant.product_id, systemCount);
            }

            // Load entire families if at least one member has stock
            const detailPayloads = eligibleVariants
                .filter((variant) => {
                    const familyKey = variant.parent_id ?? variant.product_id;
                    return familiesWithStock.has(familyKey);
                })
                .map((variant) => {
                    const systemCount = systemCountAllocations.get(variant.product_id) ?? 0;

                    const initialPhysicalCount = 0;
                    const variance = computeVariance(initialPhysicalCount, systemCount);
                    const differenceCost = computeDifferenceCost(variance, variant.unit_price);
                    const amount = computeAmount(initialPhysicalCount, variant.unit_price);

                    return {
                        ph_id: savedHeader.id,
                        product_id: variant.product_id,
                        unit_price: variant.unit_price,
                        system_count: systemCount,
                        physical_count: initialPhysicalCount,
                        variance,
                        difference_cost: differenceCost,
                        amount,
                        offset_match: 0,
                    };
                });

            await createPhysicalInventoryDetailsBulk(detailPayloads);

            const persistedDetails = await fetchPhysicalInventoryDetails(savedHeader.id);
            setDetailRows(persistedDetails);
            dirtyDetailIdsRef.current.clear();

            const nextHeader = await updateMockLedgerHeader(savedHeader.id, {
                total_amount: sumHeaderTotalAmount(persistedDetails),
            });

            setHeader(nextHeader);
            onRecordChange?.(nextHeader);

            rebuildGroupedRows({
                nextDetails: persistedDetails,
                nextHeader,
                nextFilters: filters,
                nextRunningInventoryRows,
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

    const handleAddProduct = React.useCallback(
        async (variant: EligibleVariantRow) => {
            if (!header?.id || !canEdit) return;

            try {
                // Determine family key (Parent ID or root product ID)
                const familyKey = variant.parent_id ?? variant.product_id;

                // Find all siblings in the same family from eligibleVariants
                const familySiblings = eligibleVariants.filter((v) => {
                    const vFamilyKey = v.parent_id ?? v.product_id;
                    return vFamilyKey === familyKey;
                });

                // Identify which siblings are already loaded
                const existingProductIds = new Set(detailRows.map((d) => d.product_id));
                const siblingsToLoad = familySiblings.filter((v) => !existingProductIds.has(v.product_id));

                if (siblingsToLoad.length === 0) {
                    toast.info("All variants for this family are already added.");
                    return;
                }

                // Fetch running inventory for specific products
                const systemCountAllocations = new Map<number, number>();
                
                for (const sibling of familySiblings) {
                    const siblingStock = runningInventoryRows
                        .filter((r) => r.branch_id === header.branch_id && r.product_id === sibling.product_id)
                        .reduce((acc, r) => acc + (r.running_inventory ?? 0), 0);
                        
                    const systemCount = convertBaseQtyToDisplayQty(siblingStock, sibling.unit_count);
                    systemCountAllocations.set(sibling.product_id, systemCount);
                }

                const payloads: PhysicalInventoryDetailUpsertPayload[] = siblingsToLoad.map((sibling) => {
                    const systemCount = systemCountAllocations.get(sibling.product_id) ?? 0;

                    const initialPhysicalCount = 0;
                    const variance = computeVariance(initialPhysicalCount, systemCount);
                    const differenceCost = computeDifferenceCost(variance, sibling.unit_price);
                    const amount = computeAmount(initialPhysicalCount, sibling.unit_price);

                    return {
                        ph_id: header.id,
                        product_id: sibling.product_id,
                        unit_price: sibling.unit_price,
                        system_count: systemCount,
                        physical_count: initialPhysicalCount,
                        variance,
                        difference_cost: differenceCost,
                        amount,
                        offset_match: 0,
                    };
                });

                await createPhysicalInventoryDetailsBulk(payloads);
                await reloadDetails(header.id);

                if (payloads.length > 1) {
                    toast.success(`Added ${payloads.length} variants for family "${variant.product_name}".`);
                } else {
                    toast.success(`Product "${variant.product_name}" added.`);
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Failed to add product family.";
                toast.error(message);
            }
        },
        [canEdit, detailRows, eligibleVariants, header, reloadDetails, runningInventoryRows]
    );

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
        // [AUTO-SAVE COMMENTED OUT]
        // await flushDirtyDetails();
    }, []);

    const handleSaveDraft = React.useCallback(async () => {
        try {
            setIsSavingDetailBatch(true);
            await flushDirtyDetails();
            toast.success("Draft saved successfully.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save draft.";
            toast.error(message);
        } finally {
            setIsSavingDetailBatch(false);
        }
    }, [flushDirtyDetails]);

    const handleRefreshGroups = React.useCallback(async () => {
        try {
            if (!header?.id) return;

            const [nextDetails, nextRunningInventoryRows] =
                await Promise.all([
                    fetchPhysicalInventoryDetails(header.id),
                    refreshRunningInventoryReadModel({ ...filters, cutOffDate: header.cutOff_date }),
                ]);

            setDetailRows(nextDetails);
            dirtyDetailIdsRef.current.clear();

            rebuildGroupedRows({
                nextDetails,
                nextHeader: header,
                nextFilters: filters,
                nextRunningInventoryRows,
            });

            toast.success("Detail view refreshed.");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to refresh details.";
            toast.error(message);
        }
    }, [filters, header, rebuildGroupedRows, refreshRunningInventoryReadModel]);

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
            toast.success("Mock Ledger cancelled successfully.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to cancel PI.";
            toast.error(message);
        } finally {
            setIsCancelling(false);
        }
    }, [canEdit, detailRows, filters, header?.id, onRecordChange, rebuildGroupedRows]);

    const handleCommit = React.useCallback(async () => {
        if (!header?.id) {
            toast.error("This PI must exist before commit.");
            return;
        }

        if (!canEdit) {
            toast.error("This PI can no longer be edited.");
            return;
        }

        try {
            setIsCommitting(true);

            // Flush any unsaved drafts to the DB before committing
            await flushDirtyDetails();

            const updatedHeader = await commitMockLedger(header.id);

            setHeader(updatedHeader);
            onRecordChange?.(updatedHeader);

            rebuildGroupedRows({
                nextDetails: detailRows,
                nextHeader: updatedHeader,
                nextFilters: filters,
            });

            setOpenCommitDialog(false);
            toast.success("Mock Ledger committed successfully.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to commit Mock Ledger.";
            toast.error(message);
        } finally {
            setIsCommitting(false);
        }
    }, [canEdit, detailRows, filters, header?.id, onRecordChange, rebuildGroupedRows, flushDirtyDetails]);

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
                    Loading Mock Ledger module...
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
                                    Mock Ledger
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
                            className="cursor-pointer"
                            onClick={handleRefreshGroups}
                            disabled={
                                isBootLoading ||
                                isLoadingProducts ||
                                isSavingDetailBatch ||
                                isCancelling ||
                                isRebuildingGroups ||
                                !hasLoadedDetails
                            }
                        >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>

                        <Button
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
                            onClick={handleSaveDraft}
                            disabled={!canEdit || isBootLoading || isLoadingProducts || isSavingDetailBatch || isCancelling || isRebuildingGroups}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Draft
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

                        <Button
                            variant="outline"
                            className="cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                            onClick={() => setOpenPrintChoiceDialog(true)}
                            disabled={!hasLoadedDetails}
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>

                        <Button
                            className="cursor-pointer"
                            onClick={() => setOpenCommitDialog(true)}
                            disabled={!canCancelAction || !hasLoadedDetails}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Commit ML
                        </Button>
                    </div>
                </div>
            </div>

            <MockLedgerHeader
                header={header}
                status={status}
                canEdit={canEdit}
                hasLoadedDetails={hasLoadedDetails}
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

            <MockLedgerFiltersCard
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

            <div id="pi-manual-product-finder-sentinel" className="rounded-2xl border bg-background px-4 py-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold tracking-tight">Product Finder</h3>
                        <p className="text-sm text-muted-foreground">
                            Search loaded products and quickly narrow the counting view.
                        </p>
                    </div>

                    <div className="flex w-full items-center gap-2 xl:max-w-xl">
                        <div className="relative w-full">
                            <input
                                value={productSearch}
                                onChange={(event) => setProductSearch(event.target.value)}
                                placeholder="Search product code, name, barcode, UOM..."
                                className="flex h-10 w-full rounded-md border bg-background pl-3 pr-10 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <Button
                            variant="outline"
                            className="cursor-pointer shrink-0"
                            onClick={() => setOpenAddProductDialog(true)}
                            disabled={!canEdit || !header?.id}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
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

            <MockLedgerTable
                rows={visibleGroupedRows}
                isLoading={isBootLoading || isHydratingRecord || isLoadingProducts}
                canEdit={canEdit}
                onPhysicalCountChange={handlePhysicalCountChange}
                onPhysicalCountBlur={handlePhysicalCountBlur}
            />


            <AlertDialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Mock Ledger?</AlertDialogTitle>
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

            <AlertDialog open={openCommitDialog} onOpenChange={setOpenCommitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Commit Mock Ledger?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will finalize the Mock Ledger and make it read-only.
                            Any unresolved SHORT or OVER variances will remain unresolved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                            <ClipboardList className="h-4 w-4" />
                            Variance Summary
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                            <p>SHORT total: ₱ {fmtMoney(shortTotal)}</p>
                            <p>OVER total: ₱ {fmtMoney(overTotal)}</p>
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
                                "Commit ML"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={openPrintChoiceDialog} onOpenChange={setOpenPrintChoiceDialog}>
                <AlertDialogContent className="max-w-md rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold tracking-tight">Print Document</AlertDialogTitle>
                        <AlertDialogDescription>
                            Select the document format you would like to print for this session.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-3 py-3">
                        <button
                            type="button"
                            onClick={() => {
                                const bName = branches.find((b) => b.id == (filters.branch_id ?? header.branch_id))?.branch_name ?? "";
                                const sName = suppliers.find((s) => s.id == (filters.supplier_id ?? header.supplier_id))?.supplier_name ?? "";
                                const pName = priceTypes.find((pt) => pt.price_type_id == (filters.price_type_id ?? header.price_type))?.price_type_name ?? "";
                                const doc = generateAuditSheetPdf({
                                    header,
                                    groupedRows,
                                    branchName: bName,
                                    supplierName: sName,
                                    priceTypeName: pName,
                                });
                                if (previewBlobUrl) {
                                    URL.revokeObjectURL(previewBlobUrl);
                                }
                                const blob = doc.output("blob");
                                const blobUrl = URL.createObjectURL(blob);
                                setPreviewBlobUrl(blobUrl);
                                setActiveDocInstance(doc);
                                setActiveDocName("Mock_Ledger_Audit_Sheet");
                                setOpenPrintChoiceDialog(false);
                                setOpenPreviewDialog(true);
                            }}
                            className="flex flex-col items-start gap-1 rounded-xl border p-4 text-left hover:bg-muted/50 hover:border-primary/50 transition cursor-pointer active:scale-[0.98]"
                        >
                            <span className="font-semibold text-sm">Mock Ledger Audit Sheet</span>
                            <span className="text-xs text-muted-foreground">Prints standard audit sheet with system counts and empty columns for manual input of physical counts.</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const bName = branches.find((b) => b.id == (filters.branch_id ?? header.branch_id))?.branch_name ?? "";
                                const sName = suppliers.find((s) => s.id == (filters.supplier_id ?? header.supplier_id))?.supplier_name ?? "";
                                const pName = priceTypes.find((pt) => pt.price_type_id == (filters.price_type_id ?? header.price_type))?.price_type_name ?? "";
                                const doc = generateAuditReportPdf({
                                    header,
                                    groupedRows,
                                    branchName: bName,
                                    supplierName: sName,
                                    priceTypeName: pName,
                                });
                                if (previewBlobUrl) {
                                    URL.revokeObjectURL(previewBlobUrl);
                                }
                                const blob = doc.output("blob");
                                const blobUrl = URL.createObjectURL(blob);
                                setPreviewBlobUrl(blobUrl);
                                setActiveDocInstance(doc);
                                setActiveDocName("Mock_Ledger_Audit_Report");
                                setOpenPrintChoiceDialog(false);
                                setOpenPreviewDialog(true);
                            }}
                            className="flex flex-col items-start gap-1 rounded-xl border p-4 text-left hover:bg-muted/50 hover:border-primary/50 transition cursor-pointer active:scale-[0.98]"
                        >
                            <span className="font-semibold text-sm">Mock Ledger Audit Report</span>
                            <span className="text-xs text-muted-foreground">Prints an audit report with the inputted physical counts displayed in the UOM columns.</span>
                        </button>
                        
                        <div className="flex flex-col gap-3 rounded-xl border p-4 text-left transition bg-card">
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold text-sm">Mock Ledger Manual Tally Sheet</span>
                                <span className="text-xs text-muted-foreground">Prints MEN2 MARKETING CORPORATION manual tally sheet for counting on-hand inventory.</span>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 pt-2 border-t border-dashed">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warehouseman</label>
                                <select
                                    value={selectedWarehousemanId ?? ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedWarehousemanId(val ? Number(val) : null);
                                    }}
                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">-- Select Warehouseman --</option>
                                    {warehousemen.map((u) => (
                                        <option key={u.user_id} value={u.user_id}>
                                            {u.user_fname} {u.user_lname} {u.user_position ? `(${u.user_position})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Button
                                type="button"
                                onClick={async () => {
                                    if (!selectedWarehousemanId) {
                                        toast.error("Please select a warehouseman first.");
                                        return;
                                    }
                                    const bName = branches.find((b) => b.id == (filters.branch_id ?? header.branch_id))?.branch_name ?? "";
                                    const sName = suppliers.find((s) => s.id == (filters.supplier_id ?? header.supplier_id))?.supplier_name ?? "";
                                    const wName = (() => {
                                        const found = warehousemen.find((w) => w.user_id === selectedWarehousemanId);
                                        return found ? `${found.user_fname} ${found.user_lname}` : "";
                                    })();
                                    const supplierId = filters.supplier_id ?? header.supplier_id;
                                    const priceTypeId = filters.price_type_id ?? header.price_type ?? null;
                                    const branchId = filters.branch_id ?? header.branch_id;

                                    // Build all supplier product variants (not just detail rows)
                                    // Use the "All" category so no category filter is applied
                                    const allCategoryId = lookupBundle?.categories.find(
                                        (c) => c.is_all_category
                                    )?.category_id ?? 0;

                                    const allSupplierVariants = lookupBundle && supplierId
                                        ? buildEligibleVariants({
                                            supplierId: Number(supplierId),
                                            categoryId: allCategoryId,
                                            priceTypeId: Number(priceTypeId ?? 0),
                                            lookup: lookupBundle,
                                        })
                                        : [];

                                    // Group them the same way the screen does
                                    const allSupplierGroupedRows = buildGroupedPhysicalInventoryRows({
                                        branch_id: Number(branchId ?? 0),
                                        variants: allSupplierVariants,
                                        details: detailRows,
                                        runningInventoryRows,
                                        ph_id: header?.id ?? null,
                                        ignoreRfid: true,
                                    });

                                    const doc = await generateManualTallySheetPdf({
                                        header,
                                        groupedRows: allSupplierGroupedRows,
                                        branchName: bName,
                                        supplierName: sName,
                                        warehousemanName: wName,
                                    });
                                    if (previewBlobUrl) {
                                        URL.revokeObjectURL(previewBlobUrl);
                                    }
                                    const blob = doc.output("blob");
                                    const blobUrl = URL.createObjectURL(blob);
                                    setPreviewBlobUrl(blobUrl);
                                    setActiveDocInstance(doc);
                                    setActiveDocName("Mock_Ledger_Manual_Tally_Sheet");
                                    setOpenPrintChoiceDialog(false);
                                    setOpenPreviewDialog(true);
                                }}
                                className="w-full rounded-xl mt-1 text-xs font-semibold cursor-pointer active:scale-95 transition-all text-white bg-primary hover:bg-primary/90"
                            >
                                Generate Manual Tally Sheet
                            </Button>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer rounded-xl">Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={openPreviewDialog} onOpenChange={(open) => {
                setOpenPreviewDialog(open);
                if (!open && previewBlobUrl) {
                    URL.revokeObjectURL(previewBlobUrl);
                    setPreviewBlobUrl(null);
                    setActiveDocInstance(null);
                }
            }}>
                <AlertDialogContent style={{ maxWidth: "80rem" }} className="w-[90vw] h-[92vh] flex flex-col justify-between rounded-2xl p-6">
                    <AlertDialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
                        <div>
                            <AlertDialogTitle className="text-lg font-bold tracking-tight">
                                {activeDocName.replace(/_/g, " ")}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-muted-foreground">
                                Preview the generated document format below.
                            </AlertDialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="cursor-pointer rounded-xl font-semibold border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300 hover:scale-105 active:scale-95 transition-all text-xs"
                                onClick={() => {
                                    if (activeDocInstance) {
                                        const filename = `${activeDocName}_${header?.ph_no || header?.id}.pdf`;
                                        activeDocInstance.save(filename);
                                    }
                                }}
                            >
                                Download PDF
                            </Button>
                            <AlertDialogCancel
                                className="cursor-pointer rounded-xl border border-input hover:bg-accent text-xs"
                                onClick={() => {
                                    setOpenPreviewDialog(false);
                                    if (previewBlobUrl) {
                                        URL.revokeObjectURL(previewBlobUrl);
                                        setPreviewBlobUrl(null);
                                        setActiveDocInstance(null);
                                    }
                                }}
                            >
                                Close
                            </AlertDialogCancel>
                        </div>
                    </AlertDialogHeader>

                    <div className="flex-1 min-h-0 py-4 bg-muted/10 flex items-center justify-center rounded-xl overflow-hidden mt-3">
                        {previewBlobUrl ? (
                            <iframe
                                src={`${previewBlobUrl}#toolbar=0`}
                                className="w-full h-full border-0 rounded-xl shadow-inner"
                            />
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating preview...
                            </div>
                        )}
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <MockLedgerAddProductDialog
                open={openAddProductDialog}
                onOpenChange={setOpenAddProductDialog}
                eligibleVariants={eligibleVariants}
                existingProductIds={new Set(detailRows.map((d) => d.product_id))}
                onAdd={handleAddProduct}
            />

            {groupedRows.length > 0 && (
                <>
                    {/* Floating Save Draft & Eye Toggle (Bottom-Right Stack) */}
                    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end transition-all duration-300 pointer-events-none">
                        {canEdit && (
                            <Button
                                className="rounded-full h-12 w-12 p-0 bg-emerald-500/30 hover:bg-emerald-500/60 text-emerald-600 dark:text-emerald-300 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all shrink-0 pointer-events-auto"
                                onClick={handleSaveDraft}
                                disabled={isSavingDetailBatch}
                                title="Save Draft"
                            >
                                {isSavingDetailBatch ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Save className="h-5 w-5" />
                                )}
                            </Button>
                        )}

                        {!isToolbarExpanded && (
                            <Button
                                className="rounded-full h-12 w-12 p-0 bg-primary/30 hover:bg-primary/60 text-primary-foreground shadow-lg shadow-primary/40 hover:scale-105 active:scale-95 transition-all shrink-0 pointer-events-auto"
                                onClick={() => setIsToolbarExpanded(true)}
                                title="Show search bar"
                            >
                                <Eye className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {/* Floating Search Bar (Bottom-Center Expanded) */}
                    {isToolbarExpanded && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-[9999] transition-all duration-300 pointer-events-none">
                            <div className="flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-primary/20 shadow-[0_-10px_50px_rgba(0,0,0,0.25)] rounded-full p-2 ring-1 ring-black/5 pointer-events-auto">
                                <div className="relative flex-1 bg-muted/40 rounded-full border border-transparent focus-within:bg-background transition-all">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                                    <input
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        placeholder="Search loaded products..."
                                        className="h-12 w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none text-sm pl-12 pr-10 placeholder:text-muted-foreground/50"
                                    />
                                    {Boolean(productSearch) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                                            onClick={() => setProductSearch("")}
                                            title="Clear search"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-12 w-12 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsToolbarExpanded(false)}
                                    title="Hide search bar"
                                >
                                    <EyeOff className="h-5 w-5" />
                                </Button>
                                <Button
                                    className="rounded-full h-12 w-12 p-0 bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:scale-105 active:scale-95 transition-all shrink-0"
                                    onClick={() => setOpenAddProductDialog(true)}
                                    disabled={!canEdit}
                                    title="Add Product Manually"
                                >
                                    <Plus className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}