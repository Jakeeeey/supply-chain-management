// types.ts

export interface ConsolidatorDetailsDto {
    id: number;
    productId: number;
    orderedQuantity: number;
    pickedQuantity: number;
    appliedQuantity: number;
    pickedAt?: string;
    pickedBy?: number;

    // 🚀 Add these computed fields from Spring Boot
    productName?: string;
    barcode?: string;
    unitOrder?: number;
    brandName?: string;
    categoryName?: string;
    supplierName?: string;
    unitName?: string;
}
export interface ConsolidatorDto {
    id: number;
    consolidatorNo: string;
    status: string;
    branchId: number;
    branchName: string;
    checkedBy?: number;
    details?: ConsolidatorDetailsDto[]; // Made optional
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