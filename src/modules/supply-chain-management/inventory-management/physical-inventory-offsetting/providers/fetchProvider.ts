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
    PhysicalInventoryOffsetGroup,
    PhysicalInventoryOffsettingReportMeta,
    PhysicalInventoryOffsettingSnapshot,
} from "../types";

function toSelectionAmount(row: GroupedPhysicalInventoryChildRow): number {
    return Math.abs(row.difference_cost ?? 0);
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
    offsetMatch: number | null,
    offsetRemarks: string | null,
): OffsettingSelectableRow {
    return {
        ...row,
        offset_direction: direction,
        row_id: row.detail_id || row.product_id,
        product_label: toProductLabel(row),
        selection_amount: toSelectionAmount(row),
        offset_match: offsetMatch,
        offset_remarks: offsetRemarks,
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

    const encoder = header.encoder_id;
    let encoderName = "—";
    if (encoder && typeof encoder === "object") {
        const first = encoder.user_fname || "";
        const last = encoder.user_lname || "";
        encoderName = `${first} ${last}`.trim() || "—";
    } else if (encoder) {
        encoderName = `ID: ${encoder}`;
    }

    return {
        branch_name: branchName,
        supplier_name: supplierName,
        category_name: categoryName,
        encoder_name: encoderName,
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
            initialGroups: [],
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
        ignoreRfid: true,
    });

    const detailMetaMap = new Map<number, { match: number | null; remarks: string | null }>();
    for (const d of details) {
        detailMetaMap.set(d.id, {
            match: d.offset_match ?? null,
            remarks: d.offset_remarks ?? null,
        });
    }

    const flattenedRows = groupedRows.flatMap((group) => group.rows);
    const selectableRows = flattenedRows
        .filter((row) => row.variance !== 0 || row.variance_base !== 0)
        .map((row) => {
            const meta = detailMetaMap.get(row.detail_id ?? 0) || { match: null, remarks: null };
            return row.variance < 0
                ? toSelectableRow(row, "SHORT", meta.match, meta.remarks)
                : toSelectableRow(row, "OVER", meta.match, meta.remarks);
        });

    const groupsByMatch = new Map<
        number,
        {
            short_rows: OffsettingSelectableRow[];
            over_rows: OffsettingSelectableRow[];
            remarks: string | null;
        }
    >();

    for (const row of selectableRows) {
        const match = row.offset_match;
        if (match && match > 0) {
            if (!groupsByMatch.has(match)) {
                groupsByMatch.set(match, {
                    short_rows: [],
                    over_rows: [],
                    remarks: row.offset_remarks || null,
                });
            }
            const g = groupsByMatch.get(match)!;
            if (row.offset_direction === "SHORT") {
                g.short_rows.push(row);
            } else {
                g.over_rows.push(row);
            }
            if (!g.remarks && row.offset_remarks) {
                g.remarks = row.offset_remarks;
            }
        }
    }

    const initialGroups: PhysicalInventoryOffsetGroup[] = Array.from(groupsByMatch.entries())
        .sort(([a], [b]) => a - b)
        .map(([matchNumber, groupData]) => {
            const short_total = groupData.short_rows.reduce((acc, r) => acc + r.selection_amount, 0);
            const over_total = groupData.over_rows.reduce((acc, r) => acc + r.selection_amount, 0);
            return {
                id: `offset-match-${matchNumber}`,
                ph_id: header.id,
                created_at: header.date_encoded || new Date().toISOString(),
                short_rows: groupData.short_rows,
                over_rows: groupData.over_rows,
                short_total,
                over_total,
                difference: short_total - over_total,
                offset_match: matchNumber,
                remarks: groupData.remarks ?? undefined,
            };
        });

    const status: PhysicalInventoryStatus = derivePhysicalInventoryStatus({
        isCancelled: header.isCancelled,
        isComitted: header.isComitted,
    });

    return {
        header,
        status,
        rows: selectableRows,
        initialGroups,
        reportMeta,
    };
}

export async function commitPhysicalInventoryFromOffsetting(
    phId: number,
): Promise<PhysicalInventoryHeaderRow> {
    return commitPhysicalInventory(phId);
}