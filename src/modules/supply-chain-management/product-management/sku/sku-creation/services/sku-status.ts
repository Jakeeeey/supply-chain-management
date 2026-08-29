import { API_BASE_URL, request, fetchItems } from "./sku-api";

/**
 * Manages the active/inactive toggle for approved master products.
 * Operates on the /items/products collection (not drafts).
 */
export const skuStatusService = {
  async updateProductStatus(
    id: number | string,
    isActive: boolean,
  ): Promise<unknown> {
    return this.bulkUpdateProductStatus([id], isActive);
  },

  async bulkUpdateProductStatus(
    ids: (number | string)[],
    isActive: boolean,
  ): Promise<unknown> {
    const val = isActive ? 1 : 0;
    const status = isActive ? "ACTIVE" : "INACTIVE";

    console.log(
      `[SKU Status] Bulk updating products status: isActive=${val}, status=${status} for IDs:`,
      ids,
    );

    // 1. Fetch children of these products to cascade status change
    let allIdsToUpdate = [...ids];
    try {
      const { data: children } = await fetchItems<{ id: number; product_id?: number }>(
        "/items/products",
        {
          filter: JSON.stringify({ parent_id: { _in: ids } }),
          fields: "id,product_id",
          limit: -1,
        }
      );
      if (children?.length) {
        const childIds = children.map((c) => c.id || c.product_id).filter(Boolean) as (number | string)[];
        allIdsToUpdate = [...allIdsToUpdate, ...childIds];
      }
    } catch (e) {
      console.warn("[SKU Status] Failed to fetch children for bulk status update:", e);
    }

    // Directus uses 'keys' for bulk PATCH on a collection
    const payload = {
      keys: allIdsToUpdate,
      data: { isActive: val, status },
    };

    return request(`${API_BASE_URL}/items/products`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
