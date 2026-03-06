import { z } from "zod";

export const rfidTagSchema = z.object({
  id: z.string().optional(), // Local UI ID
  rfid_tag: z.string().min(1, "RFID tag is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  assignedDate: z.string().optional(),
});

export type RFIDTag = z.infer<typeof rfidTagSchema>;

export const stockConversionProductSchema = z.object({
  productId: z.number(),
  supplierId: z.number().optional(),
  brand: z.string(),
  category: z.string(),
  productCode: z.string().optional(),
  productDescription: z.string(),
  unitOfBox: z.number().optional(), // e.g. 24 pieces
  pieces: z.number().optional(),
  tie: z.number().optional(),
  pack: z.number().optional(),
  currentUnit: z.string(), // e.g. "Box"
  currentUnitId: z.number().optional(),
  quantity: z.number(), // Current box quantity in inventory
  totalAmount: z.number(), // Qty * price per unit
  pricePerUnit: z.number(),
  
  // Available conversion targets mapped from units
  availableUnits: z.array(z.object({
      unitId: z.number(),
      name: z.string(),
      conversionFactor: z.number().optional(), // multiplier vs base unit
  })).optional(),
});

export type StockConversionProduct = z.infer<typeof stockConversionProductSchema>;

export const stockConversionPayloadSchema = z.object({
  productId: z.number(),
  sourceUnitId: z.number(),
  targetUnitId: z.number(),
  quantityToConvert: z.number().min(1, "Quantity must be at least 1"),
  convertedQuantity: z.number().min(1, "Converted quantity must be at least 1"),
  branchId: z.number().min(1, "Branch ID is required"),
  userId: z.number().min(1, "User ID is required"),
  pricePerUnit: z.number(),
  rfidTags: z.array(rfidTagSchema).default([]),
});

export type StockConversionPayload = z.infer<typeof stockConversionPayloadSchema>;
