// ─── Dispatch Creation Module — Zod Validation Schemas ──────
// All Zod schemas for request validation.
// Pure TS interfaces live in dispatch.types.ts.

import { z } from "zod";

// ─── Status Enum ────────────────────────────────────────────

/** Valid statuses for a post-dispatch plan. */
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

// ─── Shared Sub-Schemas ─────────────────────────────────────

/** A single crew-helper entry. */
export const CrewHelperSchema = z.object({
  user_id: z.number().min(1, "Helper selection is required"),
});

/** A single budget line entry. */
export const BudgetLineSchema = z.object({
  coa_id: z.number().min(1, "Chart of Account is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  remarks: z.string().optional(),
});

/** A single invoice reference entry. */
export const InvoiceRefSchema = z.object({
  invoice_id: z.number(),
  sequence: z.number(),
});

// ─── POST — Create Dispatch Plan ────────────────────────────

/** Schema for creating a new dispatch plan (POST body). */
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
  invoices: z.array(InvoiceRefSchema).optional(),

  // Encoder (optional — defaults to driver_id on the server)
  encoder_id: z.number().optional(),
});

export type DispatchCreationFormValues = z.infer<
  typeof DispatchCreationFormSchema
>;

// ─── PATCH — Update Trip Configuration ──────────────────────

/** Schema for updating an existing trip (PATCH ?action=update_trip). */
export const UpdateTripSchema = z.object({
  pre_dispatch_plan_id: z.number().optional(),
  driver_id: z.number().min(1, "Driver is required"),
  vehicle_id: z.number().min(1, "Vehicle is required"),
  starting_point: z.number().min(1, "Origin Warehouse is required"),
  estimated_time_of_dispatch: z.string().min(1, "ETOP is required"),
  estimated_time_of_arrival: z.string().min(1, "ETOA is required"),
  remarks: z.string().optional(),
  amount: z.number().optional(),
  helpers: z.array(CrewHelperSchema).optional(),
  invoices: z.array(InvoiceRefSchema).optional(),
  encoder_id: z.number().optional(),
});

export type UpdateTripValues = z.infer<typeof UpdateTripSchema>;

// ─── PATCH — Update Budgets ─────────────────────────────────

/** Schema for a budget-only update (PATCH default action). */
export const UpdateBudgetSchema = z.object({
  budgets: z.array(BudgetLineSchema).optional(),
});

export type UpdateBudgetValues = z.infer<typeof UpdateBudgetSchema>;
