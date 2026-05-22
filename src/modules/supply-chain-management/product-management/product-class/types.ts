import { z } from "zod";

// --- Domain Models ---
export interface ProductClassApiRow {
  id: number;
  class_name: string;
  description?: string;
  created_at?: string;
  created_by?: number;
  updated_at?: string;
  updated_by?: number;
}

// --- Zod Schemas ---
export const productClassSchema = z.object({
  class_name: z.string().min(1, "Product class name is required"),
  description: z.string().optional(),
});

export type ProductClassFormValues = z.infer<typeof productClassSchema>;
