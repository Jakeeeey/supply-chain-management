//src/modules/supply-chain-management/physical-inventory-management/utils/compute.ts
import type {
    CategoryRow,
    LoadProductsValidation,
    PhysicalInventoryFiltersType,
    PhysicalInventoryStatus,
} from "../types";

export function toNumberSafe(value: unknown, fallback = 0): number {
    const num =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number(value)
                : Number.NaN;

    return Number.isFinite(num) ? num : fallback;
}

export function roundTo(value: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

export function coalesceNumber(value: number | null | undefined, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

type BufferFlagLike = {
    type?: string;
    data?: unknown;
};

export function normalizeFlagValue(
    value: number | null | undefined | BufferFlagLike,
    fallback = 0,
): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "data" in value &&
        Array.isArray(value.data) &&
        value.data.length > 0
    ) {
        const first = value.data[0];
        if (typeof first === "number" && Number.isFinite(first)) {
            return first;
        }
    }

    return fallback;
}

export function computeVariance(
    physicalCount: number | null | undefined,
    systemCount: number | null | undefined,
): number {
    return coalesceNumber(physicalCount) - coalesceNumber(systemCount);
}

export function computeVarianceBase(
    variance: number | null | undefined,
    unitCount: number | null | undefined,
): number {
    return coalesceNumber(variance) * normalizeUnitCount(unitCount);
}

export function computeDifferenceCost(
    variance: number | null | undefined,
    unitPrice: number | null | undefined,
): number {
    return roundTo(coalesceNumber(variance) * coalesceNumber(unitPrice));
}

export function computeAmount(
    physicalCount: number | null | undefined,
    unitPrice: number | null | undefined,
): number {
    return roundTo(coalesceNumber(physicalCount) * coalesceNumber(unitPrice));
}

export function normalizeUnitCount(value: number | null | undefined): number {
    const count = coalesceNumber(value, 1);
    return count > 0 ? count : 1;
}

export function derivePhysicalInventoryStatus(input: {
    isCancelled: number | null | undefined | BufferFlagLike;
    isComitted: number | null | undefined | BufferFlagLike;
}): PhysicalInventoryStatus {
    const isCancelled = normalizeFlagValue(input.isCancelled);
    const isComitted = normalizeFlagValue(input.isComitted);

    if (isCancelled === 1) return "Cancelled";
    if (isComitted === 1) return "Committed";
    return "Pending";
}

export function canEditPhysicalInventory(input: {
    isCancelled: number | null | undefined | BufferFlagLike;
    isComitted: number | null | undefined | BufferFlagLike;
}): boolean {
    return derivePhysicalInventoryStatus(input) === "Pending";
}

export function requiresRfid(): boolean {
    return false;
}

export function isAllCategoryName(categoryName: string | null | undefined): boolean {
    return (categoryName ?? "").trim().toLowerCase() === "all";
}

export function isAllCategoryRow(category: CategoryRow | null | undefined): boolean {
    if (!category) return false;
    return isAllCategoryName(category.category_name);
}

export function isAllCategorySelected(
    categoryId: number | null,
    categories: CategoryRow[],
): boolean {
    if (categoryId === null) return false;

    const selected = categories.find((row) => row.category_id === categoryId);
    return isAllCategoryRow(selected);
}

export function validateLoadProductsFilters(
    filters: PhysicalInventoryFiltersType,
): LoadProductsValidation {
    if (!filters.branch_id) {
        return { ok: false, message: "Branch is required." };
    }

    if (!filters.supplier_id) {
        return { ok: false, message: "Supplier is required." };
    }

    if (!filters.category_id) {
        return { ok: false, message: "Category is required." };
    }

    if (!filters.price_type_id) {
        return { ok: false, message: "Price type is required." };
    }

    return { ok: true, message: null };
}

export function sumHeaderTotalAmount(
    rows: Array<{ amount: number | null | undefined }>,
): number {
    return roundTo(
        rows.reduce((acc, row) => acc + coalesceNumber(row.amount), 0),
    );
}

export function formatDateInputValue(value: string | null | undefined): string {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";

    if (trimmed.includes("T")) {
        return trimmed.slice(0, 10);
    }

    if (trimmed.includes(" ")) {
        return trimmed.slice(0, 10);
    }

    return trimmed;
}
export function convertBaseQtyToDisplayQty(
    baseQty: number | null | undefined,
    unitCount: number | null | undefined,
): number {
    const normalizedBaseQty = coalesceNumber(baseQty);
    const normalizedUnitCount = normalizeUnitCount(unitCount);

    return roundTo(normalizedBaseQty / normalizedUnitCount, 6);
}

export function convertDisplayQtyToBaseQty(
    displayQty: number | null | undefined,
    unitCount: number | null | undefined,
): number {
    const normalizedDisplayQty = coalesceNumber(displayQty);
    const normalizedUnitCount = normalizeUnitCount(unitCount);

    return roundTo(normalizedDisplayQty * normalizedUnitCount, 6);
}