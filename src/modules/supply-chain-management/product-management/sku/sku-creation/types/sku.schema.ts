import { z } from "zod";

export const SKUStatusSchema = z.enum([
  "Draft",
  "For Approval",
  "Rejected",
  "Active",
  "Inactive",
  "DRAFT",
  "FOR APPROVAL",
  "FOR_APPROVAL",
  "REJECTED",
  "ACTIVE",
  "INACTIVE",
  "PENDING",
]);
export type SKUStatus = z.infer<typeof SKUStatusSchema>;

export const InventoryTypeSchema = z.enum(["Regular", "Variant"]);
export type InventoryType = z.infer<typeof InventoryTypeSchema>;

export const skuSchema = z
  .object({
    product_id: z.number().int().optional(),
    id: z.number().int().optional(), // For Directus drafting
    isActive: z.union([z.boolean(), z.number()]),
    status: SKUStatusSchema,
    inventory_type: InventoryTypeSchema,
    item_type: z.enum(["regular", "promo", "bundle"]).nullable().optional(),
    parent_id: z.number().int().nullable().optional(),

    product_name: z.string().min(1, "Product name is required"),
    product_code: z.string().optional(), // System generated
    barcode: z.string().nullable().optional(),
    product_images: z.string().nullable().optional(),
    main_image: z.string().nullable().optional(),

    product_brand: z.number().int().min(1, "Brand is required"),
    product_category: z.number().int().min(1, "Category is required"),
    product_supplier: z.number().int().min(1, "Supplier is required"),

    description: z.string().nullable().optional(),
    short_description: z.string().nullable().optional(),

    // UOM and Conversion
    base_unit: z.number().int().nullable().optional(), // Links to units master list
    unit_of_measurement: z.union([z.number(), z.any()]).nullable().optional(),
    unit_of_measurement_count: z.number().int().nullable().optional(), // Conversion rate

    // Attributes for Variants
    size: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    volume: z.string().nullable().optional(),
    flavor: z.string().nullable().optional(),

    // Costs and Prices
    estimated_unit_cost: z.number().nullable().optional(),
    estimated_extended_cost: z.number().nullable().optional(),
    price_per_unit: z.number().nullable().optional(),
    cost_per_unit: z.number().nullable().optional(),

    maintaining_quantity: z.number().int().nullable().optional(),
    product_shelf_life: z.number().int().nullable().optional(),
    product_weight: z.number().nullable().optional(),

    // Multi-Unit Support
    units: z
      .array(
        z.object({
          id: z.number().optional(), // Junction ID for updates
          unit_id: z.number().min(1, "Unit is required"),
          conversion_factor: z
            .number()
            .min(1, "Conversion factor must be at least 1"),
          price: z.number().nullable().optional(),
          cost: z.number().nullable().optional(),
          barcode: z.string().nullable().optional(),
          sku_code: z.string().nullable().optional(), // Potentially for future breakdown
        }),
      )
      .min(1, "At least one unit is required")
      .optional()
      .default([]),

    external_id: z.string().nullable().optional(),
    date_added: z.string().nullable().optional(),
    last_updated: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    remarks: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.inventory_type === "Variant") {
      if (!data.size && !data.color && !data.volume && !data.flavor) {
        const message =
          "At least one variant attribute (Size, Color, Volume, or Flavor) is required";
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["size"] });
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["color"] });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ["volume"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ["flavor"],
        });
      }
    }
  });

export type SKU = z.infer<typeof skuSchema>;

export interface GalleryImage {
  image_id: number;
  image: string;
  sort_order: number;
  isActive: number | boolean;
}

export interface SKUUnit {
  id: number;
  name: string;
}

export interface MasterData {
  units: SKUUnit[];
  categories: { id: number; name: string; code: string }[];
  brands: { id: number; name: string; code: string }[];
  suppliers: { id: number; name: string }[];
}

export interface PaginatedSKU {
  data: SKU[];
  meta: {
    total_count: number;
    filter_count: number;
  };
}
