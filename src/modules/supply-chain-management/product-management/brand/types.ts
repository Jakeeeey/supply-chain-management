import { z } from "zod";

// --- Domain Models ---
export interface BrandApiRow {
  brand_id: string;
  brand_name: string;
  sku_code?: string; // ✅ Added field
}

// --- Zod Schemas ---
export const brandSchema = z.object({
  brand_name: z.string().min(1, "Brand name is required"),
  sku_code: z.string().optional(), // ✅ Added field
});

export type BrandFormValues = z.infer<typeof brandSchema>;
