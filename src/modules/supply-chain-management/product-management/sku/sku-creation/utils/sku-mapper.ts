import { SKU } from "../types/sku.schema";

/**
 * Normalizes raw master data from various Directus collections into a standard format
 */
export const normalizeMasterData = (items: any[]) =>
  items.map((i, index) => ({
    ...i,
    id: Number(
      i.id ??
        i.brand_id ??
        i.category_id ??
        i.unit_id ??
        i.supplier_id ??
        index,
    ),
    name: String(
      i.brand_name ||
        i.category_name ||
        i.unit_name ||
        i.supplier_name ||
        i.name ||
        i.title ||
        `Item #${index}`,
    ).trim(),
    code: String(i.code || i.sku_code || ""),
  }));

/**
 * Removes internal fields and metadata from a SKU object before sending to Product Master
 */
export const prepareSKUPayload = (
  draft: any,
  pMasterId?: number | null,
  code?: string,
) => {
  const {
    id,
    product_id,
    units,
    created_at,
    updated_at,
    user_created,
    user_updated,
    date_created,
    date_updated,
    status,
    ...restPayload
  } = draft;

  return {
    ...restPayload,
    product_code: code || draft.product_code,
    isActive: 1,
    status: "ACTIVE",
    parent_id: draft.parent_id ? pMasterId : null,
    product_brand: draft.product_brand?.id ?? draft.product_brand,
    product_category: draft.product_category?.id ?? draft.product_category,
    product_supplier: draft.product_supplier?.id ?? draft.product_supplier,
    unit_of_measurement:
      draft.unit_of_measurement?.id ?? draft.unit_of_measurement,
  };
};
