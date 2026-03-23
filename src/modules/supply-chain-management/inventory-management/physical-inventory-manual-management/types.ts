//src/modules/supply-chain-management/physical-inventory-management/types.ts
export type PhysicalInventoryStatus =
    | "Pending"
    | "Committed"
    | "Cancelled";

export type ID = number;

export type SelectOption = {
    label: string;
    value: number;
};

export type BranchRow = {
    id: number;
    branch_name: string;
};

export type SupplierRow = {
    id: number;
    supplier_name: string;
    supplier_shortcut: string | null;
    isActive?: number | null;
    supplier_type?: string | null;

};

export type CategoryRow = {
    category_id: number;
    category_name: string;
    is_all_category?: boolean;
};

export type PriceTypeRow = {
    price_type_id: number;
    price_type_name: string;
    sort: number | null;
};

export type RfidOnhandApiRow = {
    productId: number;
};

export type RfidOnhandResult = {
    ok: boolean;
    item: RfidOnhandApiRow | null;
    message?: string;
};

export type UnitRow = {
    unit_id: number;
    unit_name: string | null;
    unit_shortcut: string | null;
    order: number | null;
};

export type ProductRow = {
    product_id: number;
    parent_id: number | null;

    product_code: string | null;
    product_name: string;
    barcode: string | null;

    product_category: number | null;
    product_brand: number | null;

    unit_of_measurement: number | null;
    unit_of_measurement_count: number | null;

    isActive: number;
};

export type ProductPerSupplierRow = {
    id: number;
    product_id: number;
    supplier_id: number;

};

export type ProductPerPriceTypeRow = {
    id: number;
    product_id: number;
    price_type_id: number;
    price: number | null;
};

export type PhysicalInventoryHeaderRow = {
    id: number;
    ph_no: string | null;
    date_encoded: string | null;
    cutOff_date: string | null;
    starting_date: string | null;
    price_type: number | null;
    stock_type: string | null;
    branch_id: number | null;
    remarks: string | null;
    isComitted: number;
    isCancelled: number;
    total_amount: number | null;
    supplier_id: number | null;
    category_id: number | null;
    encoder_id: number | null;

    // optional future-ready field
    isPending?: number;
};

export type PhysicalInventoryDetailRow = {
    id: number;
    ph_id: number;
    date_encoded: string | null;
    product_id: number;
    unit_price: number | null;
    system_count: number | null;
    physical_count: number | null;
    variance: number | null;
    difference_cost: number | null;
    amount: number | null;
    offset_match: number | null;
};

export type PhysicalInventoryDetailRFIDRow = {
    id: number;
    pi_detail_id: number;
    rfid_tag: string;
    created_at: string | null;
    created_by: number | null;
};

export type PhysicalInventoryHeaderUpsertPayload = {
    ph_no?: string | null;
    cutOff_date: string | null;
    starting_date: string | null;
    price_type: number | null;
    stock_type?: string | null;
    branch_id: number | null;
    remarks?: string | null;
    supplier_id: number | null;
    category_id: number | null;
    encoder_id?: number | null;
    isComitted?: number;
    isCancelled?: number;
    total_amount?: number | null;

    // optional future-ready field
    isPending?: number;
};

export type PhysicalInventoryDetailUpsertPayload = {
    ph_id: number;
    product_id: number;
    unit_price: number | null;
    system_count: number | null;
    physical_count: number | null;
    variance: number | null;
    difference_cost: number | null;
    amount: number | null;
    offset_match: number | null;
};

export type RunningInventoryApiRow = {
    id: string;
    productId: number;
    supplierId: number;
    branchId: number;
    productCode: string | null;
    productName: string;
    productBarcode: string | null;
    productBrand: string | null;
    productCategory: string | null;
    unitName: string | null;
    unitCount: number | null;
    branchName: string | null;
    lastCutoff: string | null;
    lastCount: number | null;
    movementAfter: number | null;
    runningInventory: number | null;
    supplierShortcut: string | null;
};

export type RunningInventoryRow = {
    id: string;
    product_id: number;
    supplier_id: number;
    branch_id: number;
    product_code: string | null;
    product_name: string;
    product_barcode: string | null;
    product_brand: string | null;
    product_category: string | null;
    unit_name: string | null;
    unit_count: number | null;
    branch_name: string | null;
    last_cutoff: string | null;
    last_count: number | null;
    movement_after: number | null;
    running_inventory: number | null;
    supplier_shortcut: string | null;
};

export type PhysicalInventoryFiltersType = {
    branch_id: number | null;
    supplier_id: number | null;
    category_id: number | null;
    price_type_id: number | null;
};

export type LoadProductsValidation = {
    ok: boolean;
    message: string | null;
};

export type EligibleVariantRow = {
    product_id: number;
    parent_id: number | null;

    product_code: string | null;
    product_name: string;
    barcode: string | null;

    category_id: number | null;
    category_name: string | null;

    unit_id: number | null;
    unit_name: string | null;
    unit_shortcut: string | null;
    unit_order: number | null;
    unit_count: number;

    unit_price: number | null;
};

export type GroupedPhysicalInventoryChildRow = {
    family_key: number;
    product_id: number;
    parent_id: number | null;

    product_code: string | null;
    product_name: string;
    barcode: string | null;

    category_id: number | null;
    category_name: string | null;

    unit_id: number | null;
    unit_name: string | null;
    unit_shortcut: string | null;
    unit_order: number | null;
    unit_count: number;

    unit_price: number | null;

    detail_id: number | null;
    ph_id: number | null;

    system_count: number;
    physical_count: number;
    variance: number;
    variance_base: number;
    difference_cost: number;
    amount: number;

    requires_rfid: boolean;
    rfid_count: number;
};

export type GroupedPhysicalInventoryRow = {
    family_key: number;
    base_product_id: number;
    base_product_name: string;
    base_product_code: string | null;
    base_barcode: string | null;
    category_name: string | null;

    total_system_count_base: number;
    total_physical_count_base: number;
    total_variance_base: number;
    total_difference_cost: number;
    total_amount: number;

    rows: GroupedPhysicalInventoryChildRow[];
};

export type PhysicalInventoryListRow = PhysicalInventoryHeaderRow & {
    branch_name?: string | null;
    supplier_name?: string | null;
    category_name?: string | null;
    price_type_name?: string | null;
    encoder_name?: string | null;
    status_text?: PhysicalInventoryStatus;
};

export type ProductLookupBundle = {
    products: ProductRow[];
    product_per_supplier: ProductPerSupplierRow[];
    product_per_price_type: ProductPerPriceTypeRow[];
    categories: CategoryRow[];
    units: UnitRow[];
};

export type LoadProductsResult = {
    detail_payloads: PhysicalInventoryDetailUpsertPayload[];
    grouped_preview: GroupedPhysicalInventoryRow[];
    eligible_variants: EligibleVariantRow[];
};

export type DirectusItemsResponse<T> = {
    data: T[];
};

export type DirectusItemResponse<T> = {
    data: T;
};