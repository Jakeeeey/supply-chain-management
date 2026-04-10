import * as z from "zod";

export const salesReturnTypeSchema = z.object({
  type_name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional().or(z.literal("")),
});

export type SalesReturnTypeFormValues = z.infer<typeof salesReturnTypeSchema>;
