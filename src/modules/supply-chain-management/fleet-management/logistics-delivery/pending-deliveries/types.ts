// View Model Types

export interface ApiSalesOrder {
    order_id: number;
    order_no: string;
    customer_code: string;
    order_status: string;
    allocated_amount?: number;
    total_amount?: number;
    order_date: string;
    salesman_id: number;
}

export interface CustomerGroupRaw {
    id: string;
    customerName: string;
    salesmanName: string;
    orders: ApiSalesOrder[];
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
    status: string;
    amount: number;
    approval: number;
    consolidation: number;
    picking: number;
    invoicing: number;
    loading: number;
    shipping: number;
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
