import {
  MasterData,
  PaginatedSKU,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { API_BASE_URL, fetchItems, request } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku-api";
import { generateSKUCode } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku-generator";
import { skuQueryService } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku-query";
import { CellHelpers } from "@/modules/supply-chain-management/product-management/sku/sku-creation/utils/sku-helpers";
import { getDatabaseTimeISO } from "@/modules/supply-chain-management/product-management/utils/timezone";

/**
 * Product Registration Service — Direct master product creation.
 *
 * Unlike the SKU Creation module, products created here are inserted
 * directly into `items/products` (the master table), bypassing drafts.
 * Designed for administrators who do not require an approval workflow.
 */
export const productRegistrationService = {
  /**
   * Fetches paginated products from the master table with optional
   * search, sorting, and facet filters.
   */
  async fetchProducts(
    limit: number = 10,
    offset: number = 0,
    search?: string,
    sort?: string,
    supplierId?: number,
    facets?: {
      categoryId?: number;
      classId?: number;
      segmentId?: number;
      itemType?: string;
      brandId?: number;
      status?: string;
      uomId?: number;
    },
  ): Promise<PaginatedSKU> {
    // Delegate to the existing skuQueryService.fetchApproved which already
    // queries `items/products` with all facet logic, supplier junction
    // enrichment, and search filtering.
    return skuQueryService.fetchApproved(limit, offset, search, sort, supplierId, facets);
  },

  /**
   * Fetches shared master data (units, categories, brands, suppliers, etc.)
   */
  async fetchMasterData(): Promise<MasterData> {
    return skuQueryService.fetchMasterData();
  },

  /**
   * Creates a product directly in the master table.
   *
   * Flow:
   *  1. Generate SKU code(s) for each unit
   *  2. Insert parent record into `items/products`
   *  3. Link supplier via `items/product_per_supplier`
   *  4. Insert child variant records if multiple units
   */
  async createDirectProduct(sku: SKU): Promise<SKU> {
    const { units: rawUnits = [], ...baseData } = sku;
    const resolvedUnitId =
      typeof sku.unit_of_measurement === "number"
        ? sku.unit_of_measurement
        : typeof sku.unit_of_measurement === "object" && sku.unit_of_measurement !== null
          ? (sku.unit_of_measurement as { id?: number }).id || 1
          : 1;

    const units =
      rawUnits.length > 0
        ? rawUnits
        : [
            {
              unit_id: resolvedUnitId,
              conversion_factor: sku.unit_of_measurement_count || 1,
              price: sku.price_per_unit,
              cost: sku.cost_per_unit,
              barcode: sku.barcode,
            },
          ];

    const masterData = await skuQueryService.fetchMasterData();
    const codes: string[] = [];
    let parentSequence: string | undefined = undefined;

    for (const u of units) {
      const result = await generateSKUCode(
        {
          ...baseData,
          unit_of_measurement: u.unit_id,
          unit_of_measurement_count: u.conversion_factor,
        } as SKU,
        masterData,
        parentSequence
      );
      
      codes.push(result.code);
      if (!parentSequence) {
        parentSequence = result.sequence;
      }
    }

    const nowPHT = await getDatabaseTimeISO();

    const createPayload = (
      u: {
        unit_id: number;
        conversion_factor: number;
        price?: number | null;
        cost?: number | null;
        barcode?: string | null;
      },
      code: string,
      parentId: number | string | null = null,
    ): Record<string, unknown> => ({
      ...baseData,
      status: "ACTIVE",
      isActive: 1,
      parent_id: parentId,
      unit_of_measurement: u.unit_id,
      unit_of_measurement_count: u.conversion_factor,
      price_per_unit: u.price,
      cost_per_unit: u.cost,
      barcode: u.barcode,
      product_code: code,
      date_added: nowPHT,
      last_updated: nowPHT,
      created_at: nowPHT,
      updated_at: nowPHT,
      // Note: created_by and updated_by are merged from baseData
    });

    // Insert parent product
    const parentPayload = createPayload(units[0], codes[0]);
    console.log("[Product Registration] DEBUG parent payload inventory_type:", parentPayload.inventory_type);
    console.log("[Product Registration] DEBUG payload created_by:", parentPayload.created_by, "user_created:", parentPayload.user_created, "updated_by:", parentPayload.updated_by);
    console.log("[Product Registration] DEBUG full baseData keys:", Object.keys(baseData));
    const { data: parent } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/products`,
      {
        method: "POST",
        body: JSON.stringify(parentPayload),
      },
    );
    const parentId = parent.id || parent.product_id;

    // Link supplier via junction table
    const supplierId = sku.product_supplier;
    if (parentId && supplierId) {
      try {
        await request(`${API_BASE_URL}/items/product_per_supplier`, {
          method: "POST",
          body: JSON.stringify({ product_id: parentId, supplier_id: supplierId }),
        });
      } catch (err: unknown) {
        console.error(
          `[Product Registration] Failed to save supplier for product ${parentId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Insert child variants if multiple units exist
    if (units.length > 1) {
      await Promise.all(
        units.slice(1).map(async (u, i) => {
          const { data: child } = await request<{ data: SKU }>(
            `${API_BASE_URL}/items/products`,
            {
              method: "POST",
              body: JSON.stringify(createPayload(u, codes[i + 1], parentId)),
            },
          );

          const childId = child.id || child.product_id;
          if (childId && supplierId) {
            try {
              await request(`${API_BASE_URL}/items/product_per_supplier`, {
                method: "POST",
                body: JSON.stringify({ product_id: childId, supplier_id: supplierId }),
              });
            } catch (err: unknown) {
              console.error(
                `[Product Registration] Failed to save supplier for child product ${childId}:`,
                err instanceof Error ? err.message : err,
              );
            }
          }
        }),
      );
    }

    return parent;
  },

  /**
   * Updates an existing master product directly.
   * Restricted to editable fields: name, supplier, description, taxonomy.
   */
  async updateProduct(id: number | string, data: Partial<SKU>): Promise<SKU> {
    const nowPHT = await getDatabaseTimeISO();
    const { data: updated } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/products/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...data, last_updated: nowPHT }),
      },
    );

    // Sync supplier in junction table if changed
    const supplierId = data.product_supplier;
    if (supplierId) {
      try {
        const { data: existing } = await fetchItems<{ id: number; supplier_id: number }>(
          "/items/product_per_supplier",
          {
            filter: JSON.stringify({ product_id: { _eq: id } }),
            limit: 1,
          },
        );

        if (existing?.length) {
          await request(
            `${API_BASE_URL}/items/product_per_supplier/${existing[0].id}`,
            { method: "PATCH", body: JSON.stringify({ supplier_id: supplierId }) },
          );
        } else {
          await request(`${API_BASE_URL}/items/product_per_supplier`, {
            method: "POST",
            body: JSON.stringify({ product_id: id, supplier_id: supplierId }),
          });
        }
      } catch (err: unknown) {
        console.error(
          `[Product Registration] Failed to sync supplier for product ${id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return updated;
  },

  /**
   * Updates the main_image of a master product.
   */
  async updateImage(id: number | string, imageId: string | null): Promise<SKU> {
    const { data } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/products/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ main_image: imageId }),
      },
    );
    return data;
  },

  /**
   * Bulk update active/inactive status for master products.
   */
  async bulkUpdateStatus(
    ids: (number | string)[],
    isActive: boolean,
  ): Promise<unknown> {
    const val = isActive ? 1 : 0;
    const status = isActive ? "ACTIVE" : "INACTIVE";

    return request(`${API_BASE_URL}/items/products`, {
      method: "PATCH",
      body: JSON.stringify({
        keys: ids,
        data: { isActive: val, status },
      }),
    });
  },

  /**
   * Toggle active/inactive status for a single master product.
   */
  async toggleStatus(
    id: number | string,
    isActive: boolean,
  ): Promise<unknown> {
    const val = isActive ? 1 : 0;
    const status = isActive ? "ACTIVE" : "INACTIVE";

    return request(`${API_BASE_URL}/items/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: val, status }),
    });
  },

  async checkDuplicateName(name: string, excludeId?: number | string): Promise<boolean> {
    const trimmedName = name.trim();
    const [approvedRes, draftsRes] = await Promise.all([
      fetchItems<SKU>("/items/products", {
        filter: JSON.stringify({ product_name: { _eq: trimmedName } }),
        limit: 100,
      }),
      fetchItems<SKU>("/items/product_draft", {
        filter: JSON.stringify({ product_name: { _eq: trimmedName } }),
        limit: 100,
      }),
    ]);


    const approved = approvedRes.data || [];
    const drafts = draftsRes.data || [];

    const hasDuplicateInProducts = approved.some(
      (p) => {
        if (excludeId && (String(p.id) === String(excludeId) || String(p.product_id) === String(excludeId))) return false;
        if (excludeId && p.parent_id && (String(p.parent_id) === String(excludeId) || (typeof p.parent_id === "object" && String((p.parent_id as { id?: number | string }).id) === String(excludeId)))) return false;
        return !p.parent_id;
      }
    );
    const hasDuplicateInDrafts = drafts.some(
      (p) => {
        if (excludeId && (String(p.id) === String(excludeId) || String(p.product_id) === String(excludeId))) return false;
        if (excludeId && p.parent_id && (String(p.parent_id) === String(excludeId) || (typeof p.parent_id === "object" && String((p.parent_id as { id?: number | string }).id) === String(excludeId)))) return false;
        return !p.parent_id;
      }
    );

    return hasDuplicateInProducts || hasDuplicateInDrafts;
  },

  /**
   * Fetch parent images for inheritance display.
   */
  async fetchParentImages(productData: SKU[]): Promise<Record<number, string | null>> {
    const parentIds = Array.from(
      new Set(
        productData
          .map((s) => s.parent_id)
          .filter((pid): pid is number => typeof pid === "number"),
      ),
    );

    if (parentIds.length === 0) return {};

    const map: Record<number, string | null> = {};
    productData.forEach((s) => {
      const sid = s.id || s.product_id;
      if (sid) map[Number(sid)] = s.main_image || null;
    });

    const missingIds = parentIds.filter((id) => map[id] === undefined);

    if (missingIds.length > 0) {
      try {
        const result = await skuQueryService.fetchApproved(
          missingIds.length,
          0,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        const searchFilter = JSON.stringify({ product_id: { _in: missingIds } });
        const { data: parents } = await fetchItems<SKU>("/items/products", {
          filter: searchFilter,
          limit: missingIds.length,
        });

        if (parents) {
          parents.forEach((p) => {
            const pid = p.id || p.product_id;
            if (pid) map[Number(pid)] = p.main_image || null;
          });
        }

        // Suppress unused variable – result is from the original query pattern
        void result;
      } catch (err) {
        console.warn("[Product Registration] Failed to fetch missing parent images", err);
      }
    }

    return map;
  },

  /**
   * Build search filter for Directus queries.
   */
  buildSearchFilter: CellHelpers.buildSearchFilter,
};
