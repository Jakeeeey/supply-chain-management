export interface VPreDispatchPlanDetailedDto {
    dispatchNo: string;
    dispatchDate: string;
    dispatchStatus: string;
    customerName: string;
    customerProvince: string;
    customerCity: string;
    customerBarangay: string;
    orderNo: string;
    dispatchAmount: number;
    driverName: string;
    branchName: string;
    clusterName: string;
    dispatchRemarks: string;
}

// 🚀 Updated: DispatchNo -> Driver -> Customer -> Items
export type GroupedDispatchData = Record<string, Record<string, Record<string, VPreDispatchPlanDetailedDto[]>>>;