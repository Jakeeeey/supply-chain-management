// Product-related types
export type Product = {
    id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    uom: string; // Unit of Measure
    availableUoms?: string[]; // Available unit of measurement options
};

export type CartItem = Product & {
    orderQty: number;
    selectedUom: string; // Selected unit of measurement
};

// Branch-related types
export type Branch = {
    id: string;
    name: string;
};

export type BranchAllocation = {
    branchId: string;
    branchName: string;
    items: CartItem[];
};

// Supplier-related types
export type Supplier = {
    id: string;
    name: string;
    terms: string;
};

// Purchase Order types
export type PurchaseOrder = {
    poNumber: string;
    supplier: Supplier | null;
    branches: BranchAllocation[];
    subtotal: number;
    tax: number;
    total: number;
    createdAt: Date;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
};

// User types
export type User = {
    name: string;
    role: string;
    initials: string;
};