import { z } from "zod";

// --- Domain Models ---
export interface UnitApiRow {
  unit_id: string;
  unit_name: string;
  unit_shortcut: string;
  sku_code?: string; // ✅ Added from your screenshot
  order?: number;
}

// --- Zod Schemas ---
export const unitSchema = z.object({
  unit_name: z.string().min(1, "Name is required"),
  unit_shortcut: z.string().min(1, "Shortcut is required"),
  sku_code: z.string().optional(), // ✅ Added field
  // ✅ FIX: Strict coercion handling to prevent type conflicts
  order: z.coerce.number().default(0),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
