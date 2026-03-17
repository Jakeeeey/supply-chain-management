import type {
    BranchRow,
    CategoryRow,
    GroupedPhysicalInventoryChildRow,
    PhysicalInventoryFiltersType,
    PhysicalInventoryHeaderRow,
    PhysicalInventoryStatus,
    ProductLookupBundle,
    RunningInventoryRow,
    SupplierRow,
} from "../../physical-inventory-management/types";
import {
    buildGroupedPhysicalInventoryRows,
    buildVariantsFromSavedDetails,
    commitPhysicalInventory,
    derivePhysicalInventoryStatus,
    fetchBranches,
    fetchPhysicalInventoryById,
    fetchPhysicalInventoryDetails,
    fetchPhysicalInventoryRfidCountByHeader,
    fetchProductLookupBundle,
    fetchRunningInventoryFiltered,
    fetchSuppliers,
    getSupplierScopedCategoriesFromLookup,
    resolveRunningInventoryFilterParams,
} from "../../physical-inventory-management";
import type {
    OffsetDirection,
    OffsettingSelectableRow,
    PhysicalInventoryOffsettingReportMeta,
    PhysicalInventoryOffsettingSnapshot,
} from "../types";

function toSelectionAmount(row: GroupedPhysicalInventoryChildRow): number {
    const diffCost = Math.abs(row.difference_cost ?? 0);
    if (diffCost > 0) return diffCost;

    const amount = Math.abs(row.amount ?? 0);
    if (amount > 0) return amount;

    return Math.abs(row.variance_base ?? row.variance ?? 0);
}

function toProductLabel(row: GroupedPhysicalInventoryChildRow): string {
    const code = (row.product_code ?? "").trim();
    const name = (row.product_name ?? "").trim();

    if (code && name) return `${code} - ${name}`;
    if (name) return name;
    if (code) return code;
    return `Product #${row.product_id}`;
}

function toSelectableRow(
    row: GroupedPhysicalInventoryChildRow,
    direction: OffsetDirection,
): OffsettingSelectableRow {
    return {
        ...row,
        offset_direction: direction,
        row_id: row.detail_id || row.product_id,
        product_label: toProductLabel(row),
        selection_amount: toSelectionAmount(row),
    };
}

async function fetchRunningInventoryForHeader(args: {
    header: PhysicalInventoryHeaderRow;
    branches: BranchRow[];
    suppliers: SupplierRow[];
    lookup: ProductLookupBundle;
}): Promise<RunningInventoryRow[]> {
    const { header, branches, suppliers, lookup } = args;

    const filters: PhysicalInventoryFiltersType = {
        branch_id: header.branch_id,
        supplier_id: header.supplier_id,
        category_id: header.category_id,
        price_type_id: header.price_type,
    };

    if (
        !filters.branch_id ||
        !filters.supplier_id ||
        !filters.category_id ||
        !filters.price_type_id
    ) {
        return [];
    }

    const params = resolveRunningInventoryFilterParams({
        branchId: filters.branch_id,
        supplierId: filters.supplier_id,
        categoryId: filters.category_id,
        branches,
        suppliers,
        lookup,
    });

    return fetchRunningInventoryFiltered(params);
}

function buildReportMeta(args: {
    header: PhysicalInventoryHeaderRow;
    branches: BranchRow[];
    suppliers: SupplierRow[];
    lookup: ProductLookupBundle;
}): PhysicalInventoryOffsettingReportMeta {
    const { header, branches, suppliers, lookup } = args;

    const branchName =
        branches.find((row) => row.id === header.branch_id)?.branch_name ?? "";

    const supplierName =
        suppliers.find((row) => row.id === header.supplier_id)?.supplier_name ?? "";

    const scopedCategories: CategoryRow[] = header.supplier_id
        ? getSupplierScopedCategoriesFromLookup(header.supplier_id, lookup)
        : [];

    const categoryName =
        scopedCategories.find((row) => row.category_id === header.category_id)?.category_name ?? "";

    return {
        branch_name: branchName,
        supplier_name: supplierName,
        category_name: categoryName,
    };
}

export async function loadPhysicalInventoryOffsettingSnapshot(
    phId: number,
): Promise<PhysicalInventoryOffsettingSnapshot> {
    const [header, details, branches, suppliers, lookup, rfidCountByDetailId] =
        await Promise.all([
            fetchPhysicalInventoryById(phId),
            fetchPhysicalInventoryDetails(phId),
            fetchBranches(),
            fetchSuppliers(),
            fetchProductLookupBundle(),
            fetchPhysicalInventoryRfidCountByHeader(phId),
        ]);

    const runningInventoryRows = await fetchRunningInventoryForHeader({
        header,
        branches,
        suppliers,
        lookup,
    });

    const priceTypeId = header.price_type;
    const reportMeta = buildReportMeta({
        header,
        branches,
        suppliers,
        lookup,
    });

    if (!priceTypeId || !header.branch_id) {
        return {
            header,
            status: derivePhysicalInventoryStatus({
                isCancelled: header.isCancelled,
                isComitted: header.isComitted,
            }),
            rows: [],
            reportMeta,
        };
    }

    const variants = buildVariantsFromSavedDetails({
        details,
        priceTypeId,
        lookup,
    });

    const groupedRows = buildGroupedPhysicalInventoryRows({
        branch_id: header.branch_id,
        variants,
        details,
        runningInventoryRows,
        ph_id: header.id,
        rfidCountByDetailId,
    });

    const flattenedRows = groupedRows.flatMap((group) => group.rows);
    const selectableRows = flattenedRows
        .filter((row) => row.variance !== 0 || row.variance_base !== 0)
        .map((row) =>
            row.variance < 0
                ? toSelectableRow(row, "SHORT")
                : toSelectableRow(row, "OVER"),
        );

    const status: PhysicalInventoryStatus = derivePhysicalInventoryStatus({
        isCancelled: header.isCancelled,
        isComitted: header.isComitted,
    });

    return {
        header,
        status,
        rows: selectableRows,
        reportMeta,
    };
}

export async function commitPhysicalInventoryFromOffsetting(
    phId: number,
): Promise<PhysicalInventoryHeaderRow> {
    return commitPhysicalInventory(phId);
}