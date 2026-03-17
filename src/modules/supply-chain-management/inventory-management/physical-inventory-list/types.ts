export type PhysicalInventoryListStatus =
    | "Pending"
    | "Committed"
    | "Cancelled";

export type PhysicalInventoryListRow = {
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

    branch_name: string | null;
    supplier_name: string | null;
    category_name: string | null;
    price_type_name: string | null;
    status: PhysicalInventoryListStatus;
};

export type PhysicalInventoryListFilters = {
    search: string;
    branch_id: number | null;
    supplier_id: number | null;
    status: PhysicalInventoryListStatus | "All";
};