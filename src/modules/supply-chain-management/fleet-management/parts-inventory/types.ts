export type PartStockStatus = "available" | "low_stock" | "out_of_stock";
export type PartStockStatusFilter = "all" | PartStockStatus | "needs_attention";

export type PartMovementType =
  | "Receiving"
  | "Issue"
  | "Return"
  | "Adjustment"
  | "Damage";

export type PartReservationStatus =
  | "Reserved"
  | "Partially Issued"
  | "Issued"
  | "Returned"
  | "Cancelled";

export type BranchStock = {
  id: number;
  branchId: number | null;
  branchName: string | null;
  stockOnHand: number;
  reservedQuantity: number;
  damagedQuantity: number;
  availableQuantity: number;
  lastMovementAt: string | null;
};

export type PartInventoryRow = {
  id: number;
  partCode: string;
  partName: string;
  categoryId: number | null;
  categoryName: string | null;
  unit: string;
  minimumQuantity: number;
  storageLocation: string | null;
  description: string | null;
  compatibleVehicleTypes: Array<{ id: number; name: string }>;
  branchStock: BranchStock[];
  totalStockOnHand: number;
  totalReservedQuantity: number;
  totalDamagedQuantity: number;
  totalAvailableQuantity: number;
  stockStatus: PartStockStatus;
  stockStatusLabel: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PartsInventoryListResponse = {
  data: PartInventoryRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  summary: {
    totalParts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalAvailableQuantity: number;
  };
};

export type PartMovementRow = {
  id: number;
  movementNo: string;
  partId: number | null;
  partCode: string | null;
  partName: string | null;
  categoryName: string | null;
  branchId: number | null;
  branchName: string | null;
  vehicleId: number | null;
  vehiclePlate: string | null;
  vehicleName: string | null;
  motorpoolJobId: number | null;
  reservationId: number | null;
  reservationNo: string | null;
  movementType: PartMovementType | string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  damagedBefore: number;
  damagedAfter: number;
  referenceNo: string | null;
  reasonCode: string | null;
  remarks: string | null;
  movementAt: string | null;
  encodedBy: unknown;
};

export type PartReservationRow = {
  id: number;
  reservationNo: string;
  partId: number | null;
  partCode: string | null;
  partName: string | null;
  branchId: number | null;
  branchName: string | null;
  vehicleId: number | null;
  vehiclePlate: string | null;
  vehicleName: string | null;
  motorpoolJobId: number | null;
  reservedQuantity: number;
  issuedQuantity: number;
  returnedQuantity: number;
  cancelledQuantity: number;
  remainingQuantity: number;
  returnableQuantity: number;
  status: PartReservationStatus | string;
  neededAt: string | null;
  remarks: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  cancelReason: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

export type PartsLookupData = {
  categories: Array<{ id: number; code: string | null; name: string; description: string | null }>;
  vehicleTypes: Array<{ id: number; name: string }>;
  branches: Array<{ id: number; code: string | null; name: string }>;
  vehicles: Array<{
    id: number;
    plateNo: string;
    name: string | null;
    vehicleTypeId: number | null;
    status: string | null;
  }>;
};

export type PartsInventoryFilters = {
  search: string;
  categoryId: string;
  vehicleTypeId: string;
  branchId: string;
  stockStatus: PartStockStatusFilter;
  active: "true" | "false" | "all";
  page: number;
  limit: number;
};

export type MovementFilters = {
  search: string;
  partId: string;
  branchId: string;
  vehicleId: string;
  movementType: "all" | PartMovementType;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
};

export type ReservationFilters = {
  search: string;
  partId: string;
  branchId: string;
  vehicleId: string;
  status: string;
  page: number;
  limit: number;
};

export type CreatePartInput = {
  partCode: string;
  partName: string;
  categoryId?: number | null;
  category?: string | null;
  unit: string;
  minimumQuantity: number;
  storageLocation?: string | null;
  description?: string | null;
  isActive?: boolean;
  compatibleVehicleTypeIds?: number[];
  initialStock?: Array<{
    branchId?: number | null;
    stockOnHand: number;
  }>;
};

export type UpdatePartInput = Partial<CreatePartInput>;

export type CreateMovementInput = {
  partId: number;
  branchId?: number | null;
  movementType: PartMovementType;
  adjustmentDirection?: "IN" | "OUT";
  quantity: number;
  vehicleId?: number | null;
  motorpoolJobId?: number | null;
  reservationId?: number | null;
  referenceNo?: string | null;
  reasonCode?: string | null;
  remarks?: string | null;
  movementAt?: string;
};

export type CreateReservationInput = {
  partId: number;
  branchId?: number | null;
  vehicleId: number;
  motorpoolJobId?: number | null;
  reservedQuantity: number;
  neededAt?: string | null;
  remarks?: string | null;
};

export type UpdateReservationInput = {
  id: number;
  action: "issue" | "return" | "cancel";
  quantity?: number;
  referenceNo?: string | null;
  remarks?: string | null;
  cancelReason?: string | null;
};

export type ReportResponse = {
  type: string;
  data: Array<Record<string, unknown>>;
};
