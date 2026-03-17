"use client";
import * as React from "react";
import {
    createPhysicalInventoryHeader,
    fetchBranches,

fetchCategoriesBySupplier,
    fetchLatestCutoff,
    fetchPriceTypes,
    fetchSuppliers,
    loadPhysicalInventoryProducts,
} from "../providers/fetchProvider";
import type {
    Branch,
    Category,
    LoadProductsResponse,
    PhysicalInventoryFiltersValue,
    PhysicalInventoryHeader,
    PhysicalInventoryHeaderCreatePayload,
    PriceType,
    Supplier,
} from "../types";
import { groupDetailCandidates } from "../utils/grouping";
const initialFilters: PhysicalInventoryFiltersValue = {
    branchId: null,
    supplierId: null,
    categoryId: null,
    priceTypeId: null,
    stockType: "ALL",
};
export function usePhysicalInventory() {
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [priceTypes, setPriceTypes] = React.useState<PriceType[]>([]);
    const [filters, setFilters] =
        React.useState<PhysicalInventoryFiltersValue>(initialFilters);
    const [header, setHeader] = React.useState<PhysicalInventoryHeader |
        null>(null);
    const [latestCutoff, setLatestCutoff] = React.useState<string | null>(null);
    const [loadResult, setLoadResult] = React.useState<LoadProductsResponse |
        null>(null);
    const [isBootstrapping, setIsBootstrapping] = React.useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = React.useState(false);
    const [isCreatingHeader, setIsCreatingHeader] = React.useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const groupedRows = React.useMemo(() => {
        return loadResult ? groupDetailCandidates(loadResult.details) : [];

    }, [loadResult]);
    const bootstrap = React.useCallback(async () => {
        try {
            setIsBootstrapping(true);
            setError(null);
            const [branchRows, supplierRows, priceTypeRows] = await Promise.all([
                fetchBranches(),
                fetchSuppliers(),
                fetchPriceTypes(),
            ]);
            setBranches(branchRows);
            setSuppliers(supplierRows);
            setPriceTypes(priceTypeRows.sort((a, b) => (a.sort ?? 0) - (b.sort ??
                0)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to initialize module.");
        } finally {
            setIsBootstrapping(false);
        }
    }, []);
    React.useEffect(() => {
        void bootstrap();
    }, [bootstrap]);
    React.useEffect(() => {
        async function run(): Promise<void> {
            if (!filters.branchId) {
                setLatestCutoff(null);
                return;
            }
            try {
                const result = await fetchLatestCutoff(filters.branchId);
                setLatestCutoff(result.last_cutoff);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch latest cutoff.");
            }
        }
        void run();
    }, [filters.branchId]);
    React.useEffect(() => {
        async function run(): Promise<void> {
            if (!filters.supplierId) {

                setCategories([]);
                setFilters((prev) => ({ ...prev, categoryId: null }));
                return;
            }
            try {
                setIsLoadingCategories(true);
                const rows = await fetchCategoriesBySupplier(filters.supplierId);
                setCategories(rows);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch categories.");
            } finally {
                setIsLoadingCategories(false);
            }
        }
        void run();
    }, [filters.supplierId]);
    const createHeader = React.useCallback(
        async (payload: PhysicalInventoryHeaderCreatePayload):
        Promise<PhysicalInventoryHeader> => {
            try {
                setIsCreatingHeader(true);
                setError(null);
                const created = await createPhysicalInventoryHeader(payload);
                setHeader(created);
                return created;
            } finally {
                setIsCreatingHeader(false);
            }
        },
        [],
    );
    const loadProducts = React.useCallback(async (): Promise<void> => {
        if (!header?.id) throw new Error("Create the physical inventory header first.");
        if (!filters.branchId || !filters.supplierId || !filters.categoryId || !
            filters.priceTypeId) {
            throw new Error("Branch, supplier, category, and price type are required.");
        }
        try {
            setIsLoadingProducts(true);
            setError(null);

            const result = await loadPhysicalInventoryProducts({
                phId: header.id,
                branchId: filters.branchId,
                supplierId: filters.supplierId,
                categoryId: filters.categoryId,
                priceTypeId: filters.priceTypeId,
            });
            setLoadResult(result);
        } finally {
            setIsLoadingProducts(false);
        }
    }, [filters, header?.id]);
    return {
        branches,
        suppliers,
        categories,
        priceTypes,
        filters,
        setFilters,
        latestCutoff,
        header,
        createHeader,
        groupedRows,
        loadResult,
        loadProducts,
        isBootstrapping,
        isLoadingCategories,
        isCreatingHeader,
        isLoadingProducts,
        error,
    };
}
