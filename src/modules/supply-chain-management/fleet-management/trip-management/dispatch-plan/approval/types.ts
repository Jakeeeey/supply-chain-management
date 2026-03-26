export interface StopItemDto {
    name: string;
    quantity: number;
    unit: string;
    amount: number;
}

export interface StopDto {
    type: "DELIVERY" | "PICKUP" | "OTHER";
    name: string;
    documentNo: string;
    documentAmount: number;
    sequence: number;
    distance: number;
    status: string;
    remarks?: string;
    items?: StopItemDto[];
}

export interface StaffDto {
    userId: number;
    name: string;
    role: string;
}

export interface BudgetDto {
    remarks: string;
    amount: number;
}

export interface PostDispatchApprovalDto {
    id: number;
    docNo: string;
    driverId?: number;
    vehicleId?: number;
    startingPoint?: string;
    status: string;
    amount: number;
    totalDistance: number;
    estimatedTimeOfDispatch?: string;
    staff?: StaffDto[];
    budgets?: BudgetDto[];
    stops?: StopDto[];
}