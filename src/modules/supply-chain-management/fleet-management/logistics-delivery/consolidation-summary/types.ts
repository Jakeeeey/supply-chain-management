// View Model Types

export interface SpringBootConsolidationOrder {
    orderId: number;
    orderNo: string;
    customerName: string;
    salesmanName: string;
    orderDate: string;
    createdDate: string;
    approvedDate: string;
    allocatedAmount: number;
    clusterName: string | null;
    consolidatorNo: string | null;
}

export interface CustomerGroupRaw {
    id: string;
    customerName: string;
    salesmanName: string;
    orders: SpringBootConsolidationOrder[];
}

export interface ClusterGroupRaw {
    clusterId: string;
    clusterName: string;
    customers: CustomerGroupRaw[];
}

// Final Flattened Row for Table (GROUPED)
export interface TableRow {
    uniqueId: string;
    clusterName: string;
    customerName: string;
    salesmanName: string;
    clusterRowSpan: number;
    customerRowSpan: number;
    orderDate: string; // YYYY-MM-DD day key
    createdDate: string;
    approvedDate: string;
    status: string;
    amount: number;
    consolidation: number;
    clusterTotal: number;
}

export type DateRange =
    | "yesterday"
    | "today"
    | "this-week"
    | "this-month"
    | "this-year"
    | "custom";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
    key: keyof TableRow;
    direction: SortDirection;
}

export interface PrintConfig {
    cluster: string[];
    salesman: string;
    status: string;
}

export type ClusterFilterValue = string | string[];
