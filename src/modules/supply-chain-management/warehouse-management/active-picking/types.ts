// types.ts

export interface ConsolidatorDetailsDto {
    id: number;
    productId: number;
    productName?: string; // 🚀 Added ? to fix the string | undefined error
    barcode?: string;
    brandName?: string;
    categoryName?: string;
    unitName?: string;
    unitOrder?: number;   // 🚀 Ensure this is here!
    orderedQuantity: number;
    pickedQuantity: number;
    pickedAt?: string;
    pickedBy?: number;
}

export interface ConsolidatorDto {
    id: number;
    consolidatorNo: string;
    status: string;
    branchId: number;
    branchName: string;
    checkedBy?: number;
    details: ConsolidatorDetailsDto[];
}

export interface BranchDto {
    id: number;
    branchName: string;
    branchCode: string;
    city?: string;
}

export interface PaginatedPickingBatches {
    content: ConsolidatorDto[];
    totalPages: number;
    totalElements: number;
    number: number;
}