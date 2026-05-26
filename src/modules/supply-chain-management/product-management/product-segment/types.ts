import { z } from "zod";

// --- Domain Models ---
export interface ProductSegmentApiRow {
  id: number;
  segment_name: string;
  description?: string;
  created_at?: string;
  created_by?: number;
  updated_at?: string;
  updated_by?: number;
}

// --- Zod Schemas ---
export const productSegmentSchema = z.object({
  segment_name: z.string().min(1, "Product segment name is required"),
  description: z.string().optional(),
});

export type ProductSegmentFormValues = z.infer<typeof productSegmentSchema>;
