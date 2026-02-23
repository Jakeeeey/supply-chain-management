import { z } from "zod";

// --- Domain Models ---
export interface FuelTypeApiRow {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// --- Zod Schemas ---
export const fuelTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export type FuelTypeFormValues = z.infer<typeof fuelTypeSchema>;
