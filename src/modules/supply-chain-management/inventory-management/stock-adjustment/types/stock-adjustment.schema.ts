import { z } from "zod";

/**
 * Stock Adjustment Type (IN/OUT)
 */
export const StockAdjustmentTypeSchema = z.enum(["IN", "OUT"]);
export type StockAdjustmentType = z.infer<typeof StockAdjustmentTypeSchema>;

/**
 * RFID Tag Schema
 */
export const StockAdjustmentRFIDSchema = z.object({
  id: z.number().optional(),
  rfid_tag: z.string().min(1, "RFID tag is required"),
  stock_adjustment_id: z.number().optional(),
  created_at: z.string().optional(),
  created_by: z.number().optional(),
});
export type StockAdjustmentRFID = z.infer<typeof StockAdjustmentRFIDSchema>;

/**
 * Branch Data Schema
 */
export const BranchSchema = z.object({
  id: z.number(),
  branch_name: z.string().optional(),
  branch_code: z.string().optional(),
});
export type Branch = z.infer<typeof BranchSchema>;

/**
 * User Data Schema
 */
export const UserSchema = z.object({
  user_id: z.number(),
  user_fname: z.string().optional(),
  user_lname: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

/**
 * Stock Adjustment Item Schema
 */
export const StockAdjustmentItemSchema = z.object({
  id: z.number().optional(),
  stock_adjustment_id: z.number().optional(),
  product_id: z.any(), // Can be number or expanded object
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  branch_id: z.any().optional(),
  remarks: z.string().optional(),
  doc_no: z.string().optional(),
  type: StockAdjustmentTypeSchema.optional(),
  created_at: z.string().optional(),
  created_by: z.any().optional(),
  // UI helper fields
  product_name: z.string().nullable().optional(),
  product_code: z.string().nullable().optional(),
  unit_name: z.string().nullable().optional(),
  unit_id: z.number().nullable().optional(),
  current_stock: z.number().nullable().optional(),
  cost_per_unit: z.number().nullable().optional(),
  has_rfid: z.boolean().optional(),
  rfid_count: z.number().optional(),
  rfid_tags: z.array(z.string()).optional(),
  brand_name: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  inferred_supplier_id: z.number().optional(),
  category_name: z.string().nullable().optional(),
  unit_order: z.number().nullable().optional(),
  db_id: z.number().optional(),
});
export type StockAdjustmentItem = z.infer<typeof StockAdjustmentItemSchema>;

/**
 * Stock Adjustment Header Schema
 */
export const StockAdjustmentHeaderSchema = z.object({
  id: z.number().optional(),
  doc_no: z.string().min(1, "Document number is required"),
  branch_id: z.any(), // Number or expanded object
  type: StockAdjustmentTypeSchema,
  amount: z.number().default(0),
  remarks: z.string().optional(),
  supplier_id: z.any().optional(), // Number or expanded object
  isPosted: z.boolean(),
  created_at: z.string().optional(),
  created_by: z.any().optional(),
  posted_by: z.any().optional(),
  postedAt: z.string().optional(),
  items: z.any().optional(), // Expanded items or count
});
export type StockAdjustmentHeader = z.infer<typeof StockAdjustmentHeaderSchema>;

/**
 * Full Stock Adjustment (Header + Items + RFID)
 */
export const StockAdjustmentDetailSchema = StockAdjustmentHeaderSchema.extend({
  items: z.array(StockAdjustmentItemSchema).default([]),
  rfid_tags: z.array(StockAdjustmentRFIDSchema).default([]),
});
export type StockAdjustmentDetail = z.infer<typeof StockAdjustmentDetailSchema>;

/**
 * Form values for Stock Adjustment Creation/Edit
 */
export const StockAdjustmentFormSchema = z.object({
  doc_no: z.string().min(1, "Document number is required"),
  branch_id: z.number().min(1, "Branch is required"),
  supplier_id: z.number().min(1, "Supplier is required"),
  type: StockAdjustmentTypeSchema,
  remarks: z.string().optional(),
  items: z.array(StockAdjustmentItemSchema).min(1, "At least one item is required"),
  isPosted: z.boolean(),
  postedAt: z.string().optional(),
  posted_by: z.any().optional(),
});
export type StockAdjustmentFormValues = z.infer<typeof StockAdjustmentFormSchema>;

/**
 * API Response Schemas
 */
export const StockAdjustmentListResponseSchema = z.object({
  data: z.array(StockAdjustmentHeaderSchema),
  meta: z.object({
    total_count: z.number().optional(),
    filter_count: z.number().optional(),
  }).optional(),
});

/**
 * Product Data Schema for UI dropdowns and selections
 */
export const StockAdjustmentProductSchema = z.object({
  id: z.number(),
  product_id: z.number().optional(),
  product_name: z.string(),
  product_code: z.string(),
  unit_name: z.string().optional(),
  cost_per_unit: z.number().optional(),
  price_per_unit: z.number().optional(),
  brand_name: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  unit_of_measurement: z.object({
    order: z.number(),
    unit_id: z.number().optional(),
  }).optional(),
  unit_id: z.number().optional(),
  current_stock: z.number().optional(),
  rfidData: z.object({
    quantity: z.number().optional(),
    count: z.number().optional(),
  }).optional(),
  index: z.number().optional(),
});
export type StockAdjustmentProduct = z.infer<typeof StockAdjustmentProductSchema>;

/**
 * Branch/Supplier types for selections
 */
export interface SelectionBranch {
  id: number;
  branch_name: string;
  branch_code?: string;
}

export interface SelectionSupplier {
  id: number;
  supplier_name: string;
  supplier_shortcut?: string;
}
