import { z } from "zod";

// ─── Status Enum ────────────────────────────────────────────
// Mirrors the MySQL ENUM: 'Pending','Approved','Picking','Picked','Dispatched'
export const DispatchPlanStatusSchema = z.enum([
  "Pending",
  "Approved",
  "Picking",
  "Picked",
  "Dispatched",
]);
export type DispatchPlanStatus = z.infer<typeof DispatchPlanStatusSchema>;

// ─── Lookup Types ───────────────────────────────────────────

/** Driver option — users from department 8, enriched with vehicle info */
export const driverOptionSchema = z.object({
  user_id: z.number(),
  user_fname: z.string(),
  user_mname: z.string().nullable().optional(),
  user_lname: z.string(),
  user_department: z.number(),
});
export type DriverOption = z.infer<typeof driverOptionSchema>;

/** Vehicle option — from the vehicles table */
export const vehicleOptionSchema = z.object({
  vehicle_id: z.number(),
  vehicle_plate: z.string().nullable(),
  vehicle_type: z.number().nullable(),
  branch_id: z.number().nullable(),
  status: z.string().nullable(),
  maximum_weight: z.union([z.string(), z.number()]).nullable().optional(),
  minimum_load: z.union([z.string(), z.number()]).nullable().optional(),
});
export type VehicleOption = z.infer<typeof vehicleOptionSchema>;

/** Cluster with minimum amount threshold */
export const clusterOptionSchema = z.object({
  id: z.number(),
  cluster_name: z.string(),
  minimum_amount: z.number(),
});
export type ClusterOption = z.infer<typeof clusterOptionSchema>;

/** Branch option */
export const branchOptionSchema = z.object({
  id: z.number(),
  branch_name: z.string(),
  branch_description: z.string().nullable().optional(),
  branch_code: z.string().nullable().optional(),
});
export type BranchOption = z.infer<typeof branchOptionSchema>;

/** Customer info resolved from customer_code */
export const customerInfoSchema = z.object({
  id: z.number(),
  customer_code: z.string(),
  customer_name: z.string(),
  store_name: z.string().nullable().optional(),
  brgy: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
});
export type CustomerInfo = z.infer<typeof customerInfoSchema>;

/** Available sales order for the creation modal */
export const salesOrderOptionSchema = z.object({
  order_id: z.number(),
  order_no: z.string(),
  customer_code: z.string(),
  customer_name: z.string().optional(), // Resolved from customer table
  store_name: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  total_amount: z.number().nullable(),
  net_amount: z.number().nullable(),
  allocated_amount: z.number().nullable().optional(),
  po_no: z.string().nullable().optional(),
  total_weight: z.number().optional(), // Computed from products.weight via sales_order_details
});
export type SalesOrderOption = z.infer<typeof salesOrderOptionSchema>;

// ─── Dispatch Plan Record ───────────────────────────────────

export const dispatchPlanSchema = z.object({
  dispatch_id: z.number(),
  dispatch_no: z.string(),
  dispatch_date: z.string().nullable(),
  driver_id: z.number().nullable(),
  branch_id: z.number().nullable(),
  created_at: z.string().nullable(),
  created_by: z.number().nullable(),
  status: DispatchPlanStatusSchema,
  total_amount: z.number().nullable(),
  cluster_id: z.number().nullable(),
  vehicle_id: z.number().nullable(),
  remarks: z.string().nullable().optional(),
  // Enriched fields (populated on fetch)
  driver_name: z.string().optional(),
  cluster_name: z.string().optional(),
  branch_name: z.string().optional(),
  outlet_count: z.number().optional(), // Number of unique customers in the plan
  total_weight: z.number().optional(), // Aggregate weight from products
});
export type DispatchPlan = z.infer<typeof dispatchPlanSchema>;

// ─── Dispatch Plan Detail (Junction) ────────────────────────

export const dispatchPlanDetailSchema = z.object({
  detail_id: z.number().optional(),
  dispatch_id: z.number(),
  sales_order_id: z.number(),
  // Enriched fields
  order_no: z.string().optional(),
  customer_name: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  weight: z.number().optional(),
  ordered_quantity: z.number().optional(),
  amount: z.number().optional(),
});
export type DispatchPlanDetail = z.infer<typeof dispatchPlanDetailSchema>;

// ─── Form Validation ────────────────────────────────────────
// Schema for creating a new Pre Dispatch Plan
export const dispatchPlanFormSchema = z.object({
  driver_id: z.number().min(1, "Driver is required"),
  cluster_id: z.number().min(1, "Cluster is required"),
  branch_id: z.number().min(1, "Branch is required"),
  vehicle_id: z.number().min(1, "Vehicle is required"),
  dispatch_date: z.string().min(1, "Dispatch date is required"),
  remarks: z.string().optional().default(""),
  sales_order_ids: z
    .array(z.number())
    .min(1, "At least one sales order is required"),
});
export type DispatchPlanFormValues = z.infer<typeof dispatchPlanFormSchema>;

// ─── Master Data Bundle ─────────────────────────────────────
// Aggregated lookup data for the creation form
export interface DispatchPlanMasterData {
  drivers: DriverOption[];
  vehicles: VehicleOption[];
  clusters: ClusterOption[];
  branches: BranchOption[];
}

// ─── Pagination ─────────────────────────────────────────────
export interface PaginatedDispatchPlans {
  data: DispatchPlan[];
  meta: {
    total_count: number;
    filter_count: number;
  };
}
