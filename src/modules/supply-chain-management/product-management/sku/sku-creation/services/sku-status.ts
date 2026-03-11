import { API_BASE_URL, request } from "./sku-api";

/**
 * Manages the active/inactive toggle for approved master products.
 * Operates on the /items/products collection (not drafts).
 */
export const skuStatusService = {
  async updateProductStatus(
    id: number | string,
    isActive: boolean,
  ): Promise<any> {
    const val = isActive ? 1 : 0;
    const status = isActive ? "ACTIVE" : "INACTIVE";

    console.log(
      `[SKU Status] Updating Product ${id}: isActive=${val}, status=${status}`,
    );

    return request(`${API_BASE_URL}/items/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: val, status }),
    });
  },

  async bulkUpdateProductStatus(
    ids: (number | string)[],
    isActive: boolean,
  ): Promise<any> {
    const val = isActive ? 1 : 0;
    const status = isActive ? "ACTIVE" : "INACTIVE";

    // Directus uses 'keys' for bulk PATCH on a collection
    const payload = {
      keys: ids,
      data: { isActive: val, status },
    };

    return request(`${API_BASE_URL}/items/products`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
