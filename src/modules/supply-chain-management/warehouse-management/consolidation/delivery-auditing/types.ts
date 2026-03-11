export interface ConsolidatorDetailsDto {
    id: number;
    productId: number;
    productName?: string;
    barcode?: string;
    brandName?: string;
    categoryName?: string;
    supplierName?: string;
    unitName?: string;
    unitOrder?: number;
    orderedQuantity: number;
    pickedQuantity: number;
    pickedAt?: string;
    pickedBy?: number;
}

export interface ConsolidatorDispatchesDto {
    id: number;
    dispatchNo: string;
    driverName: string;
    clusterName: string;
    status: string;
    createdAt: string;
}

export interface ConsolidatorDto {
    id: number;
    consolidatorNo: string;
    status: string;
    branchId: number;
    branchName: string;
    createdBy?: number;
    checkedBy?: number;
    createdAt: string;
    updatedAt: string;
    details: ConsolidatorDetailsDto[];
    dispatches: ConsolidatorDispatchesDto[];
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