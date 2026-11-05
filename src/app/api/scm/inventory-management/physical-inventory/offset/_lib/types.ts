export type PhysicalInventoryHeaderApiRow = {
    id: number;
    ph_no: string;
    date_encoded: string;
    cutOff_date: string | null;
    starting_date: string | null;
    price_type: string | number | null;
    stock_type: string | null;
    branch_id: number | null;
    remarks: string | null;
    isComitted: unknown;
    isCancelled: unknown;
    total_amount: number | null;
    supplier_id: number | null;
    category_id: number | null;
    encoder_id: number | null;
};

export type PhysicalInventoryDetailApiRow = {
    id: number;
    ph_id: number;
    date_encoded: string;
    product_id: number;
    unit_price: number | null;
    system_count: number | null;
    physical_count: number | null;
    variance: number | null;
    difference_cost: number | null;
    amount: number | null;
    offset_match: number | null;
};

export type ProductApiRow = {
    product_id: number;
    isActive?: number | null;
    parent_id: number | null;
    product_name: string;
    short_description: string | null;
    product_code: string;
    unit_of_measurement_count: number | null;
};

export type BranchApiRow = {
    id: number;
    branch_name: string;
    branch_code: string | null;
    branch_description: string | null;
};

export type SupplierApiRow = {
    id: number;
    supplier_name: string;
    supplier_shortcut: string | null;
    supplier_type: string | null;
    isActive: number | null;
};

export type CategoryApiRow = {
    category_id: number;
    category_name: string;
};