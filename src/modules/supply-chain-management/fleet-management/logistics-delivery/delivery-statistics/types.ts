export type FilterType = "thisWeek" | "thisMonth" | "thisYear" | "custom";
export type ViewType = "day" | "month";

export type DeliveryStatusName =
  | "Fulfilled"
  | "Not Fulfilled"
  | "Fulfilled With Concerns"
  | "Fulfilled With Returns";

export interface DeliveryStatusCount {
  name: DeliveryStatusName;
  value: number;
  color: string;
}

export interface ChartEntry {
  name: string;
  sales: number;
  Fulfilled: number;
  "Not Fulfilled": number;
  "Fulfilled With Concerns": number;
  "Fulfilled With Returns": number;
}

export interface DashboardData {
  chartData: ChartEntry[];
  deliveryStatusCounts: DeliveryStatusCount[];
  totalSales: number;
  avgSales: number;
}

export interface StatisticsParams {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  viewType: ViewType;
}
