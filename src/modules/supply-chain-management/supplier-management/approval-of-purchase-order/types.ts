export type PaymentTerm = {
    id: number;
    payment_name: string;
    payment_days: number;
    payment_description?: string;
};

export type PendingApprovalPO = {
    id: string;

    // normalized convenience fields
    poNumber?: string;
    supplierName?: string;
    branchName?: string;
    createdAt?: string;
    total?: number;

    raw?: unknown;

    // directus fields
    purchase_order_id?: number | string;
    purchase_order_no?: string;
    date?: string;
    date_encoded?: string;

    gross_amount?: unknown;
    discounted_amount?: unknown;
    vat_amount?: unknown;
    withholding_tax_amount?: unknown;
    total_amount?: unknown;

    supplier_name?: unknown; // number OR expanded object
    supplier_name_value?: unknown;
    supplier_name_text?: string;

    branch_id?: unknown; // number OR expanded object
    branch_id_value?: unknown;
    branch_summary?: string;

    is_invoice?: boolean | number;
    isInvoice?: boolean | number;
};

export type PurchaseOrderItem = {
    // directus purchase_order_items fields (optional)
    po_item_id?: unknown;
    purchase_order_id?: unknown;
    line_no?: unknown;
    item_name?: string;
    item_description?: unknown;
    uom?: string;
    qty?: unknown;
    unit_price?: unknown;
    line_subtotal?: unknown;
    tax_rate?: unknown;
    tax_amount?: unknown;
    discount_amount?: unknown;
    line_total?: unknown;
    expected_date?: unknown;
    notes?: unknown;
    supplier_id?: unknown;
    currency?: unknown;
    created_at?: unknown;
    updated_at?: unknown;

    // compatibility (optional)
    name?: string;
    quantity?: unknown;
    price?: unknown;
    total?: unknown;
};

export type PurchaseOrderDetail = {
    // normalized convenience fields
    id?: string;
    poNumber?: string;
    supplierName?: string;
    apBalance?: number;
    items?: PurchaseOrderItem[];
    raw?: unknown;

    // directus purchase_order fields
    purchase_order_id?: number | string;
    purchase_order_no?: string;
    date?: string;
    date_encoded?: string;

    supplier_name?: unknown; // expanded {supplier_name, ap_balance} or number
    supplier_name_value?: unknown;
    supplier_name_text?: string;

    branch_id?: unknown; // expanded branch object or number
    branch_id_value?: unknown;
    branch_summary?: string;

    lead_time_payment?: unknown;
    payment_type?: unknown;
    payment_status?: unknown;
    receipt_required?: unknown;

    gross_amount?: unknown;
    discounted_amount?: unknown;
    vat_amount?: unknown;
    withholding_tax_amount?: unknown;
    total_amount?: unknown;

    // optional convenience duplicates
    grossAmount?: unknown;
    discountAmount?: unknown;
    vatAmount?: unknown;
    ewtGoods?: unknown;
    total?: unknown;

    is_invoice?: boolean | number;
    isInvoice?: boolean | number;
    preparer_name?: string;
    encoder_id?: unknown;
};
export type Supplier = {
    id: string;
    name: string;
    terms?: string | null;
    apBalance?: number;
    raw?: unknown;
};

export type Branch = {
    id: number;
    name: string;
    code?: string;
    raw?: unknown;
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
    raw?: unknown;
};

export type CartItem = Product & {
    orderQty: number;
    selectedUom: string;
};

export type CartLineItem = CartItem & {
    branchId: number;
};
