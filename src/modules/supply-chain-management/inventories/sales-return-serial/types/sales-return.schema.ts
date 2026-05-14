import { z } from "zod";

export const SalesReturnItemSchema = z.object({
  productId: z.number().int().positive("Product ID is required"),
  code: z.string().min(1, "Product code is required"),
  description: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  grossAmount: z.number().min(0),
  discountType: z.union([z.string(), z.number()]).nullable().optional(),
  discountAmount: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  reason: z.string().nullable().optional(),
  returnType: z.union([z.string(), z.number()]).nullable().optional(),
  serialNumbers: z.array(z.string()).optional(),
  isSerialized: z.union([z.number(), z.boolean()]).optional(),
});

export const CreateSalesReturnSchema = z.object({
  salesmanId: z.number().int().positive("Salesman ID is required"),
  customerCode: z.string().min(1, "Customer Code is required"),
  invoiceNo: z.string().min(1, "Invoice Number is required"),
  orderNo: z.string().nullable().optional(),
  branchId: z.number().int().positive("Branch ID is required").optional(),
  priceType: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  items: z.array(SalesReturnItemSchema).min(1, "At least one item is required for the return"),
});

export const UpdateSalesReturnSchema = CreateSalesReturnSchema.partial().extend({
  id: z.number().int().positive("Sales Return ID is required"),
  returnNo: z.string().min(1, "Return Number is required"),
});

export const UpdateSalesReturnStatusSchema = z.object({
  id: z.number().int().positive("Sales Return ID is required"),
  status: z.enum(["Pending", "Approved", "Rejected", "Received"], {
    message: "Invalid status"
  }),
  isReceived: z.union([z.number(), z.boolean()]).optional(),
  receivedAt: z.string().nullable().optional(),
});

export type CreateSalesReturnPayload = z.infer<typeof CreateSalesReturnSchema>;
export type UpdateSalesReturnPayload = z.infer<typeof UpdateSalesReturnSchema>;
export type UpdateSalesReturnStatusPayload = z.infer<typeof UpdateSalesReturnStatusSchema>;
