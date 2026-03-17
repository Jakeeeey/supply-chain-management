import type {
    GroupedPhysicalInventoryChildRow,
    PhysicalInventoryHeaderRow,
    PhysicalInventoryStatus,
} from "../physical-inventory-management/types";

export type OffsetDirection = "SHORT" | "OVER";

export type OffsettingSelectableRow = GroupedPhysicalInventoryChildRow & {
    offset_direction: OffsetDirection;
    row_id: number;
    product_label: string;
    selection_amount: number;
};

export type PhysicalInventoryOffsetGroup = {
    id: string;
    ph_id: number;
    created_at: string;
    short_rows: OffsettingSelectableRow[];
    over_rows: OffsettingSelectableRow[];
    short_total: number;
    over_total: number;
    difference: number;
};

export type PhysicalInventoryOffsettingReportMeta = {
    branch_name: string;
    supplier_name: string;
    category_name: string;
};

export type PhysicalInventoryOffsettingSnapshot = {
    header: PhysicalInventoryHeaderRow;
    status: PhysicalInventoryStatus;
    rows: OffsettingSelectableRow[];
    reportMeta: PhysicalInventoryOffsettingReportMeta;
};