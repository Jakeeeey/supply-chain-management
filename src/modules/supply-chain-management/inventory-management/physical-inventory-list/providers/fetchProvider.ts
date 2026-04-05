import type {
    BranchRow,
    CategoryRow,
    PhysicalInventoryHeaderRow,
    PriceTypeRow,
    SupplierRow,
} from "@/modules/supply-chain-management/inventory-management/physical-inventory-management";
import {
    derivePhysicalInventoryStatus,
    fetchBranches,
    fetchCategories,
    fetchPhysicalInventoryList,
    fetchPriceTypes,
    fetchSuppliers,
    normalizeFlagValue,
} from "@/modules/supply-chain-management/inventory-management/physical-inventory-management";

import type { PhysicalInventoryListRow } from "../types";

export async function fetchPhysicalInventoryListRows(): Promise<{
    rows: PhysicalInventoryListRow[];
    branches: BranchRow[];
    suppliers: SupplierRow[];
}> {
    const [headers, branches, suppliers, categories, priceTypes] = await Promise.all([
        fetchPhysicalInventoryList(),
        fetchBranches(),
        fetchSuppliers(),
        fetchCategories(),
        fetchPriceTypes(),
    ]);

    const branchMap = new Map<number, BranchRow>(
        branches.map((row) => [row.id, row]),
    );

    const supplierMap = new Map<number, SupplierRow>(
        suppliers.map((row) => [row.id, row]),
    );

    const categoryMap = new Map<number, CategoryRow>(
        categories.map((row) => [row.category_id, row]),
    );

    const priceTypeMap = new Map<number, PriceTypeRow>(
        priceTypes.map((row) => [row.price_type_id, row]),
    );

    const rows: PhysicalInventoryListRow[] = headers.map(
        (header: PhysicalInventoryHeaderRow): PhysicalInventoryListRow => {
            const normalizedIsCancelled = normalizeFlagValue(
                header.isCancelled as number | null | undefined,
            );
            const normalizedIsComitted = normalizeFlagValue(
                header.isComitted as number | null | undefined,
            );

            const status = derivePhysicalInventoryStatus({
                isCancelled: normalizedIsCancelled,
                isComitted: normalizedIsComitted,
            });

            return {
                id: header.id,
                ph_no: header.ph_no,
                date_encoded: header.date_encoded,
                cutOff_date: header.cutOff_date,
                starting_date: header.starting_date,
                price_type: header.price_type,
                stock_type: header.stock_type,
                branch_id: header.branch_id,
                remarks: header.remarks,
                isComitted: normalizedIsComitted,
                isCancelled: normalizedIsCancelled,
                total_amount: header.total_amount,
                supplier_id: header.supplier_id,
                category_id: header.category_id,
                encoder_id: typeof header.encoder_id === "object" && header.encoder_id !== null ? Number((header.encoder_id as { user_id: string | number }).user_id) : (header.encoder_id as number | null),

                branch_name: header.branch_id
                    ? branchMap.get(header.branch_id)?.branch_name ?? null
                    : null,
                supplier_name: header.supplier_id
                    ? supplierMap.get(header.supplier_id)?.supplier_name ?? null
                    : null,
                category_name: header.category_id
                    ? categoryMap.get(header.category_id)?.category_name ?? null
                    : null,
                price_type_name: header.price_type
                    ? priceTypeMap.get(header.price_type)?.price_type_name ?? null
                    : null,
                status,
            };
        },
    );

    return {
        rows,
        branches,
        suppliers,
    };
}