export type PaymentTerm = "cash_with_order" | "cash_on_delivery" | "terms";

export type PendingApprovalPO = {
    id: string;

    // normalized convenience fields
    poNumber?: string;
    supplierName?: string;
    branchName?: string;
    createdAt?: string;
    total?: number;

    raw?: any;

    // directus fields
    purchase_order_id?: number | string;
    purchase_order_no?: string;
    date?: string;
    date_encoded?: string;

    gross_amount?: any;
    discounted_amount?: any;
    vat_amount?: any;
    withholding_tax_amount?: any;
    total_amount?: any;

    supplier_name?: any; // number OR expanded object
    supplier_name_value?: any;
    supplier_name_text?: string;

    branch_id?: any; // number OR expanded object
    branch_id_value?: any;
    branch_summary?: string;
};

export type PurchaseOrderItem = {
    // directus purchase_order_items fields (optional)
    po_item_id?: any;
    purchase_order_id?: any;
    line_no?: any;
    item_name?: string;
    item_description?: any;
    uom?: string;
    qty?: any;
    unit_price?: any;
    line_subtotal?: any;
    tax_rate?: any;
    tax_amount?: any;
    discount_amount?: any;
    line_total?: any;
    expected_date?: any;
    notes?: any;
    supplier_id?: any;
    currency?: any;
    created_at?: any;
    updated_at?: any;

    // compatibility (optional)
    name?: string;
    quantity?: any;
    price?: any;
    total?: any;
};

export type PurchaseOrderDetail = {
    // normalized convenience fields
    id?: string;
    poNumber?: string;
    supplierName?: string;
    apBalance?: number;
    items?: PurchaseOrderItem[];
    raw?: any;

    // directus purchase_order fields
    purchase_order_id?: number | string;
    purchase_order_no?: string;
    date?: string;
    date_encoded?: string;

    supplier_name?: any; // expanded {supplier_name, ap_balance} or number
    supplier_name_value?: any;
    supplier_name_text?: string;

    branch_id?: any; // expanded branch object or number
    branch_id_value?: any;
    branch_summary?: string;

    lead_time_payment?: any;
    payment_type?: any;
    payment_status?: any;
    receipt_required?: any;

    gross_amount?: any;
    discounted_amount?: any;
    vat_amount?: any;
    withholding_tax_amount?: any;
    total_amount?: any;

    // optional convenience duplicates
    grossAmount?: any;
    discountAmount?: any;
    vatAmount?: any;
    ewtGoods?: any;
    total?: any;
};
export type Supplier = {
    id: string;
    name: string;
    terms?: string | null;
    apBalance?: number;
    raw?: any;
};

export type Branch = {
    id: number;
    name: string;
    code?: string;
    raw?: any;
};

export type Product = {
    id: string;
    name: string;
    sku: string;
    brand: string;
    category: string;
    price: number;
    uom: string;
    availableUoms?: string[];
    raw?: any;
};

export type CartItem = Product & {
    orderQty: number;
    selectedUom: string;
};

export type CartLineItem = CartItem & {
    branchId: number;
};
