// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/types.ts

export type Product = {
    id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    uom: string;
    availableUoms?: string[];
};

export type CartItem = Product & {
    orderQty: number;
    selectedUom: string;
};

export type BranchAllocation = {
    branchId: string;
    branchName: string;
    items: CartItem[];
};

export type Supplier = {
    id: string;
    name: string;
    terms: string;
    apBalance: number;
};

export type Branch = {
    id: string;
    name: string;
};

export type CreatePoState = {
    selectedSupplier: Supplier | null;
    selectedBranches: BranchAllocation[];
    poNumber: string;
    poDate: string;
};

export type ProductPickerState = {
    open: boolean;
    activeBranchId: string | null;
    tempCart: CartItem[];
    searchQuery: string;
    selectedCategory: string;
};
