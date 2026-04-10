import * as z from "zod";

export const rtsReturnTypeSchema = z.object({
  return_type_code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be at most 50 characters"),
  return_type_name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  description: z.string().max(255, "Description must be at most 255 characters").optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type RTSReturnTypeFormValues = z.infer<typeof rtsReturnTypeSchema>;
