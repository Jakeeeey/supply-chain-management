import { z } from "zod";

// Statuses matching user preferences and SQL ENUMs
// Drafts: Draft, For approval, Error, Processed
// Approved: Approved
export const BundleStatusSchema = z.enum([
  "DRAFT",
  "FOR_APPROVAL",
  "ERROR",
  "PROCESSED",
  "APPROVED",
  "REJECTED",
]);
export type BundleStatus = z.infer<typeof BundleStatusSchema>;

// --- Bundle Item (product inside a bundle) ---
export const bundleItemSchema = z.object({
  id: z.number().optional(), // Junction record ID (for updates)
  product_id: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").default(1),
});
export type BundleItem = z.infer<typeof bundleItemSchema>;

// --- Bundle Type (reference data from Directus) ---
export const bundleTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type BundleType = z.infer<typeof bundleTypeSchema>;

// --- Product Option (for selection) ---
export const productOptionSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  product_code: z.string(),
  isActive: z.number(),
  unit_name: z.string().optional(),
  brand_name: z.string().optional(),
  category_name: z.string().optional(),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

// --- Draft Bundle Schema (for creation form validation) ---
export const bundleDraftSchema = z
  .object({
    id: z.number().optional(),
    bundle_name: z.string().min(1, "Bundle name is required"),
    bundle_type_id: z.number().min(1, "Bundle type is required"),
    items: z.array(bundleItemSchema).min(1, "At least one product is required"),
  })
  .refine(
    (data) => {
      const totalItems = data.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      return totalItems > 1;
    },
    {
      message: "A bundle must contain more than one product in total",
      path: ["items"],
    },
  );
export type BundleDraftFormValues = z.infer<typeof bundleDraftSchema>;

// --- Bundle Record (Master & Draft) ---
// Using a base schema to avoid duplication
const bundleBaseFields = {
  id: z.number(),
  bundle_sku: z.string().optional(),
  bundle_name: z.string(),
  // Can be raw ID or expanded object
  bundle_type_id: z.union([z.number(), bundleTypeSchema, z.null()]),
  items: z.array(bundleItemSchema).optional(),
};

export const bundleSchema = z.object({
  ...bundleBaseFields,
  status: BundleStatusSchema,
});
export type Bundle = z.infer<typeof bundleSchema>;

// --- Standardized BundleDraft record to use 'draft_status' as per backend ---
export const bundleDraftRecordSchema = z.object({
  ...bundleBaseFields,
  draft_status: BundleStatusSchema,
});
export type BundleDraft = z.infer<typeof bundleDraftRecordSchema>;

// --- Master Data ---
export const bundleMasterDataSchema = z.object({
  bundleTypes: z.array(bundleTypeSchema),
  products: z.array(productOptionSchema),
});
export type BundleMasterData = z.infer<typeof bundleMasterDataSchema>;

// --- Pagination ---
export interface PaginatedBundles {
  data: (BundleDraft | Bundle)[];
  meta: {
    total_count: number;
    filter_count: number;
  };
}
