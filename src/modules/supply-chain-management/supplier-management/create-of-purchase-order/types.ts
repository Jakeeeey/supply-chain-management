// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/types.ts

export interface Supplier {
    id: number;
    supplier_name: string;
    address: string;
    tin_number: string;
    payment_terms: string;
    supplier_image?: string;
    apBalance?: number; // Computed or fetched separately
}

export interface Branch {
    id: number;
    branch_name: string;
    branch_code: string;
    isMoving: number;
}

export interface Product {
    product_id: number;
    product_name: string;
    product_code: string | null;
    price_per_unit: number; // Mapped from JSON "price_per_unit"
    unit_of_measurement: number; // ID of UOM
    category_id: number; // Mapped from relation
    description: string | null;
}

export interface ProductCategory {
    category_id: number;
    category_name: string;
}

// Intermediary table for filtering
export interface ProductSupplierLink {
    id: number;
    product_id: number;
    supplier_id: number;
}

// The Cart Item (Product + Selection State)
export interface CartItem extends Product {
    orderQty: number;
    selectedUom: string; // Placeholder for UOM name
    branchId: number; // Which branch this specific item is for
    totalAmount: number;
}

export interface BranchAllocation {
    branchId: number;
    branchName: string;
    items: CartItem[];
}