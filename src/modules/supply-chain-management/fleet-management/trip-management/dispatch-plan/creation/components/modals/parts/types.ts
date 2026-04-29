export interface PlanDetailItem {
  detail_id: string | number;
  sales_order_id?: number;
  invoice_id?: number;
  invoice_ids?: number[];
  order_no?: string;
  order_status?: string;
  true_order_status?: string;
  customer_name?: string;
  city?: string;
  amount: number;
  weight?: number;
  invoice_status?: string;
  isManualStop?: boolean;
  remarks?: string;
  distance?: number;
  status?: string;
  isPoStop?: boolean;
  po_id?: number;
  po_no?: string;
}

export interface GroupedPlanDetailItem {
  id: string; // Aggregation key
  items: PlanDetailItem[];
  customer_name?: string;
  city?: string;
  isManualStop?: boolean;
  isPoStop?: boolean;
  remarks?: string;
  distance?: number;
  po_no?: string;
  totalAmount: number;
  status?: string; // Summary status
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "For Picking":
      return "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/15";
    case "For Invoicing":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/15";
    case "For Loading":
      return "bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/15";
    case "On Hold":
      return "bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/15";
    default:
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/15";
  }
};
