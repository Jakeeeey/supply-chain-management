import { z } from "zod";

export interface CategoryApiRow {
  category_id: string;
  category_name: string;
  sku_code?: string;
  date_created?: string;
}

export const categorySchema = z.object({
  category_name: z.string().min(1, "Category name is required"),
  sku_code: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
