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
    supplier_name: string | null;
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
        id: number;
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
    not_fulfilled_at: string | null;

    // Recycled order — pre-existing invoice data
    existing_invoice_no: number | null;           // invoice_id (integer FK for details)
    existing_invoice_display_no: string | null;   // invoice_no string shown in UI

    // Void re-invoicing — voided invoice that needs replacement
    void_invoice_id: number | null;               // invoice_id of the voided invoice
    void_invoice_display_no: string | null;        // invoice_no of the voided invoice

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
}

export interface LogisticsData {
    pdp_no: string;
    consolidation_no: string;
    dispatch_no: string;
    dispatch_date?: string; // Added for sorting and identification
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
    allocated_quantity: number;
    total_allocated_quantity: number;
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
    total_allocated_quantity?: number;
    total_picked_quantity?: number;
}

export interface ORFieldConfig {
    x: number;
    y: number;
    fontSize: number;
    fontFamily: 'courier' | 'helvetica' | 'times';
    fontWeight: 'normal' | 'bold';
    label: string;
    charSpacing?: number; // spacing in points (jsPDF unit)
    scaleX?: number;      // horizontal scaling (1.0 = 100%)
}

export interface ORTemplate {
    id: string;
    name: string;
    width: number;
    height: number;
    backgroundImage?: string; // base64
    fields: Record<string, ORFieldConfig>;
    tableSettings: {
        startY: number;
        rowHeight: number;
        fontSize: number;
        product_name_width?: number; // width in mm
        columns?: {
            product_name?: { x: number };
            quantity?: { x: number };
            unit_price?: { x: number };
            discount?: { x: number };
            net_amount?: { x: number };
        };
    };
}
