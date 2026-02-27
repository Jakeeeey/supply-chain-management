import { z } from "zod";

// Statuses matching user preferences and SQL ENUMs
// Drafts: Draft, For approval, Error, Processed
// Approved: Approved
export const BundleStatusSchema = z.enum([
  "Draft",
  "For approval",
  "Error",
  "Processed",
  "Approved",
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
export interface BundleType {
  id: number;
  name: string;
}

// --- Product (simplified for bundle selection) ---
export interface ProductOption {
  product_id: number;
  product_name: string;
  product_code: string;
  isActive: number; // 1 = Active, 0 = Inactive
}

// --- Draft Bundle Schema (for creation form validation) ---
export const bundleDraftSchema = z.object({
  bundle_name: z.string().min(1, "Bundle name is required"),
  bundle_type_id: z.number().min(1, "Bundle type is required"),
  items: z.array(bundleItemSchema).min(1, "At least one product is required"),
});
export type BundleDraftFormValues = z.infer<typeof bundleDraftSchema>;

// --- Full Bundle Record (from API response) ---
export interface Bundle {
  id: number;
  bundle_sku: string; // Auto-generated code [XXX-0000]
  bundle_name: string;
  bundle_type_id: number | BundleType | null;
  status: BundleStatus;
  items?: BundleItem[]; // Populated via product_bundle_items junction
}

// --- Bundle Draft Record (from product_bundles_draft) ---
export interface BundleDraft {
  id: number;
  bundle_sku: string;
  bundle_name: string;
  bundle_type_id: number | BundleType | null;
  draft_status: BundleStatus;
  items?: BundleItem[];
}

// --- Master Data for the bundling module ---
export interface BundleMasterData {
  bundleTypes: BundleType[];
  products: ProductOption[];
}

// --- Paginated Response ---
export interface PaginatedBundles {
  data: BundleDraft[] | Bundle[];
  meta: {
    total_count: number;
    filter_count: number;
  };
}
