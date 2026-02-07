export type PaymentTerm = "cash_with_order" | "cash_on_delivery" | "terms";

/**
 * Keep your existing fields, but make them optional + add Directus fields so UI never breaks.
 */
export type PendingApprovalPO = {
    id: string;

    // your original
    poNumber?: string;
    supplierName?: string;
    branchName?: string;
    createdAt?: string;
    total?: number;
    raw?: any;

    // directus common
    purchase_order_id?: number | string;
    purchase_order_no?: string;
    date?: string;
    date_encoded?: string;
    total_amount?: any;

    supplier_name?: any; // number OR expanded object
    branch_id?: any;
};

export type PurchaseOrderItem = {
    // your original fields
    name?: string;
    qty?: number;
    price?: number;
    total?: number;

    // directus common shape (optional)
    id?: any;
    product_id?: any; // number or expanded object {id, product_name}
    product_name?: string;
    quantity?: any;
    unit_price?: any;
    total_amount?: any;
};

export type PurchaseOrderDetail = {
    // your original fields
    id?: string;
    poNumber?: string;
    supplierName?: string;
    apBalance?: number;
    items?: PurchaseOrderItem[];
    subtotal?: number;
    discount?: number;
    tax?: number;
    ewt?: number;
    total?: number;
    raw?: any;

    // directus fields used by approval UI
    purchase_order_id?: number | string;
    purchase_order_no?: string;
    date?: string;
    date_encoded?: string;

    supplier_name?: any; // number or expanded {supplier_name, ap_balance}
    branch_id?: any;

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
};
