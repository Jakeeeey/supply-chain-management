import { z } from "zod";

// --- Domain Models ---
export interface ProductSectionApiRow {
  id: number;
  section_name: string;
  description?: string;
  created_at?: string;
  created_by?: number;
  updated_at?: string;
  updated_by?: number;
}

// --- Zod Schemas ---
export const productSectionSchema = z.object({
  section_name: z.string().min(1, "Product section name is required"),
  description: z.string().optional(),
});

export type ProductSectionFormValues = z.infer<typeof productSectionSchema>;
