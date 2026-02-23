import { z } from "zod";

// --- Domain Models ---
export interface VehicleCategoryApiRow {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// --- Zod Schemas ---
export const vehicleCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export type VehicleCategoryFormValues = z.infer<typeof vehicleCategorySchema>;
