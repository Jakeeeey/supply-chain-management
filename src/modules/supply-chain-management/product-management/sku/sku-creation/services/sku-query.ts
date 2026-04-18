import {
  MasterData,
  PaginatedSKU,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { CellHelpers } from "../utils/sku-helpers";
import { normalizeMasterData } from "../utils/sku-mapper";
import { API_BASE_URL, fetchItems, request } from "./sku-api";

/**
 * Read-only query operations for SKUs.
 * No side effects — safe to call from any context.
 */
export const skuQueryService = {
  async fetchApproved(
    limit: number = 10,
    offset: number = 0,
    search?: string,
    sort?: string,
  ): Promise<PaginatedSKU> {
    const filter: { _and: (Record<string, object> | { _or: Record<string, object>[] })[] } = {
      _and: [{ item_type: { _neq: "bundle" } }],
    };
    const searchFilter = CellHelpers.buildSearchFilter(search);
    if (searchFilter) {
      filter._and.push(searchFilter);
    }

    const { data, meta } = await fetchItems<SKU>("/items/products", {
      limit,
      offset,
      fields: "*,parent_id.*",
      meta: "filter_count",
      sort: sort || "-created_at,-product_id",
      ...(Object.keys(filter).length > 0
        ? { filter: JSON.stringify(filter) }
        : {}),
    });

    return {
      data: data || [],
      meta: {
        total_count: meta?.filter_count || 0,
        filter_count: meta?.filter_count || 0,
      },
    };
  },

  async fetchDrafts(
    limit: number = 10,
    offset: number = 0,
    status?: string,
    search?: string,
    sort?: string,
  ): Promise<PaginatedSKU> {
    const filter: Record<string, unknown[]> = { _and: [] };

    // Always exclude ACTIVE status (approved items must not appear in the draft queue)
    filter._and.push({ status: { _neq: "ACTIVE" } });

    if (status) {
      const target = status.toUpperCase();
      filter._and.push(
        target === "DRAFT"
          ? { status: { _in: ["DRAFT", "REJECTED"] } }
          : { status: { _eq: target } },
      );
    }

    const searchFilter = CellHelpers.buildSearchFilter(search);
    if (searchFilter) filter._and.push(searchFilter);

    const { data, meta } = await fetchItems<SKU>("/items/product_draft", {
      limit,
      offset,
      fields: "*,parent_id.*",
      meta: "filter_count",
      sort: sort || "-last_updated,-product_id",
      filter: JSON.stringify(filter),
    });

    return {
      data: data || [],
      meta: {
        total_count: meta?.filter_count || 0,
        filter_count: meta?.filter_count || 0,
      },
    };
  },

  async fetchMasterData(): Promise<MasterData> {
    const fetchResilient = async (
      names: string[],
    ): Promise<{ data: Record<string, unknown>[] }> => {
      for (const name of names) {
        try {
          const res = await fetchItems<Record<string, unknown>>(`/items/${name}`, { limit: -1 });
          if (res.data?.length) return res;
        } catch (e) {
          console.warn(`[SKU Query] Fetch failed for ${name}:`, e);
        }
      }
      return { data: [] };
    };

    const [units, categories, brands, suppliers] = await Promise.all([
      fetchResilient(["units", "unit", "product_unit"]),
      fetchResilient(["categories", "category", "product_category"]),
      fetchResilient(["brand", "brands", "product_brand"]),
      fetchResilient(["suppliers", "supplier", "product_supplier"]),
    ]);

    return {
      units: normalizeMasterData(units.data || []),
      categories: normalizeMasterData(categories.data || []),
      brands: normalizeMasterData(brands.data || []),
      suppliers: normalizeMasterData(suppliers.data || []),
    };
  },

  async checkDuplicateName(name: string): Promise<boolean> {
    const filter = `filter[product_name][_eq]=${encodeURIComponent(name)}&limit=1`;
    const [approved, drafts] = await Promise.all([
      request<{ data: SKU[] }>(`${API_BASE_URL}/items/products?${filter}`),
      request<{ data: SKU[] }>(`${API_BASE_URL}/items/product_draft?${filter}`),
    ]);
    return approved.data?.length > 0 || drafts.data?.length > 0;
  },
};
