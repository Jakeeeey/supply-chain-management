import { getLiteralPHTTime } from "@/modules/supply-chain-management/product-management/utils/timezone";

/**
 * Normalizes raw master data from various Directus collections into a standard format
 */
export const normalizeMasterData = (items: Record<string, unknown>[]) =>
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
        i.class_name ||
        i.segment_name ||
        i.section_name ||
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
  draft: Record<string, unknown>,
  pMasterId?: number | null,
  code?: string,
  dbTime?: string,
) => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    id,
    product_id,
    units,
    date_created,
    date_updated,
    status,
    ...restPayload
  } = draft;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const payload = restPayload as Record<string, unknown>;
  const nowPHT = dbTime || getLiteralPHTTime();

  return {
    ...payload,
    product_code: code || draft.product_code,
    isActive: 1,
    status: "ACTIVE",
    parent_id: draft.parent_id ? pMasterId : null,
    date_added: draft.date_added || nowPHT,
    last_updated: nowPHT,
    created_at: draft.created_at || nowPHT,
    updated_at: nowPHT,
    created_by: typeof draft.created_by === "object" && draft.created_by !== null
      ? (draft.created_by as { id?: number | string }).id || null
      : draft.created_by || null,
    updated_by: typeof draft.updated_by === "object" && draft.updated_by !== null
      ? (draft.updated_by as { id?: number | string }).id || null
      : draft.updated_by || null,
    user_created: typeof draft.user_created === "object" && draft.user_created !== null
      ? (draft.user_created as { id?: number | string }).id || null
      : draft.user_created || null,
    user_updated: typeof draft.user_updated === "object" && draft.user_updated !== null
      ? (draft.user_updated as { id?: number | string }).id || null
      : draft.user_updated || null,
    product_brand: (draft.product_brand as Record<string, unknown>)?.id ?? draft.product_brand,
    product_category: (draft.product_category as Record<string, unknown>)?.id ?? draft.product_category,
    product_class: (draft.product_class as Record<string, unknown>)?.id ?? draft.product_class,
    product_segment: (draft.product_segment as Record<string, unknown>)?.id ?? draft.product_segment,
    product_section: (draft.product_section as Record<string, unknown>)?.id ?? draft.product_section,
    product_supplier: (draft.product_supplier as Record<string, unknown>)?.id ?? draft.product_supplier,
    unit_of_measurement:
      (draft.unit_of_measurement as Record<string, unknown>)?.id ?? draft.unit_of_measurement,
  };
};
