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
    supplierId?: number,
    facets?: {
      categoryId?: number;
      classId?: number;
      segmentId?: number;
      itemType?: string;
      brandId?: number;
      status?: string;
    },
  ): Promise<PaginatedSKU> {
    const filter: { _and: (Record<string, object> | { _or: Record<string, object>[] })[] } = {
      _and: [{ item_type: { _neq: "bundle" } }],
    };

    // Apply facet filters
    if (facets?.categoryId) {
      filter._and.push({ product_category: { _eq: facets.categoryId } });
    }
    if (facets?.classId) {
      filter._and.push({ product_class: { _eq: facets.classId } });
    }
    if (facets?.segmentId) {
      filter._and.push({ product_segment: { _eq: facets.segmentId } });
    }
    if (facets?.itemType) {
      filter._and.push({ inventory_type: { _eq: facets.itemType } });
    }
    if (facets?.brandId) {
      filter._and.push({ product_brand: { _eq: facets.brandId } });
    }
    if (facets?.status === "active") {
      filter._and.push({ isActive: { _eq: 1 } });
    } else if (facets?.status === "inactive") {
      filter._and.push({ isActive: { _eq: 0 } });
    }
    
    if (supplierId) {
      let supplierProductIds: number[] = [];
      try {
        const { data: supplierLinks } = await fetchItems<{
          product_id: number;
        }>("/items/product_per_supplier", {
          filter: JSON.stringify({ supplier_id: { _eq: supplierId } }),
          limit: -1,
        });
        if (supplierLinks) {
           supplierProductIds = supplierLinks.map(l => l.product_id).filter(Boolean);
        }
      } catch (err) {
        console.warn("[SKU Query] Failed to fetch supplier links for filtering:", err);
      }
      
      filter._and.push({ 
        product_id: { _in: supplierProductIds.length > 0 ? supplierProductIds : [-1] } 
      });
    }
    const searchFilter = CellHelpers.buildSearchFilter(search);
    if (searchFilter) {
      filter._and.push(searchFilter);
    }
    
    // Remove product_supplier from sort if it was accidentally passed
    const cleanSort = sort?.split(',').filter(s => !s.includes('product_supplier')).join(',') || "-created_at,-product_id";

    const { data, meta } = await fetchItems<SKU>("/items/products", {
      limit,
      offset,
      fields: "*,parent_id.*",
      meta: "filter_count",
      sort: cleanSort,
      ...(Object.keys(filter).length > 0
        ? { filter: JSON.stringify(filter) }
        : {}),
    });

    const products = data || [];
    if (products.length > 0) {
      const productIds = products.map((p) => p.product_id || p.id).filter(Boolean) as number[];
      try {
        // Chunk productIds into batches of 50 to avoid HTTP 431 URL length limits
        const chunkSize = 50;
        const supplierLinks: { product_id: number; supplier_id: number }[] = [];
        
        for (let i = 0; i < productIds.length; i += chunkSize) {
          const chunk = productIds.slice(i, i + chunkSize);
          const { data: chunkLinks } = await fetchItems<{
            product_id: number;
            supplier_id: number;
          }>("/items/product_per_supplier", {
            filter: JSON.stringify({
              product_id: { _in: chunk },
            }),
            limit: -1,
          });
          if (chunkLinks) {
            supplierLinks.push(...chunkLinks);
          }
        }

        if (supplierLinks?.length) {
          const supplierMap = new Map<number, number>();
          for (const link of supplierLinks) {
            // If filtering by a specific supplier, prioritize it
            if (!supplierMap.has(link.product_id) || (supplierId && link.supplier_id === supplierId)) {
              supplierMap.set(link.product_id, link.supplier_id);
            }
          }
          for (const p of products) {
            const pid = (p.product_id || p.id) as number;
            const sId = supplierId || supplierMap.get(pid);
            if (sId) {
              p.product_supplier = sId;
            }
          }
        }
      } catch (err) {
        console.warn("[SKU Query] Failed to enrich products with supplier data:", err);
      }
    }

    return {
      data: products,
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

    // Enrich drafts with supplier from junction table (product_draft_per_supplier)
    const drafts = data || [];
    if (drafts.length > 0) {
      const draftIds = drafts.map((d) => d.product_id || d.id).filter(Boolean);
      try {
        const { data: supplierLinks } = await fetchItems<{
          product_draft_id: number;
          supplier_id: number;
        }>("/items/product_draft_per_supplier", {
          filter: JSON.stringify({
            product_draft_id: { _in: draftIds },
          }),
          limit: -1,
        });

        if (supplierLinks?.length) {
          const supplierMap = new Map<number, number>();
          for (const link of supplierLinks) {
            supplierMap.set(link.product_draft_id, link.supplier_id);
          }
          for (const draft of drafts) {
            const draftId = (draft.product_id || draft.id) as number;
            const supplierId = supplierMap.get(draftId);
            if (supplierId) {
              draft.product_supplier = supplierId;
            }
          }
        }
      } catch (err) {
        console.warn("[SKU Query] Failed to enrich drafts with supplier data:", err);
      }
    }

    return {
      data: drafts,
      meta: {
        total_count: meta?.filter_count || 0,
        filter_count: meta?.filter_count || 0,
      },
    };
  },

  async fetchDraftById(id: number | string): Promise<SKU> {
    const { data } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${id}?fields=*,parent_id.*`,
    );
    return data;
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

    const [units, categories, brands, suppliers, classes, segments, sections] = await Promise.all([
      fetchResilient(["units", "unit", "product_unit"]),
      fetchResilient(["categories", "category", "product_category"]),
      fetchResilient(["brand", "brands", "product_brand"]),
      fetchResilient(["suppliers", "supplier", "product_supplier"]),
      fetchResilient(["product_class", "class", "classes"]),
      fetchResilient(["product_segment", "segment", "segments"]),
      fetchResilient(["product_section", "section", "sections"]),
    ]);

    return {
      units: normalizeMasterData(units.data || []),
      categories: normalizeMasterData(categories.data || []),
      brands: normalizeMasterData(brands.data || []),
      suppliers: normalizeMasterData(suppliers.data || []),
      classes: normalizeMasterData(classes.data || []),
      segments: normalizeMasterData(segments.data || []),
      sections: normalizeMasterData(sections.data || []),
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
