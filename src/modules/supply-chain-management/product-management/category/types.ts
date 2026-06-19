import { z } from "zod";

export interface CategoryApiRow {
  category_id: string;
  category_name: string;
  sku_code?: string;
  image?: string;
  created_by?: string;
  updated_by?: string;
  date_created?: string;
}

export const categorySchema = z.object({
  category_name: z.string().min(1, "Category name is required"),
  sku_code: z.string().optional(),
  image: z.any().optional(), // Can be a File, string (ID), or undefined
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
