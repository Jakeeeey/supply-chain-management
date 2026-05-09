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

/** A single invoice reference or manual route stop entry. */
export const InvoiceRefSchema = z.object({
  invoice_id: z.number().optional(),
  invoice_ids: z.array(z.number()).optional(),
  invoice_no: z.string().optional(),
  sequence: z.number(),
  remarks: z.string().optional(),
  distance: z.number().min(0, "Distance cannot be negative").optional(),
  isManualStop: z.boolean().optional(),
  isPoStop: z.boolean().optional(),
  po_id: z.number().optional(),
  po_no: z.string().optional(),
  status: z.string().optional(),
});

// ─── POST — Create Dispatch Plan ────────────────────────────

/** Schema for creating a new dispatch plan (POST body). */
export const DispatchCreationFormSchema = z
  .object({
    // Context from Pre-Dispatch
    pre_dispatch_plan_ids: z
      .array(z.number())
      .min(1, "At least one Pre-Dispatch Plan is required"),

    // Header Details (post_dispatch_plan)
    starting_point: z.number().min(1, "Origin Warehouse is required"),
    vehicle_id: z.number().min(1, "Vehicle is required"),
    estimated_time_of_dispatch: z.string().min(1, "ETOP is required"),
    estimated_time_of_arrival: z.string().min(1, "ETOA is required"),
    remarks: z.string().optional(),
    amount: z.number().optional(), // Pulled from pre-dispatch invoice totals

    // Crew (post_dispatch_plan_staff)
    driver_id: z.number().min(1, "Driver is required"),
    helpers: z
      .array(CrewHelperSchema)
      .min(1, "At least one helper is required")
      .max(2, "Maximum of 2 helpers allowed"),

    // Invoices (post_dispatch_invoices) - needed for reordering/persistence
    invoices: z.array(InvoiceRefSchema).optional(),

    // Encoder (optional — defaults to driver_id on the server)
    encoder_id: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const helperIds = data.helpers.map((h) => h.user_id);

    // Check if driver is also a helper
    if (helperIds.includes(data.driver_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The driver cannot also be assigned as a helper",
        path: ["driver_id"],
      });
    }

    // Check for duplicate helpers
    const uniqueHelpers = new Set(helperIds);
    if (uniqueHelpers.size !== helperIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate helpers selected",
        path: ["helpers"],
      });
    }
  });

export type DispatchCreationFormValues = z.infer<
  typeof DispatchCreationFormSchema
>;

// ─── PATCH — Update Trip Configuration ──────────────────────

/** Schema for updating an existing trip (PATCH ?action=update_trip). */
export const UpdateTripSchema = z
  .object({
    pre_dispatch_plan_ids: z.array(z.number()).optional(),
    driver_id: z.number().min(1, "Driver is required"),
    vehicle_id: z.number().min(1, "Vehicle is required"),
    starting_point: z.number().min(1, "Origin Warehouse is required"),
    estimated_time_of_dispatch: z.string().min(1, "ETOP is required"),
    estimated_time_of_arrival: z.string().min(1, "ETOA is required"),
    remarks: z.string().optional(),
    amount: z.number().optional(),
    helpers: z
      .array(CrewHelperSchema)
      .optional()
      .transform((val) => val || [])
      .pipe(z.array(CrewHelperSchema).max(2, "Maximum of 2 helpers allowed")),
    invoices: z.array(InvoiceRefSchema).optional(),
    encoder_id: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const helperIds = (data.helpers || [])
      .map((h) => h.user_id)
      .filter((id) => id > 0);

    if (data.driver_id && helperIds.includes(data.driver_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The driver cannot also be assigned as a helper",
        path: ["driver_id"],
      });
    }

    const uniqueHelpers = new Set(helperIds);
    if (uniqueHelpers.size !== helperIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate helpers selected",
        path: ["helpers"],
      });
    }
  });

export type UpdateTripValues = z.infer<typeof UpdateTripSchema>;
