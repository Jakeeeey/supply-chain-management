// ─── Stock Transfer Module — Zod Validation Schemas ─────────
// All Zod schemas for API request validation.
// Pure TS interfaces live in stock-transfer.types.ts.

import { z } from "zod";

// ─── Status Enum ────────────────────────────────────────────

/** Valid statuses for a stock transfer. */
export const StockTransferStatusSchema = z.enum([
  "Requested",
  "For Picking",
  "Picking",
  "Picked",
  "For Loading",
  "Received",
  "Rejected",
]);
export type StockTransferStatusValue = z.infer<
  typeof StockTransferStatusSchema
>;

/** Valid RFID scan types. */
export const RfidScanTypeSchema = z.enum(["DISPATCH", "RECEIVE"]);
export type RfidScanTypeValue = z.infer<typeof RfidScanTypeSchema>;

// ─── POST — Create Stock Transfer ──────────────────────────

/** A single scanned/added item in the transfer request. */
export const ScannedItemSchema = z.object({
  rfid: z.string().min(1, "RFID tag is required"),
  productId: z.number().min(1, "Product ID is required"),
  unitQty: z.number().min(0, "Quantity cannot be negative"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  totalAmount: z.number().min(0, "Total amount cannot be negative"),
});
export type ScannedItemValue = z.infer<typeof ScannedItemSchema>;

/** Schema for creating a new stock transfer (POST body). */
export const CreateStockTransferSchema = z.object({
  sourceBranch: z
    .string()
    .min(1, "Source branch is required"),
  targetBranch: z
    .string()
    .min(1, "Target branch is required"),
  leadDate: z
    .string()
    .min(1, "Lead date is required"),
  scannedItems: z
    .array(ScannedItemSchema)
    .min(1, "At least one item is required"),
}).superRefine((data, ctx) => {
  if (data.sourceBranch === data.targetBranch) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Source and target branch cannot be the same",
      path: ["targetBranch"],
    });
  }
});
export type CreateStockTransferValues = z.infer<
  typeof CreateStockTransferSchema
>;

// ─── PATCH — Update Status (Modern Format) ──────────────────

/** A single item update entry (modern format with allocated quantity). */
export const UpdateItemSchema = z.object({
  id: z.number().min(1, "Item ID is required"),
  status: z.string().min(1, "Status is required"),
  allocated_quantity: z.number().min(0).optional(),
});
export type UpdateItemValue = z.infer<typeof UpdateItemSchema>;

/** RFID tracking entry for dispatch/receive recording. */
export const RfidTrackingSchema = z.object({
  stock_transfer_id: z.number().min(1, "Transfer ID is required"),
  rfid_tag: z.string().min(1, "RFID tag is required"),
});
export type RfidTrackingValue = z.infer<typeof RfidTrackingSchema>;

/** Schema for updating stock transfer statuses (PATCH body). */
export const UpdateStockTransferSchema = z.object({
  /** Modern format: per-item updates with optional allocated_quantity. */
  items: z.array(UpdateItemSchema).optional(),
  /** Legacy format: batch IDs. */
  ids: z.array(z.number()).optional(),
  /** Status for legacy format. */
  status: z.string().optional(),
  /** RFID tags to insert into tracking table. */
  rfids: z.array(RfidTrackingSchema).optional(),
  /** Type of scan: DISPATCH or RECEIVE. */
  scanType: RfidScanTypeSchema.optional(),
}).superRefine((data, ctx) => {
  const hasItems = data.items && data.items.length > 0;
  const hasIds = data.ids && data.ids.length > 0;

  if (!hasItems && !hasIds) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either 'items' or 'ids' array must be provided",
      path: ["items"],
    });
  }

  // Legacy format requires a status string
  if (hasIds && !hasItems && !data.status) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Status is required when using legacy 'ids' format",
      path: ["status"],
    });
  }
});
export type UpdateStockTransferValues = z.infer<
  typeof UpdateStockTransferSchema
>;

// ─── PATCH — Manual Dispatch ────────────────────────────────

/** Schema for the manual dispatch PATCH body. */
export const ManualDispatchSchema = z.object({
  ids: z.array(z.number()).min(1, "At least one ID is required"),
  status: z.string().min(1, "Status is required"),
});
export type ManualDispatchValues = z.infer<typeof ManualDispatchSchema>;

// ─── PATCH — Manual Receive ─────────────────────────────────

/** Schema for the manual receive PATCH body. */
export const ManualReceiveSchema = z.object({
  ids: z.array(z.number()).min(1, "At least one ID is required"),
  status: z.string().min(1, "Status is required"),
});
export type ManualReceiveValues = z.infer<typeof ManualReceiveSchema>;
