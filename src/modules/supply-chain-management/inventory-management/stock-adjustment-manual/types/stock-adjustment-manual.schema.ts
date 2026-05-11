import { z } from "zod";

/**
 * Stock Adjustment Type (IN/OUT)
 */
export const StockAdjustmentManualTypeSchema = z.enum(["IN", "OUT"]);
export type StockAdjustmentManualType = z.infer<typeof StockAdjustmentManualTypeSchema>;


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
export const StockAdjustmentManualItemSchema = z.object({
  id: z.number().optional(),
  stock_adjustment_id: z.number().optional(),
  product_id: z.number().min(1, "Product selection is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  branch_id: z.any().optional(),
  remarks: z.string().optional(),
  doc_no: z.string().optional(),
  type: StockAdjustmentManualTypeSchema.optional(),
  created_at: z.string().optional(),
  created_by: z.any().optional(),
  // UI helper fields
  product_name: z.string().nullable().optional(),
  product_code: z.string().nullable().optional(),
  unit_name: z.string().nullable().optional(),
  unit_id: z.number().nullable().optional(),
  current_stock: z.number().nullable().optional(),
  cost_per_unit: z.number().nullable().optional(),
  brand_name: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  inferred_supplier_id: z.number().optional(),
  category_name: z.string().nullable().optional(),
  unit_order: z.number().nullable().optional(),
  db_id: z.number().optional(),
});
export type StockAdjustmentManualItem = z.infer<typeof StockAdjustmentManualItemSchema>;

/**
 * Stock Adjustment Header Schema
 */
export const StockAdjustmentManualHeaderSchema = z.object({
  id: z.number().optional(),
  doc_no: z.string().min(1, "Document number is required"),
  branch_id: z.any(), // Number or expanded object
  type: StockAdjustmentManualTypeSchema,
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
export type StockAdjustmentManualHeader = z.infer<typeof StockAdjustmentManualHeaderSchema>;

/**
 * Full Stock Adjustment (Header + Items + RFID)
 */
export const StockAdjustmentManualDetailSchema = StockAdjustmentManualHeaderSchema.extend({
  items: z.array(StockAdjustmentManualItemSchema).default([]),
});
export type StockAdjustmentManualDetail = z.infer<typeof StockAdjustmentManualDetailSchema>;

/**
 * Form values for Stock Adjustment Creation/Edit
 */
export const StockAdjustmentManualFormSchema = z.object({
  doc_no: z.string().min(1, "Document number is required"),
  branch_id: z.number().min(1, "Branch is required"),
  supplier_id: z.number().min(1, "Supplier is required"),
  type: StockAdjustmentManualTypeSchema,
  remarks: z.string().optional(),
  items: z.array(StockAdjustmentManualItemSchema).min(1, "At least one item is required"),
  isPosted: z.boolean(),
  postedAt: z.string().optional(),
  posted_by: z.any().optional(),
});
export type StockAdjustmentManualFormValues = z.infer<typeof StockAdjustmentManualFormSchema>;

/**
 * API Response Schemas
 */
export const StockAdjustmentManualListResponseSchema = z.object({
  data: z.array(StockAdjustmentManualHeaderSchema),
  meta: z.object({
    total_count: z.number().optional(),
    filter_count: z.number().optional(),
  }).optional(),
});

/**
 * Product Data Schema for UI dropdowns and selections
 */
export const StockAdjustmentManualProductSchema = z.object({
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
  index: z.number().optional(),
});
export type StockAdjustmentManualProduct = z.infer<typeof StockAdjustmentManualProductSchema>;

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
