export type DispatchStatusCategory =
  | "For Dispatch"
  | "For Inbound"
  | "For Clearance"
  | "For Approval"
  | "Completed"
  | "Other";

export type DateFilter = "All Time" | "This Week" | "This Month" | "This Year" | "Custom";

export interface CustomerTransaction {
  id: string;
  customerName: string;
  address: string;
  itemsOrdered: string;
  amount: number;
  status: string;
}

export interface DispatchPlan {
  id: string;
  dpNumber: string;

  driverId: string;
  driverName: string;

  salesmanId: string;
  salesmanName: string;

  vehicleId: string;
  vehiclePlateNo: string;

  startingPoint: string;

  timeOfDispatch: string | null;
  timeOfArrival: string | null;

  estimatedDispatch: string;
  estimatedArrival: string;

  customerTransactions: CustomerTransaction[];

  status: string;

  createdAt: string;
  updatedAt: string;
}

export interface DispatchSummaryResponse {
  data: DispatchPlan[];
}

export interface DispatchSummaryStats {
  total: number;
  forDispatch: number;
  forInbound: number;
  forClearance: number;
}
