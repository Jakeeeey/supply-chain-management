// ==========================================
// CORE CONSOLIDATOR (PICKING BATCHES)
// ==========================================

export interface ConsolidatorDetailsDto {
    id: number;
    productId: number;
    orderedQuantity: number;
    pickedQuantity: number;
    appliedQuantity: number;
    pickedAt?: string;
    pickedBy?: number;

    // 🚀 ENRICHED FIELDS (Joined from Backend)
    productName?: string;
    barcode?: string;
    brandName?: string;
    categoryName?: string;
    supplierName?: string;
    unitName?: string;
}

// src/app/scm/warehouse-management/consolidation/delivery-picking/types.ts

export interface ConsolidatorDispatchesDto {
    id: number;
    dispatchNo: string;
    createdAt: string;
    status: string;
    // 🚀 Add these new fields from our Spring Boot joins
    driverName: string | null;
    clusterName: string | null;
}

export interface SKUCardProps {
    detail: ConsolidatorDetailsDto;
}
// types/index.ts or wherever your DTOs live
export interface ConsolidatorDto {
    id: number;
    consolidatorNo: string;
    status: 'Pending' | 'Picking' | 'Picked' | 'Audited';
    branchId: number;     // 🚀 NEW
    branchName: string;   // 🚀 NEW
    createdBy: number;
    checkedBy?: number;
    createdAt: string;
    updatedAt: string;
    details: ConsolidatorDetailsDto[];
    dispatches: ConsolidatorDispatchesDto[];
}
// ==========================================
// API RESPONSES & PAGINATION
// ==========================================

export interface PaginatedConsolidators {
    content: ConsolidatorDto[];
    totalPages: number;
    totalElements: number;
    number: number; // Current page index
}

// ==========================================
// WAREHOUSE PICKER ASSIGNMENTS (SUPPLIERS & USERS)
// ==========================================

export interface UserDto {
    user_id: number;
    user_fname: string;
    user_lname: string;
    user_position: string;
    email?: string;
}

export interface SupplierDto {
    supplier_id: number;
    supplier_name: string;
    assignedCount?: number; // 🚀 New field from backend
}
export interface PickerAssignmentDto {
    id: number; // Junction table ID
    userId: number;
    userName: string; // Enriched: fname + lname
    supplierId: number;
    supplierName: string; // Enriched
    isActive: boolean;
    assignedAt: string; // ISO Date String
}

export interface BranchDto {
    id: number;
    branchName: string;
    branchCode: string;
    city?: string;
}

export interface ConsolidationPreviewItem {
    productId: number;
    productName: string;
    supplierShortcut?: string;
    brand?: string;
    category?: string;
    unit?: string;
    totalAllocated: number;
    runningInventory: number;
}