import { z } from "zod";
import type { RFIDTag, StockConversionProduct, StockConversionPayload } from "./stock-conversion.types";

export const rfidTagSchema = z.object({
  id: z.string().optional(),
  rfid_tag: z.string().min(1, "RFID tag is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  assignedDate: z.string().optional(),
}) satisfies z.ZodType<RFIDTag>;

export const stockConversionProductSchema = z.object({
  productId: z.number(),
  supplierId: z.number().optional(),
  supplierName: z.string().optional(),
  supplierShortcut: z.string().optional(),
  brand: z.string(),
  category: z.string(),
  productCode: z.string(),
  productName: z.string(),
  productDescription: z.string(),
  family: z.string().optional(),
  conversionFactor: z.number().optional(),
  currentUnit: z.string(),
  currentUnitId: z.number(),
  quantity: z.number(),
  totalAmount: z.number(),
  pricePerUnit: z.number(),
  inventoryLoaded: z.boolean().optional(),
  inventoryError: z.boolean().optional(),
  availableUnits: z.array(z.object({
    unitId: z.number(),
    name: z.string(),
    conversionFactor: z.number().optional(),
    targetProductId: z.number().optional(),
  })).optional(),
}) satisfies z.ZodType<StockConversionProduct>;

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
}) satisfies z.ZodType<StockConversionPayload>;
