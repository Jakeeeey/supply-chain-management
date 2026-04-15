/**
 * Core business logic for the Bundling module.
 * Handles all Directus interactions for bundle CRUD, approval flow,
 * and code generation.
 */

import {
  Bundle,
  BundleDraft,
  BundleDraftFormValues,
  BundleItem,
  BundleMasterData,
  BundleType,
  PaginatedBundles,
  ProductOption,
} from "../types/bundle.schema";
import { API_BASE_URL, fetchItems, request } from "./bundle-api";

export const bundleService = {
  // ─── Master Data ──────────────────────────────────────────

  /**
   * Fetches reference data needed for bundle creation forms.
   * Includes bundle types and active products.
   * @returns {Promise<BundleMasterData>} Bundle types and active products
   */
  async fetchMasterData(): Promise<BundleMasterData> {
    // Fetch sequentially to avoid exhausting DB connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typesRes = await fetchItems<any>("/items/product_bundle_types", {
      limit: -1,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productsRes = await fetchItems<any>("/items/products", {
      limit: -1,
      "filter[isActive][_eq]": 1,
      fields:
        "product_id,product_name,product_code,isActive,unit_of_measurement.*",
      sort: "product_name",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unitsRes = await fetchItems<any>("/items/units", {
      limit: -1,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bundleTypes: BundleType[] = (typesRes.data || []).map((t: any) => ({
      id: Number(t.id),
      name: String(t.name || t.title || `Type #${t.id}`),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const units = (unitsRes.data || []).map((u: any) => ({
      id: u.unit_id ?? u.id ?? 0,
      name: String(u.unit_name || u.name || u.unit_shortcut || ""),
    }));

    const unitMap = new Map<number, string>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      units.map((u: any) => [Number(u.id), u.name] as [number, string]),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products: ProductOption[] = (productsRes.data || []).map((p: any) => {
      const uom = p.unit_of_measurement;
      let unit_name = "";

      if (uom && typeof uom === "object") {
        unit_name = String(
          uom.unit_name || uom.name || uom.unit_shortcut || "",
        );
      } else if (uom !== null && uom !== undefined && !Array.isArray(uom)) {
        unit_name = unitMap.get(Number(uom)) || "";
      }

      return {
        product_id: Number(p.product_id || p.id),
        product_name: String(p.product_name || ""),
        product_code: String(p.product_code || ""),
        isActive: Number(p.isActive ?? 0),
        unit_name,
      };
    });

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetchItems<any>("/items/product_bundles_draft", {
          limit: 0,
          meta: "filter_count",
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetchItems<any>("/items/products", {
          limit: 0,
          meta: "filter_count",
          "filter[item_type][_eq]": "bundle",
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetchItems<any>("/items/product_bundles_draft", {
          filter: JSON.stringify({ bundle_sku: { _eq: finalCode } }),
          limit: 1,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetchItems<any>("/items/products", {
          filter: JSON.stringify({ product_code: { _eq: finalCode } }),
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
   * @param typeId - Optional filter by bundle_type_id
   * @returns {Promise<PaginatedBundles>} Paginated draft results
   */
  async fetchDrafts(
    limit: number = 10,
    offset: number = 0,
    status?: string,
    search?: string,
    typeId?: number,
  ): Promise<PaginatedBundles> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { _and: [] };

    if (status) {
      filter._and.push({ draft_status: { _eq: status } });
    }

    if (typeId) {
      filter._and.push({ bundle_type_id: { _eq: typeId } });
    }

    if (search) {
      filter._and.push({
        _or: [
          { bundle_name: { _icontains: search } },
          { bundle_sku: { _icontains: search } },
        ],
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const masterFilter: any = { _and: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draftFilter: any = { _and: [{ draft_status: { _eq: "REJECTED" } }] };

    if (search) {
      // Master (products table) uses product_name / product_code
      masterFilter._and.push({
        _or: [
          { product_name: { _icontains: search } },
          { product_code: { _icontains: search } },
        ],
      });
      // Drafts still use bundle_name / bundle_sku
      draftFilter._and.push({
        _or: [
          { bundle_name: { _icontains: search } },
          { bundle_sku: { _icontains: search } },
        ],
      });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let results: any[] = [];
    let totalCount = 0;

    const masterRes = fetchMaster
      ? await fetchItems<Bundle>("/items/products", {
          limit: 200, // Fetch a larger pool from both tables
          offset: 0, // Always fetch from the beginning to ensure correct merging
          fields: "*.*",
          meta: "filter_count",
          sort: "-product_id",
          filter: JSON.stringify({
            _and: [
              ...(masterFilter._and.length > 0 ? masterFilter._and : []),
              { item_type: { _eq: "bundle" } },
            ],
          }),
        })
      : { data: [], meta: { filter_count: 0 } };

    const draftRes = fetchRejected
      ? await fetchItems<BundleDraft>("/items/product_bundles_draft", {
          limit: 200, // Fetch a larger pool from both tables
          offset: 0, // Always fetch from the beginning to ensure correct merging
          fields: "*.*",
          meta: "filter_count",
          sort: "-id",
          filter: JSON.stringify(draftFilter),
        })
      : { data: [], meta: { filter_count: 0 } };

    // Merge results and normalize field names for the UI
    results = [
      ...(draftRes.data || []),
      ...(masterRes.data || []).map((p: any) => ({
        ...p,
        id: p.product_id,
        bundle_sku: p.product_code,
        bundle_name: p.product_name,
        status: "APPROVED",
      })),
    ];
    totalCount =
      (masterRes.meta?.filter_count || 0) + (draftRes.meta?.filter_count || 0);

    // Sort: most recently updated/created first (strictly chronological)
    results.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getSortTime = (item: any) => {
        const dateStr =
          item.updated_at ||
          item.last_updated ||
          item.date_updated ||
          item.created_at ||
          item.date_created ||
          0;
        return new Date(dateStr).getTime();
      };
      return getSortTime(b) - getSortTime(a);
    });

    // Unified pagination: slice the merged and sorted results
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      data: paginatedResults,
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
    // 0. Enforce unique bundle name
    const [nameInDraft, nameInMaster] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchItems<any>("/items/product_bundles_draft", {
        filter: JSON.stringify({
          bundle_name: { _eq: values.bundle_name.trim() },
        }),
        limit: 1,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchItems<any>("/items/products", {
        filter: JSON.stringify({
          product_name: { _eq: values.bundle_name.trim() },
        }),
        limit: 1,
      }),
    ]);

    if (nameInDraft.data?.length > 0 || nameInMaster.data?.length > 0) {
      throw new Error(
        "A bundle with this name already exists. Please choose a unique name.",
      );
    }

    // 1. Generate code and create draft
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
   * Updates an existing draft bundle and replaces its associated product items.
   * Only allows updating bundles in DRAFT status. Keeps original SKU intact.
   * @param id - Draft bundle ID
   * @param values - Validated form values
   * @returns The updated draft record
   */
  async updateDraft(id: number | string, values: BundleDraftFormValues) {
    // 1. Verify it exists and is in a mutable status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentDraft } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_bundles_draft/${id}`,
    );

    if (!currentDraft) {
      throw new Error("Draft bundle not found.");
    }

    if (
      currentDraft.draft_status !== "DRAFT" &&
      currentDraft.draft_status !== "REJECTED"
    ) {
      throw new Error(
        "Only bundles in DRAFT or REJECTED status can be edited.",
      );
    }

    // 2. Enforce unique bundle name (excluding self)
    const [nameInDraft, nameInMaster] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchItems<any>("/items/product_bundles_draft", {
        filter: JSON.stringify({
          _and: [
            { bundle_name: { _eq: values.bundle_name.trim() } },
            { id: { _neq: id } },
          ],
        }),
        limit: 1,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchItems<any>("/items/products", {
        filter: JSON.stringify({
          product_name: { _eq: values.bundle_name.trim() },
        }),
        limit: 1,
      }),
    ]);

    if (
      (nameInDraft.data && nameInDraft.data.length > 0) ||
      (nameInMaster.data && nameInMaster.data.length > 0)
    ) {
      throw new Error(
        "A bundle with this name already exists. Please choose a unique name.",
      );
    }

    // 3. Update the draft bundle record (preserving original bundle_sku)
    const { data: updatedDraft } = await request<{ data: BundleDraft }>(
      `${API_BASE_URL}/items/product_bundles_draft/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          bundle_name: values.bundle_name,
          bundle_type_id: values.bundle_type_id,
        }),
      },
    );

    // 4. Delete old associated bundle items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: oldItems } = await fetchItems<any>(
      "/items/product_bundle_items_draft",
      {
        filter: JSON.stringify({ bundle_draft_id: { _eq: id } }),
        limit: -1,
      },
    );

    if (oldItems && oldItems.length > 0) {
      await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldItems.map((item: any) =>
          request(
            `${API_BASE_URL}/items/product_bundle_items_draft/${item.id}`,
            {
              method: "DELETE",
            },
          ),
        ),
      );
    }

    // 5. Create the new associated bundle items
    if (values.items.length > 0) {
      await Promise.all(
        values.items.map((item: BundleItem) =>
          request(`${API_BASE_URL}/items/product_bundle_items_draft`, {
            method: "POST",
            body: JSON.stringify({
              bundle_draft_id: id,
              product_id: item.product_id,
              quantity: item.quantity,
            }),
          }),
        ),
      );
    }

    return updatedDraft;
  },

  /**
   * Deletes a draft bundle and its associated items.
   * @param id - Draft bundle ID
   */
  async deleteDraft(id: number | string) {
    // Delete associated bundle items first
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: items } = await fetchItems<any>(
        "/items/product_bundle_items_draft",
        {
          filter: JSON.stringify({ bundle_draft_id: { _eq: id } }),
          limit: -1,
        },
      );

      if (items?.length) {
        await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch (err: unknown) {
      console.error(
        `[Bundle] Failed to clean up items for draft ${id}:`,
        err instanceof Error ? err.message : String(err),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: draft } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_bundles_draft/${id}?fields=*.*`,
    );

    if (!draft) throw new Error("Draft bundle not found");

    // 1.5. Validate all component SKUs are still active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: draftItems } = await fetchItems<any>(
      "/items/product_bundle_items_draft",
      {
        filter: JSON.stringify({ bundle_draft_id: { _eq: id } }),
        fields:
          "product_id.product_name,product_id.isActive,product_id.product_code",
      },
    );

    const inactiveItems = draftItems?.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => item.product_id?.isActive === 0,
    );
    if (inactiveItems?.length) {
      const names = inactiveItems
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (i: any) => i.product_id?.product_name || i.product_id?.product_code,
        )
        .join(", ");
      throw new Error(
        `Cannot approve bundle. The following component SKUs are inactive: ${names}`,
      );
    }

    // Fetch first valid unit_id for the required FK field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: validUnits } = await fetchItems<any>("/items/units", {
      limit: 1,
      fields: "unit_id",
    });
    const defaultUnitId = validUnits?.[0]?.unit_id ?? 1;

    // Create master record in products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: masterBundle } = await request<{ data: any }>(
      `${API_BASE_URL}/items/products`,
      {
        method: "POST",
        body: JSON.stringify({
          product_code: draft.bundle_sku,
          product_name: draft.bundle_name,
          bundle_type_id:
            typeof draft.bundle_type_id === "object"
              ? draft.bundle_type_id?.id
              : draft.bundle_type_id,
          item_type: "bundle",
          status: "Approved",
          isActive: 1,
          unit_of_measurement: defaultUnitId,
        }),
      },
    );

    const masterId = masterBundle.product_id;

    // Get draft items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      body: JSON.stringify({
        draft_status: "REJECTED",
        updated_at: new Date().toISOString(),
      }),
    });
    return true;
  },

  /**
   * Fetches a single draft bundle with its items populated.
   * @param id - Draft bundle ID
   * @returns The draft with items
   */
  async fetchDraftById(id: number | string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: draft } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_bundles_draft/${id}?fields=*.*`,
    );

    // Fetch associated items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bundle } = await request<{ data: any }>(
      `${API_BASE_URL}/items/products/${id}?fields=*.*`,
    );

    const normalizedBundle = bundle
      ? {
          ...bundle,
          id: bundle.product_id,
          bundle_sku: bundle.product_code,
          bundle_name: bundle.product_name,
          status: "APPROVED",
        }
      : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await fetchItems<any>(
      "/items/product_bundle_items",
      {
        filter: JSON.stringify({ bundle_id: { _eq: id } }),
        limit: -1,
        fields: "*.*",
      },
    );

    return {
      ...normalizedBundle,
      items: items || [],
    };
  },
};
