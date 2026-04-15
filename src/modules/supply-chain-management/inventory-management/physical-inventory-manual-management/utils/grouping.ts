import type {
    EligibleVariantRow,
    GroupedPhysicalInventoryChildRow,
    GroupedPhysicalInventoryRow,
    PhysicalInventoryDetailRow,
    PhysicalInventoryDetailUpsertPayload,
    RunningInventoryRow,
} from "../types";
import {
    coalesceNumber,
    computeAmount,
    computeDifferenceCost,
    computeVariance,
    computeVarianceBase,
    convertBaseQtyToDisplayQty,
    normalizeUnitCount,
    requiresRfid,
} from "./compute";

type BuildGroupedRowsParams = {
    branch_id: number;
    variants: EligibleVariantRow[];
    details?: PhysicalInventoryDetailRow[];
    runningInventoryRows?: RunningInventoryRow[];
    ph_id?: number | null;
    rfidCountByDetailId?: Record<number, number>;
};

function familyKeyOf(row: { parent_id: number | null; product_id: number }): number {
    return row.parent_id ?? row.product_id;
}

function getBaseVariant(rows: EligibleVariantRow[]): EligibleVariantRow {
    const exactBase = rows.find((row) => row.parent_id === null);
    if (exactBase) return exactBase;

    const sorted = [...rows].sort(
        (a, b) => normalizeUnitCount(a.unit_count) - normalizeUnitCount(b.unit_count),
    );

    return sorted[0];
}

function buildRunningInventoryMap(
    rows: RunningInventoryRow[],
): Map<string, RunningInventoryRow> {
    const map = new Map<string, RunningInventoryRow>();

    for (const row of rows) {
        map.set(`${row.branch_id}-${row.product_id}`, row);
    }

    return map;
}

function buildDetailMap(
    rows: PhysicalInventoryDetailRow[],
): Map<number, PhysicalInventoryDetailRow> {
    const map = new Map<number, PhysicalInventoryDetailRow>();

    for (const row of rows) {
        map.set(row.product_id, row);
    }

    return map;
}

export function buildGroupedPhysicalInventoryRows(
    params: BuildGroupedRowsParams,
): GroupedPhysicalInventoryRow[] {
    const {
        branch_id,
        variants,
        details = [],
        runningInventoryRows = [],
        ph_id = null,
        rfidCountByDetailId = {},
    } = params;

    const detailMap = buildDetailMap(details);
    const runningMap = buildRunningInventoryMap(runningInventoryRows);

    const familyMap = new Map<number, EligibleVariantRow[]>();

    for (const variant of variants) {
        const familyKey = familyKeyOf(variant);
        const bucket = familyMap.get(familyKey) ?? [];
        bucket.push(variant);
        familyMap.set(familyKey, bucket);
    }

    const groupedRows: GroupedPhysicalInventoryRow[] = [];

    for (const [familyKey, familyVariants] of familyMap.entries()) {
        const baseVariant = getBaseVariant(familyVariants);

        const ordered = [...familyVariants].sort((a, b) => {
            const countDiff = normalizeUnitCount(b.unit_count) - normalizeUnitCount(a.unit_count);
            if (countDiff !== 0) return countDiff;
            return a.product_id - b.product_id;
        });

        const childRows: GroupedPhysicalInventoryChildRow[] = ordered.map((variant) => {
            const detail = detailMap.get(variant.product_id);
            const detailId = detail?.id ?? null;

            const matchedRunning = runningMap.get(`${branch_id}-${variant.product_id}`);
            const unitCount = normalizeUnitCount(variant.unit_count);

            // running inventory is base quantity; convert it to the row UOM for display/use
            const fallbackSystemCount = convertBaseQtyToDisplayQty(
                matchedRunning?.running_inventory,
                unitCount,
            );

            const systemCount = coalesceNumber(detail?.system_count, fallbackSystemCount);

            const rfidCount =
                detailId !== null
                    ? coalesceNumber(rfidCountByDetailId[detailId], 0)
                    : 0;

            const isRfidRow = requiresRfid();
            const physicalCount = isRfidRow
                ? rfidCount
                : coalesceNumber(detail?.physical_count, 0);

            const variance = computeVariance(physicalCount, systemCount);
            const varianceBase = computeVarianceBase(variance, unitCount);
            const differenceCost = computeDifferenceCost(variance, variant.unit_price);
            const amount = computeAmount(physicalCount, variant.unit_price);

            return {
                family_key: familyKey,
                product_id: variant.product_id,
                parent_id: variant.parent_id,

                product_code: variant.product_code,
                product_name: variant.product_name,
                barcode: variant.barcode,

                category_id: variant.category_id,
                category_name: variant.category_name,

                unit_id: variant.unit_id,
                unit_name: variant.unit_name,
                unit_shortcut: variant.unit_shortcut,
                unit_order: variant.unit_order,
                unit_count: unitCount,

                unit_price: variant.unit_price,

                detail_id: detailId,
                ph_id: detail?.ph_id ?? ph_id,

                system_count: systemCount,
                physical_count: physicalCount,
                variance,
                variance_base: varianceBase,
                difference_cost: differenceCost,
                amount,

                requires_rfid: isRfidRow,
                rfid_count: rfidCount,
            };
        });

        groupedRows.push({
            family_key: familyKey,
            base_product_id: baseVariant.product_id,
            base_product_name: baseVariant.product_name,
            base_product_code: baseVariant.product_code,
            base_barcode: baseVariant.barcode,
            category_name: baseVariant.category_name,

            total_system_count_base: childRows.reduce(
                (acc, row) => acc + row.system_count * row.unit_count,
                0,
            ),
            total_physical_count_base: childRows.reduce(
                (acc, row) => acc + row.physical_count * row.unit_count,
                0,
            ),
            total_variance_base: childRows.reduce(
                (acc, row) => acc + row.variance_base,
                0,
            ),
            total_difference_cost: childRows.reduce(
                (acc, row) => acc + row.difference_cost,
                0,
            ),
            total_amount: childRows.reduce(
                (acc, row) => acc + row.amount,
                0,
            ),

            rows: childRows,
        });
    }

    return groupedRows.sort((a, b) => {
        const nameDiff = a.base_product_name.localeCompare(b.base_product_name);
        if (nameDiff !== 0) return nameDiff;
        return a.base_product_id - b.base_product_id;
    });
}

type BuildLoadPayloadParams = {
    ph_id: number;
    branch_id: number;
    variants: EligibleVariantRow[];
    runningInventoryRows: RunningInventoryRow[];
};

export function buildPhysicalInventoryDetailPayloads(
    params: BuildLoadPayloadParams,
): PhysicalInventoryDetailUpsertPayload[] {
    const { ph_id, branch_id, variants, runningInventoryRows } = params;

    const runningMap = buildRunningInventoryMap(runningInventoryRows);

    return variants.map((variant) => {
        const matchedRunning = runningMap.get(`${branch_id}-${variant.product_id}`);
        const unitCount = normalizeUnitCount(variant.unit_count);

        const systemCount = convertBaseQtyToDisplayQty(
            matchedRunning?.running_inventory,
            unitCount,
        );

        const initialPhysicalCount = 0;
        const variance = computeVariance(initialPhysicalCount, systemCount);
        const differenceCost = computeDifferenceCost(variance, variant.unit_price);
        const amount = computeAmount(initialPhysicalCount, variant.unit_price);

        return {
            ph_id,
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
}