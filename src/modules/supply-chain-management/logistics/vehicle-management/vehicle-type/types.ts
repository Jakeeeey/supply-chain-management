import { z } from "zod";

// --- Domain Models ---
export interface VehicleTypeApiRow {
  id: number;
  type_name: string;
}

// --- Zod Schemas ---
export const vehicleTypeSchema = z.object({
  type_name: z.string().min(1, "Vehicle type name is required"),
});

export type VehicleTypeFormValues = z.infer<typeof vehicleTypeSchema>;
