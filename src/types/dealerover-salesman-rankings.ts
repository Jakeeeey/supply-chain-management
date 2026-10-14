export interface DealerListItem {
    dealer_id: number;
    dealer_name: string | null;
    dealer_code: string;
    directus: string | null;
    directus_token: string | null;
    status?: string | null;
    is_default?: number | boolean;
}

export interface DealerSalesmanItem {
    id: number;
    salesman_code: string;
    salesman_name: string;
}

export interface DealerSalesInvoiceItem {
    invoice_id: number;
    net_amount: number | null;
    salesman_id: number | null;
    invoice_date: string | null;
}

export interface SalesmanRankingEntry {
    rank: number;
    salesman_id: number;
    salesman_code: string;
    salesman_name: string;
    dealer_id: number;
    dealer_name: string;
    dealer_code: string;
    total_net_amount: number;
    total_invoices: number;
}

export interface DealerStatusCheckpoint {
    dealer_id: number;
    dealer_name: string;
    dealer_code: string;
    is_online: boolean;
    is_default?: boolean;
    error_message?: string;
}

export interface RankingsApiResponse {
    success: boolean;
    from: string;
    to: string;
    totalDealersCount: number;
    onlineDealersCount: number;
    totalSalesmenCount: number;
    totalRevenue: number;
    dealerStatuses: DealerStatusCheckpoint[];
    rankings: SalesmanRankingEntry[];
    error?: string;
}
