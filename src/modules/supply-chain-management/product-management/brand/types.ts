import { z } from "zod";

// --- Domain Models ---
export interface BrandApiRow {
  brand_id: number;
  brand_name: string;
  sku_code?: string;
  image?: string;
  created_by?: string;
  updated_by?: string;
}

// --- Zod Schemas ---
export const brandSchema = z.object({
  brand_name: z.string().min(1, "Brand name is required"),
  sku_code: z.string().optional(),
  image: z.any().optional(),
  created_by: z.string().optional(),
  updated_by: z.string().optional(),
});

export type BrandFormValues = z.infer<typeof brandSchema>;
