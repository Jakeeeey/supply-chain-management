//src/modules/supply-chain-management/traceability-compliance/product-tracing/types.ts

export type ProductMovementRow = {
    ts: string;
    productId: number;
    parentId: number | null;
    productName: string;
    unit: string;
    unitCount: number;
    brand: string | null;
    category: string | null;
    branchId: number;
    branchName: string;
    docNo: string;
    docType: string;
    inBase: number;
    outBase: number;
    descr: string | null;
    supplierId: number | null;
    supplierName: string | null;
    familyUnit: string | null;
    familyUnitCount: number | null;
    // Client-side computed
    balance?: number;
};

export type ProductTracingFiltersType = {
    branch_id: number | null;
    parent_id: number | null;
    startDate: string | null;
    endDate: string | null;
};

export type ProductFamilyRow = {
    parent_id: number;
    product_name: string; // The base name for the family
    product_code: string | null;
    category_name?: string;
    brand_name?: string;
    short_description?: string;
};
