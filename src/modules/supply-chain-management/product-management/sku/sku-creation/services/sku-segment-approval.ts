import { PaginatedSKU, SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { CellHelpers } from "../utils/sku-helpers";
import { API_BASE_URL, fetchItems, request } from "./sku-api";

export const skuSegmentApprovalService = {
  async fetchPendingSegments(
    limit: number = 10,
    offset: number = 0,
    search?: string,
    sort?: string,
  ): Promise<PaginatedSKU> {
    const filter: { _and: (Record<string, object> | { _or: Record<string, object>[] })[] } = {
      _and: [
        { item_type: { _neq: "bundle" } },
        {
          _or: [
            { product_class: { _null: true } },
            { product_segment: { _null: true } },
            { product_section: { _null: true } },
          ],
        },
      ],
    };

    const searchFilter = CellHelpers.buildSearchFilter(search);
    if (searchFilter) {
      filter._and.push(searchFilter);
    }

    const { data: masterDataItems, meta } = await fetchItems<SKU>("/items/products", {
      limit,
      offset,
      fields: "*,parent_id.*",
      meta: "filter_count",
      sort: sort || "-created_at,-product_id",
      filter: JSON.stringify(filter),
    });

    if (!masterDataItems || masterDataItems.length === 0) {
      return {
        data: [],
        meta: {
          total_count: meta?.filter_count || 0,
          filter_count: meta?.filter_count || 0,
        },
      };
    }

    // Fetch proposed values from drafts using product_code
    const productCodes = masterDataItems
      .map((item) => item.product_code)
      .filter(Boolean) as string[];

    let draftsMap: Record<string, SKU> = {};

    if (productCodes.length > 0) {
      try {
        const { data: drafts } = await fetchItems<SKU>("/items/product_draft", {
          filter: JSON.stringify({ product_code: { _in: productCodes } }),
          limit: -1,
        });

        if (drafts) {
          draftsMap = drafts.reduce((acc, draft) => {
            if (draft.product_code) {
              acc[draft.product_code] = draft;
            }
            return acc;
          }, {} as Record<string, SKU>);
        }
      } catch (err) {
        console.error("[SKU Segment Approval] Failed to fetch proposed draft values", err);
      }
    }

    // Map proposed classification fields from the drafts back onto the master records
    const mappedData = masterDataItems.map((item) => {
      if (item.product_code && draftsMap[item.product_code]) {
        const draft = draftsMap[item.product_code];
        return {
          ...item,
          product_class: draft.product_class,
          product_segment: draft.product_segment,
          product_section: draft.product_section,
          // Add a flag or just pass them mapped. 
          // The UI will use these to display proposed values.
          _proposed_class: draft.product_class,
          _proposed_segment: draft.product_segment,
          _proposed_section: draft.product_section,
        };
      }
      return item;
    });

    return {
      data: mappedData,
      meta: {
        total_count: meta?.filter_count || 0,
        filter_count: meta?.filter_count || 0,
      },
    };
  },

  async approveSegment(
    id: number | string,
    product_class: number,
    product_segment: number,
    product_section: number,
  ): Promise<boolean> {
    await request(`${API_BASE_URL}/items/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        product_class,
        product_segment,
        product_section,
      }),
    });
    return true;
  },

  async rejectSegment(id: number | string): Promise<boolean> {
    try {
      // 1. Fetch the master product to get its product_code
      const { data: product } = await request<{ data: SKU }>(
        `${API_BASE_URL}/items/products/${id}`,
      );

      if (product?.product_code) {
        // 2. Find the corresponding draft
        const { data: drafts } = await fetchItems<SKU>("/items/product_draft", {
          filter: JSON.stringify({
            product_code: { _eq: product.product_code },
          }),
          limit: 1,
        });

        if (drafts?.length) {
          const draftId = drafts[0].id || drafts[0].product_id;
          // 3. Revert draft status back to SKU Approval queue
          await request(`${API_BASE_URL}/items/product_draft/${draftId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "FOR_APPROVAL" }),
          });
          console.log(`[Segment Approval] Reverted draft ${draftId} to FOR_APPROVAL`);
        }
      }
    } catch (err) {
      console.warn(`[Segment Approval] Could not revert draft for product ${id}:`, err);
    }

    try {
      // 4. Clean up supplier junction records for this product
      const { data: existingLinks } = await fetchItems<{ id: number }>(
        "/items/product_per_supplier",
        {
          filter: JSON.stringify({ product_id: { _eq: id } }),
          limit: -1,
        },
      );
      if (existingLinks?.length) {
        await Promise.all(
          existingLinks.map((record) =>
            request(`${API_BASE_URL}/items/product_per_supplier/${record.id}`, {
              method: "DELETE",
            }),
          ),
        );
      }
    } catch (err) {
      console.warn(`[Segment Approval] Failed to cleanup supplier links for product ${id}:`, err);
    }

    // 5. Delete the master product (removes it from the Masterlist)
    await request(`${API_BASE_URL}/items/products/${id}`, {
      method: "DELETE",
    });

    return true;
  },
};
