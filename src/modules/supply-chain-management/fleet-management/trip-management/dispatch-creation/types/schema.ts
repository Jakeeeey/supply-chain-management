import { z } from "zod";

// ─── Status Enum ────────────────────────────────────────────
export const PostDispatchPlanStatusSchema = z.enum([
  "For Approval",
  "For Dispatch",
  "For Inbound",
  "For Clearance",
  "Posted",
]);
export type PostDispatchPlanStatus = z.infer<
  typeof PostDispatchPlanStatusSchema
>;

// ─── Form Sub-Schemas ───────────────────────────────────────
export const CrewHelperSchema = z.object({
  user_id: z.number().min(1, "Helper selection is required"),
});

export const BudgetLineSchema = z.object({
  coa_id: z.number().min(1, "Chart of Account is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  remarks: z.string().optional(),
});

// ─── Main Creation Form Schema ──────────────────────────────
export const DispatchCreationFormSchema = z.object({
  // Context from Pre-Dispatch
  pre_dispatch_plan_id: z.number().min(1, "Pre-Dispatch Plan ID is required"),

  // Header Details (post_dispatch_plan)
  starting_point: z.number().min(1, "Origin Warehouse is required"),
  vehicle_id: z.number().min(1, "Vehicle is required"),
  estimated_time_of_dispatch: z.string().min(1, "ETOP is required"),
  estimated_time_of_arrival: z.string().min(1, "ETOA is required"),
  remarks: z.string().optional(),
  amount: z.number().optional(), // Pulled from pre-dispatch invoice totals

  // Crew (post_dispatch_plan_staff)
  driver_id: z.number().min(1, "Driver is required"),
  helpers: z.array(CrewHelperSchema).min(1, "At least one helper is required"),

  // Budgeting (post_dispatch_budgeting)
  budgets: z.array(BudgetLineSchema).optional(),

  // Invoices (post_dispatch_invoices) - needed for reordering/persistence
  invoices: z
    .array(
      z.object({
        invoice_id: z.number(),
        sequence: z.number(),
      }),
    )
    .optional(),
});

export type DispatchCreationFormValues = z.infer<
  typeof DispatchCreationFormSchema
>;

// ─── Master Data Options ────────────────────────────────────
export interface DriverOption {
  user_id: number;
  user_fname: string;
  user_lname: string;
}

export interface HelperOption {
  user_id: number;
  user_fname: string;
  user_lname: string;
}

export interface VehicleOption {
  vehicle_id: number;
  vehicle_plate: string;
}

export interface BranchOption {
  id: number;
  branch_name: string;
}

export interface COAOption {
  coa_id: number;
  account_title: string;
  gl_code: string;
}

export interface DispatchCreationMasterData {
  drivers: DriverOption[];
  helpers: HelperOption[];
  vehicles: VehicleOption[];
  branches: BranchOption[];
  coa: COAOption[];
}
