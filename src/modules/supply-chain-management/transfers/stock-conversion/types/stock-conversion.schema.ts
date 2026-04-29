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
  supplierName: z.string().optional(),
  supplierShortcut: z.string().optional(),
  brand: z.string(),
  category: z.string(),
  productCode: z.string().optional(),
  productName: z.string().optional(),
  productDescription: z.string(),
  family: z.string().optional(),
  conversionFactor: z.number().optional(), // multiplier vs base unit
  currentUnit: z.string(), // e.g. "Box"
  currentUnitId: z.number().optional(),
  quantity: z.number(), // Current box quantity in inventory
  totalAmount: z.number(), // Qty * price per unit
  pricePerUnit: z.number(),
  inventoryLoaded: z.boolean().optional(),
  inventoryError: z.boolean().optional(),
  
  // Available conversion targets mapped from units
  availableUnits: z.array(z.object({
      unitId: z.number(),
      name: z.string(),
      conversionFactor: z.number().optional(), // multiplier vs base unit
      targetProductId: z.number().optional(),
  })).optional(),
});

export type StockConversionProduct = z.infer<typeof stockConversionProductSchema>;

export const stockConversionPayloadSchema = z.object({
  productId: z.number(),
  sourceUnitId: z.number(),
  targetUnitId: z.number(),
  targetProductId: z.number(),
  quantityToConvert: z.number().gt(0, "Quantity must be greater than 0"),
  convertedQuantity: z.number().gt(0, "Converted quantity must be greater than 0"),
  branchId: z.number().min(1, "Branch ID is required"),
  userId: z.number().min(1, "User ID is required"),
  pricePerUnit: z.number(),
  rfidTags: z.array(rfidTagSchema).default([]),
  sourceRfidTags: z.array(z.string()).optional(),
});

export type StockConversionPayload = z.infer<typeof stockConversionPayloadSchema>;
