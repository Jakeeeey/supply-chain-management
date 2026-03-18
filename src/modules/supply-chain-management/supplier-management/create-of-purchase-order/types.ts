// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/types.ts

export type Supplier = {
    id: string;
    name: string;
    terms: string;
    apBalance: number;
    supplierType: string;
    raw?: unknown;
};

export type Branch = {
    id: number;
    name: string;
    code?: string;
    raw?: unknown;
};

export type DiscountType = {
    id: string;
    name: string;
    percent: number;
};

export type Product = {
    id: string;
    name: string;
    sku: string;
    brand: string;
    category: string;

    // ✅ price is now "PRICE PER BOX"
    price: number;
    raw?: unknown;
    // ✅ Always BOX in UI
    uom: string; // "BOX"
    uomId?: number; // 11

    // For audit/debug
    baseUnitPrice?: number; // original price_per_unit
    baseUomId?: number; // original unit_of_measurement (raw)
    unitsPerBox?: number; // how many base units in 1 BOX (derived)

    // ✅ Fixed per supplier-product
    discountTypeId?: string;

    // keep compat
    availableUoms?: string[];
};

export type CartItem = Product & {
    orderQty: number;      // ✅ qty in BOXES
    selectedUom: string;   // "BOX"
    brand: string;
};

export type BranchAllocation = {
    branchId: string;
    branchName: string;
    items: CartItem[];
};
export type CartLineItem = CartItem & {
    branchId: number;
};
