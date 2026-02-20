export interface DeliveryDetail {
    clusterName: string;
    customerName: string;
    fulfilled: number;
    notFulfilled: number;
    fulfilledWithReturns: number;
    fulfilledWithConcerns: number;
}

export interface LogisticsRecord {
    id: string;
    truckPlate: string;
    driver: string;
    deliveries: DeliveryDetail[];
}

export interface FlattenedLogisticsRow extends DeliveryDetail {
    truckPlate: string;
    driver: string;
    rowTotal: number;
}

export type DateRange = 'yesterday' | 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'this-year' | 'custom';
export type SortDirection = 'asc' | 'desc';
export type SortKey = 'truckPlate' | 'driver' | 'clusterName' | 'customerName' | 'total' | 'fulfilled' | 'notFulfilled' | 'fulfilledWithReturns' | 'fulfilledWithConcerns';

export type PrintStatus = 'all' | 'fulfilled' | 'notFulfilled' | 'returns' | 'concerns';
export type PrintDateRange = 'yesterday' | 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'this-year' | 'custom';

export interface PrintFilters {
    cluster: string;
    customer: string;
    driver: string;
    status: PrintStatus;
    dateRange: PrintDateRange;
    customFrom: string;
    customTo: string;
}

export interface FilterOptions {
    clusters: string[];
    customers: string[];
    drivers: string[];
}
