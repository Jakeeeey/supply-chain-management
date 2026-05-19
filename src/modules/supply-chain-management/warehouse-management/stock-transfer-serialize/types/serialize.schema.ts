import { z } from "zod";

/** Serial tracking entry for dispatch/receive recording. */
export const SerialTrackingSchema = z.object({
  stock_transfer_id: z.number().min(1, "Transfer ID is required"),
  serial_number: z.string().min(1, "Serial number is required"),
});

export type SerialTrackingValue = z.infer<typeof SerialTrackingSchema>;

/** Schema for updating serialized stock transfer statuses (PATCH body). */
export const UpdateSerializeTransferSchema = z.object({
  /** Array of items to update status and quantities for. */
  items: z.array(z.object({
    id: z.number().min(1, "Item ID is required"),
    status: z.string().min(1, "Status is required"),
    received_quantity: z.number().min(0).optional(),
  })).min(1, "At least one item is required"),
  
  /** Status to set for the entire batch. */
  status: z.string().min(1, "Target status is required"),
  
  /** Serial numbers to record in the tracking table. */
  serials: z.array(SerialTrackingSchema).optional(),
  
  /** Type of scan: DISPATCH or RECEIVE. */
  scanType: z.enum(["DISPATCH", "RECEIVE"]).optional(),
});

export type UpdateSerializeTransferValues = z.infer<typeof UpdateSerializeTransferSchema>;
