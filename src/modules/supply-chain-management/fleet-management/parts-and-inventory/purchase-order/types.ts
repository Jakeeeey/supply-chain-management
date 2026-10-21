import type { VehiclePart } from "../registration/types";
import type { Branch } from "../stock-in/types";

export type PurchaseRequestStatus = "Pending" | "Approved" | "Ordered" | "Received" | "Cancelled";
export type PurchaseRequestPriority = "Normal" | "Urgent" | "Critical";

export interface ReorderTriggerItem {
  id: number;
  part_id: number;
  part_code: string;
  part_name: string;
  classification_name: string;
  barcode: string;
  unit: string;
  unit_cost: number;
  branch_id: number;
  branch_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_point: number;
  deficit: number;
  suggested_quantity: number;
}

export interface Supplier {
  id: number;
  supplier_name: string;
  supplier_shortcut?: string | null;
  contact_person?: string | null;
  phone_number?: string | null;
  email_address?: string | null;
}

export interface PurchaseRequest {
  id: number;
  pr_no: string;
  branch_id: number | Branch;
  part_id: number | VehiclePart;
  quantity: number;
  estimated_cost: number;
  priority: PurchaseRequestPriority;
  supplier_id?: number | Supplier | null;
  supplier_name?: string | null;
  expected_delivery_date?: string | null;
  status: PurchaseRequestStatus;
  notes?: string | null;
  requested_by?: number | string | null;
  requested_at?: string | null;
  decided_by?: number | string | null;
  decided_at?: string | null;
  created_at: string;
}

export interface CreatePurchaseRequestPayload {
  branch_id: number;
  part_id?: number;
  quantity?: number;
  estimated_cost?: number;
  priority: PurchaseRequestPriority;
  supplier_id?: number;
  supplier_name?: string;
  expected_delivery_date?: string;
  notes?: string;
  // Multiple items support
  items?: BulkPurchaseRequestItem[];
}

export interface BulkPurchaseRequestItem {
  part_id: number;
  quantity: number;
  unit_cost?: number;
  remarks?: string;
}

export interface PurchaseOrdersApiResponse {
  data: PurchaseRequest[];
  triggers?: ReorderTriggerItem[];
  meta?: {
    total_count?: number;
  };
}
