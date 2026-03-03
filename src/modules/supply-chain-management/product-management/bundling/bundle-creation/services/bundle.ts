/**
 * Core business logic for the Bundling module.
 * Handles all Directus interactions for bundle CRUD, approval flow,
 * and code generation.
 */

import {
  Bundle,
  BundleDraft,
  BundleItem,
  BundleType,
  ProductOption,
  BundleDraftFormValues,
  BundleMasterData,
  PaginatedBundles,
} from "../../types/bundle.schema";
import { fetchItems, request, API_BASE_URL } from "./bundle-api";

export const bundleService = {
  // ─── Master Data ──────────────────────────────────────────

  /**
   * Fetches reference data needed for bundle creation forms.
   * Includes bundle types and active products.
   * @returns {Promise<BundleMasterData>} Bundle types and active products
   */
  async fetchMasterData(): Promise<BundleMasterData> {
    // Fetch sequentially to avoid exhausting DB connections
    const typesRes = await fetchItems<any>("/items/product_bundle_types", {
      limit: -1,
    });
    const productsRes = await fetchItems<any>("/items/products", {
      limit: -1,
      "filter[isActive][_eq]": 1,
      fields: "product_id,product_name,product_code,isActive",
      sort: "product_name",
    });

    const bundleTypes: BundleType[] = (typesRes.data || []).map((t: any) => ({
      id: Number(t.id),
      name: String(t.name || t.title || `Type #${t.id}`),
    }));

    const products: ProductOption[] = (productsRes.data || []).map(
      (p: any) => ({
        product_id: Number(p.product_id || p.id),
        product_name: String(p.product_name || ""),
        product_code: String(p.product_code || ""),
        isActive: Number(p.isActive ?? 0),
      }),
    );

    return { bundleTypes, products };
  },

  // ─── Bundle Code Generation ────────────────────────────────

  /**
   * Generates a unique bundle SKU code in [XXX-0000] format.
   * XXX = First 3 uppercase consonants from the bundle name.
   * 0000 = 4-digit zero-padded sequence number based on existing count.
   * @param name - Bundle name to derive the prefix from
   * @returns {Promise<string>} Generated unique bundle SKU code
   */
  async generateBundleCode(name: string): Promise<string> {
    // Extract prefix: consonant-priority, 3 chars
    const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
    const consonants = clean.replace(/[AEIOU]/g, "");
    const prefix = (consonants + clean).substring(0, 3).padEnd(3, "X");

    // Count existing bundles (drafts + approved) for sequence
    let totalCount = 0;
    try {
      const [draftRes, masterRes] = await Promise.all([
        fetchItems<any>("/items/product_bundles_draft", {
          limit: 0,
          meta: "filter_count",
        }),
        fetchItems<any>("/items/product_bundles", {
          limit: 0,
          meta: "filter_count",
        }),
      ]);
      totalCount =
        (draftRes.meta?.filter_count || 0) +
        (masterRes.meta?.filter_count || 0);
    } catch {
      totalCount = 0;
    }

    let seqNum = totalCount + 1;
    let finalCode =
      `${prefix}-${String(seqNum).padStart(4, "0")}`.toUpperCase();

    // Safety Loop: Check if code already exists in EITHER collection
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const [inDraft, inApproved] = await Promise.all([
        fetchItems<any>("/items/product_bundles_draft", {
          filter: JSON.stringify({ bundle_sku: { _eq: finalCode } }),
          limit: 1,
        }),
        fetchItems<any>("/items/product_bundles", {
          filter: JSON.stringify({ bundle_sku: { _eq: finalCode } }),
          limit: 1,
        }),
      ]);

      if (inDraft.data?.length === 0 && inApproved.data?.length === 0) {
        isUnique = true;
      } else {
        seqNum++;
        finalCode =
          `${prefix}-${String(seqNum).padStart(4, "0")}`.toUpperCase();
        attempts++;
      }
    }

    return finalCode;
  },

  // ─── Drafts (CRUD) ─────────────────────────────────────────

  /**
   * Fetches draft bundles with server-side pagination and search.
   * @param limit - Page size
   * @param offset - Record offset
   * @param status - Filter by status (DRAFT or FOR_APPROVAL)
   * @param search - Optional search term for bundle_name or bundle_sku
   * @returns {Promise<PaginatedBundles>} Paginated draft results
   */
  async fetchDrafts(
    limit: number = 10,
    offset: number = 0,
    status?: string,
    search?: string,
  ): Promise<PaginatedBundles> {
    const filter: any = { _and: [] };

    if (status) {
      filter._and.push({ draft_status: { _eq: status } });
    }

    if (search) {
      filter._and.push({
        _or: [
          { bundle_name: { _icontains: search } },
          { bundle_sku: { _icontains: search } },
        ],
      });
    }

    const params: Record<string, any> = {
      limit,
      offset,
      fields: "*.*",
      meta: "filter_count",
      sort: "-id",
    };

    if (filter._and.length > 0) {
      params.filter = JSON.stringify(filter);
    }

    const { data, meta } = await fetchItems<BundleDraft>(
      "/items/product_bundles_draft",
      params,
    );

    return {
      data: data || [],
      meta: {
        total_count: meta?.filter_count || 0,
        filter_count: meta?.filter_count || 0,
      },
    };
  },

  /**
   * Fetches approved bundles from the master collection.
   * @param limit - Page size
   * @param offset - Record offset
   * @param search - Optional search term
   * @returns {Promise<PaginatedBundles>} Paginated approved bundles
   */
  async fetchApproved(
    limit: number = 10,
    offset: number = 0,
    search?: string,
    status?: string,
    typeId?: number,
  ): Promise<PaginatedBundles> {
    const masterFilter: any = { _and: [] };
    const draftFilter: any = { _and: [{ draft_status: { _eq: "REJECTED" } }] };

    if (search) {
      const searchFilter = {
        _or: [
          { bundle_name: { _icontains: search } },
          { bundle_sku: { _icontains: search } },
        ],
      };
      masterFilter._and.push(searchFilter);
      draftFilter._and.push(searchFilter);
    }

    if (typeId) {
      masterFilter._and.push({ bundle_type_id: { _eq: typeId } });
      draftFilter._and.push({ bundle_type_id: { _eq: typeId } });
    }

    // Logic:
    // If status is 'REJECTED' or empty/undefined (all), we fetch from drafts collection.
    // If status is 'APPROVED' or empty/undefined (all), we fetch from master collection.

    const fetchMaster = !status || status === "APPROVED" || status === "ALL";
    const fetchRejected = !status || status === "REJECTED" || status === "ALL";

    let results: any[] = [];
    let totalCount = 0;

    const masterRes = fetchMaster
      ? await fetchItems<Bundle>("/items/product_bundles", {
          limit: limit,
          offset: offset,
          fields: "*.*",
          meta: "filter_count",
          sort: "updated_at",
          filter:
            masterFilter._and.length > 0
              ? JSON.stringify(masterFilter)
              : undefined,
        })
      : { data: [], meta: { filter_count: 0 } };

    const draftRes = fetchRejected
      ? await fetchItems<BundleDraft>("/items/product_bundles_draft", {
          limit: limit,
          offset: offset,
          fields: "*.*",
          meta: "filter_count",
          sort: "created_at",
          filter: JSON.stringify(draftFilter),
        })
      : { data: [], meta: { filter_count: 0 } };

    // Merge results
    results = [...(draftRes.data || []), ...(masterRes.data || [])];
    totalCount =
      (masterRes.meta?.filter_count || 0) + (draftRes.meta?.filter_count || 0);

    // Sort by updated_at descending so the most recently modified items appear first
    results.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    // If both were fetched, we might have too many items per 'limit'.
    // We'll slice them for the UI consistency.
    if (results.length > limit) {
      results = results.slice(0, limit);
    }

    return {
      data: results,
      meta: {
        total_count: totalCount,
        filter_count: totalCount,
      },
    };
  },

  /**
   * Creates a new bundle draft and its associated product items.
   * 1. Generates a unique bundle SKU code.
   * 2. Creates the draft record in product_bundles_draft.
   * 3. Creates each bundle item in product_bundle_items with the draft's id.
   * @param values - Validated form values
   * @returns The created draft record
   */
  async createDraft(values: BundleDraftFormValues) {
    const bundleSku = await this.generateBundleCode(values.bundle_name);

    // Create the draft bundle record
    const { data: draft } = await request<{ data: BundleDraft }>(
      `${API_BASE_URL}/items/product_bundles_draft`,
      {
        method: "POST",
        body: JSON.stringify({
          bundle_sku: bundleSku,
          bundle_name: values.bundle_name,
          bundle_type_id: values.bundle_type_id,
          draft_status: "DRAFT",
        }),
      },
    );

    const draftId = draft.id;

    // Create the associated bundle items
    if (values.items.length > 0) {
      await Promise.all(
        values.items.map((item: BundleItem) =>
          request(`${API_BASE_URL}/items/product_bundle_items_draft`, {
            method: "POST",
            body: JSON.stringify({
              bundle_draft_id: draftId,
              product_id: item.product_id,
              quantity: item.quantity,
            }),
          }),
        ),
      );
    }

    return draft;
  },

  /**
   * Deletes a draft bundle and its associated items.
   * @param id - Draft bundle ID
   */
  async deleteDraft(id: number | string) {
    // Delete associated bundle items first
    try {
      const { data: items } = await fetchItems<any>(
        "/items/product_bundle_items_draft",
        {
          filter: JSON.stringify({ bundle_draft_id: { _eq: id } }),
          limit: -1,
        },
      );

      if (items?.length) {
        await Promise.all(
          items.map((item: any) =>
            request(
              `${API_BASE_URL}/items/product_bundle_items_draft/${item.id}`,
              {
                method: "DELETE",
              },
            ),
          ),
        );
      }
    } catch (err: any) {
      console.error(
        `[Bundle] Failed to clean up items for draft ${id}:`,
        err.message,
      );
    }

    // Delete the draft
    await request(`${API_BASE_URL}/items/product_bundles_draft/${id}`, {
      method: "DELETE",
    });

    return true;
  },

  // ─── Status Transitions ────────────────────────────────────

  /**
   * Submits a draft bundle for approval by changing its status.
   * @param id - Draft bundle ID
   */
  async submitForApproval(id: number | string) {
    await request(`${API_BASE_URL}/items/product_bundles_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ draft_status: "FOR_APPROVAL" }),
    });
    return true;
  },

  /**
   * Approves a bundle draft:
   * 1. Creates a master record in product_bundles.
   * 2. Updates item references to point to the master bundle.
   * 3. Cleans up the draft record.
   * @param id - Draft bundle ID
   */
  async approveDraft(id: number | string) {
    // Fetch the draft
    const { data: draft } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_bundles_draft/${id}?fields=*.*`,
    );

    if (!draft) throw new Error("Draft bundle not found");

    // 1.5. Validate all component SKUs are still active
    const { data: draftItems } = await fetchItems<any>(
      "/items/product_bundle_items_draft",
      {
        filter: JSON.stringify({ bundle_draft_id: { _eq: id } }),
        fields:
          "product_id.product_name,product_id.isActive,product_id.product_code",
      },
    );

    const inactiveItems = draftItems?.filter(
      (item: any) => item.product_id?.isActive === 0,
    );
    if (inactiveItems?.length) {
      const names = inactiveItems
        .map(
          (i: any) => i.product_id?.product_name || i.product_id?.product_code,
        )
        .join(", ");
      throw new Error(
        `Cannot approve bundle. The following component SKUs are inactive: ${names}`,
      );
    }

    // Create master record in product_bundles
    const { data: masterBundle } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_bundles`,
      {
        method: "POST",
        body: JSON.stringify({
          bundle_sku: draft.bundle_sku,
          bundle_name: draft.bundle_name,
          bundle_type_id:
            typeof draft.bundle_type_id === "object"
              ? draft.bundle_type_id?.id
              : draft.bundle_type_id,
          status: "APPROVED",
        }),
      },
    );

    const masterId = masterBundle.id;

    // Get draft items
    const { data: items } = await fetchItems<any>(
      "/items/product_bundle_items_draft",
      {
        filter: JSON.stringify({ bundle_draft_id: { _eq: id } }),
        limit: -1,
      },
    );

    // Create master items
    if (items?.length) {
      await Promise.all(
        items.map((item: any) =>
          request(`${API_BASE_URL}/items/product_bundle_items`, {
            method: "POST",
            body: JSON.stringify({
              bundle_id: masterId,
              product_id: item.product_id,
              quantity: item.quantity,
            }),
          }),
        ),
      );
    }

    // Cleanup the draft
    try {
      await request(`${API_BASE_URL}/items/product_bundles_draft/${id}`, {
        method: "DELETE",
      });
    } catch {
      // Fallback: mark as APPROVED if delete fails
      await request(`${API_BASE_URL}/items/product_bundles_draft/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ draft_status: "APPROVED" }),
      });
    }

    return masterBundle;
  },

  /**
   * Rejects a bundle draft by resetting its status back to DRAFT.
   * @param id - Draft bundle ID
   */
  async rejectDraft(id: number | string) {
    await request(`${API_BASE_URL}/items/product_bundles_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ draft_status: "REJECTED" }),
    });
    return true;
  },

  /**
   * Fetches a single draft bundle with its items populated.
   * @param id - Draft bundle ID
   * @returns The draft with items
   */
  async fetchDraftById(id: number | string) {
    const { data: draft } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_bundles_draft/${id}?fields=*.*`,
    );

    // Fetch associated items
    const { data: items } = await fetchItems<any>(
      "/items/product_bundle_items_draft",
      {
        filter: JSON.stringify({ bundle_draft_id: { _eq: id } }),
        limit: -1,
        fields: "*.*",
      },
    );

    return {
      ...draft,
      items: items || [],
    };
  },

  /**
   * Fetches a single approved bundle with its items.
   * @param id - Master bundle ID
   * @returns The bundle with items
   */
  async fetchBundleById(id: number | string) {
    const { data: bundle } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_bundles/${id}?fields=*.*`,
    );

    const { data: items } = await fetchItems<any>(
      "/items/product_bundle_items",
      {
        filter: JSON.stringify({ bundle_id: { _eq: id } }),
        limit: -1,
        fields: "*.*",
      },
    );

    return {
      ...bundle,
      items: items || [],
    };
  },
};
