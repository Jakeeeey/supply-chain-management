export interface Salesman {
    id: number;
    salesman_code: string;
    salesman_name: string;
}

export interface Branch {
    id: number;
    branch_name: string;
}

export interface Supplier {
    id: number;
    supplier_shortcut: string | null;
}

export interface DiscountType {
    id: number;
    discount_type: string;
    total_percent: number;
}

export interface Customer {
    id: number;
    customer_code: string;
    customer_name: string;
}

export interface SalesOrder {
    order_id: number;
    order_no: string;
    po_no: string;
    order_date: string;
    created_date: string | null;
    total_amount: number | null;
    allocated_amount: number | null;
    order_status: string;
    
    // New fields for Modal
    receipt_type: {
        type: string;
        isOfficial?: number | string | null;
    } | null;
    net_amount: number | null;
    discount_amount: number | null;
    remarks: string | null;
    
    for_approval_at: string | null;
    for_consolidation_at: string | null;
    for_picking_at: string | null;
    for_invoicing_at: string | null;
    for_loading_at: string | null;
    for_shipping_at: string | null;
    delivered_at: string | null;

    // Relationships (nested from Directus)
    supplier_id: Supplier | null;
    customer_code: Customer | null;
    salesman_id: Salesman | null;
    branch_id: Branch | null;
}

export interface InvoicingFilters {
    orderNo?: string;
    poNo?: string;
    customer?: string;
    salesman?: string;
    supplier?: string;
    branch?: string;
    fromDate?: string;
    toDate?: string;
}

export interface LogisticsData {
    pdp_no: string;
    consolidation_no: string;
    dispatch_no: string;
}

export interface CustomerGroup {
    customer_code: string;
    customer_name: string;
    orders: SalesOrder[];
    total_amount: number;
    order_count: number;
}

export interface ConversionItem {
    product_id: number;
    product_name: string;
    consolidator_no: string;
    order_no: string;
    ordered_quantity: number;
    picked_quantity: number;
    applied_quantity: number;
    remaining_quantity: number;
    unit_price: number;
    discount_type: number | null;
    discount_amount: number;
    net_amount: number;
    unit_shortcut: string;
}

export interface ConversionData {
    items: ConversionItem[];
    max_receipt_length: number;
    is_official?: number | string | null;
    discount_types: DiscountType[];
    customer?: {
        customer_name: string;
        store_name?: string;
        customer_tin: string;
        province: string;
        city: string;
        brgy: string;
    };
    payment_name?: string;
}
