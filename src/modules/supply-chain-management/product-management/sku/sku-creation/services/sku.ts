import {
  SKU,
  MasterData,
  PaginatedSKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { fetchItems, request, API_BASE_URL } from "./sku-api";
import { generateSKUCode } from "./sku-generator";
import { normalizeMasterData, prepareSKUPayload } from "../utils/sku-mapper";
import { CellHelpers } from "../utils/sku-helpers";

export const skuService = {
  async fetchApproved(
    limit: number = 10,
    offset: number = 0,
    search?: string,
    sort?: string,
  ): Promise<PaginatedSKU> {
    const filter: any = {};
    const searchFilter = CellHelpers.buildSearchFilter(search);
    if (searchFilter) {
      filter._and = [searchFilter];
    }

    const { data, meta } = await fetchItems<SKU>("/items/products", {
      limit,
      offset,
      fields: "*.*",
      meta: "filter_count",
      sort: sort || "-created_at,-product_id",
      filter:
        Object.keys(filter).length > 0 ? JSON.stringify(filter) : undefined,
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
    const filter: any = { _and: [] };

    // Always exclude ACTIVE status (these are approved and should not show in queue)
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
      fields: "*.*",
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
    const fetchResilient = async (names: string[]) => {
      for (const name of names) {
        try {
          const res = await fetchItems<any>(`/items/${name}`, { limit: -1 });
          if (res.data?.length) return res;
        } catch (e) {
          console.warn(`Fetch failed for ${name}:`, e);
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

  async createDraft(sku: SKU) {
    const { units: rawUnits = [], ...baseData } = sku;
    const units =
      rawUnits.length > 0
        ? rawUnits
        : [
            {
              unit_id: sku.unit_of_measurement || 1,
              conversion_factor: sku.unit_of_measurement_count || 1,
              price: sku.price_per_unit,
              cost: sku.cost_per_unit,
              barcode: sku.barcode,
            },
          ];

    const masterData = await this.fetchMasterData();
    const codes = await Promise.all(
      units.map((u) =>
        generateSKUCode(
          {
            ...baseData,
            unit_of_measurement: u.unit_id,
            unit_of_measurement_count: u.conversion_factor,
          } as SKU,
          masterData,
        ),
      ),
    );

    const createPayload = (u: any, code: string, pId: any = null) => ({
      ...baseData,
      status: "DRAFT",
      isActive: 1,
      parent_id: pId,
      unit_of_measurement: u.unit_id,
      unit_of_measurement_count: u.conversion_factor,
      price_per_unit: u.price,
      cost_per_unit: u.cost,
      barcode: u.barcode,
      product_code: code,
    });

    const { data: parent } = await request<{ data: any }>(
      `${API_BASE_URL}/items/product_draft`,
      {
        method: "POST",
        body: JSON.stringify(createPayload(units[0], codes[0])),
      },
    );
    const pId = parent.id || parent.product_id;

    // Save supplier to product_draft_per_supplier junction table
    const sId = (sku as any).product_supplier || (sku as any).supplier_id;
    if (pId && sId) {
      try {
        await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
          method: "POST",
          body: JSON.stringify({
            product_draft_id: pId,
            supplier_id: sId,
          }),
        });
        console.log(`[Supplier Draft] Saved Supplier ${sId} for Draft ${pId}`);
      } catch (err: any) {
        console.error(
          `[Supplier Draft] Failed to save supplier for draft:`,
          err.message,
        );
      }
    }

    if (units.length > 1) {
      await Promise.all(
        units.slice(1).map((u, i) =>
          request(`${API_BASE_URL}/items/product_draft`, {
            method: "POST",
            body: JSON.stringify(createPayload(u, codes[i + 1], pId)),
          }),
        ),
      );
    }
    return parent;
  },

  async updateDraft(id: number | string, sku: Partial<SKU>) {
    const { data } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${id}`,
      { method: "PATCH", body: JSON.stringify(sku) },
    );

    // Sync supplier in product_draft_per_supplier
    const sId = (sku as any).product_supplier || (sku as any).supplier_id;
    if (sId) {
      try {
        // Find existing record
        const { data: existing } = await fetchItems<any>(
          "/items/product_draft_per_supplier",
          {
            filter: JSON.stringify({ product_draft_id: { _eq: id } }),
            limit: 1,
          },
        );

        if (existing?.length) {
          // Update
          await request(
            `${API_BASE_URL}/items/product_draft_per_supplier/${existing[0].id}`,
            {
              method: "PATCH",
              body: JSON.stringify({ supplier_id: sId }),
            },
          );
        } else {
          // Create
          await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
            method: "POST",
            body: JSON.stringify({ product_draft_id: id, supplier_id: sId }),
          });
        }
      } catch (err: any) {
        console.error(
          `[Supplier Sync] Failed to sync supplier for draft ${id}:`,
          err.message,
        );
      }
    }

    if (!data.parent_id) {
      const { data: children } = await fetchItems<any>("/items/product_draft", {
        filter: JSON.stringify({ parent_id: { _eq: id } }),
        limit: -1,
      });

      if (children?.length) {
        const fields = {
          product_name: data.product_name,
          product_brand: data.product_brand,
          product_category: data.product_category,
          product_supplier: data.product_supplier,
          isActive: data.isActive,
          inventory_type: data.inventory_type,
          flavor: data.flavor,
          size: data.size,
          color: data.color,
          status: data.status,
        };
        const masterData = await this.fetchMasterData();
        await Promise.all(
          children.map(async (child) => {
            const code = await generateSKUCode(
              {
                ...fields,
                unit_of_measurement: child.unit_of_measurement,
                unit_of_measurement_count: child.unit_of_measurement_count,
              } as SKU,
              masterData,
            );
            return request(`${API_BASE_URL}/items/product_draft/${child.id}`, {
              method: "PATCH",
              body: JSON.stringify({ ...fields, product_code: code }),
            });
          }),
        );
      }
    }
    return data;
  },

  async approveDraft(id: number | string, masterData: MasterData) {
    // 1. Fetch only the specific draft
    const { data: draft } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${id}?fields=*.*`,
    );

    if (!draft) throw new Error("Draft record not found");

    let pMasterId: number | null = null;

    // 2. If it's a child, find the specific master record using the Parent's Product Code
    if (draft.parent_id) {
      // Handle both expanded object and plain ID cases
      let parentCode = (draft.parent_id as any)?.product_code;

      if (!parentCode) {
        const parentId =
          typeof draft.parent_id === "object"
            ? (draft.parent_id as any).id
            : draft.parent_id;

        const { data: pDraft } = await request<{ data: any }>(
          `${API_BASE_URL}/items/product_draft/${parentId}`,
        );
        parentCode = pDraft?.product_code;
      }

      if (parentCode) {
        const { data: realParent } = await fetchItems<any>("/items/products", {
          filter: JSON.stringify({ product_code: { _eq: parentCode } }),
          limit: 1,
        });

        if (realParent?.length) {
          pMasterId = realParent[0].id || realParent[0].product_id;
        }
      }
    }

    // 3. Generate or use existing code
    const code =
      draft.product_code || (await generateSKUCode(draft, masterData));

    // 4. Check if a master record for THIS specific code already exists (Upsert logic)
    const { data: existing } = await fetchItems<any>("/items/products", {
      filter: JSON.stringify({ product_code: { _eq: code } }),
      limit: 1,
    });

    const targetId = existing?.[0]?.id || existing?.[0]?.product_id;
    const payload = prepareSKUPayload(draft, pMasterId, code);
    let finalMasterId: number | string;

    if (targetId) {
      await request(`${API_BASE_URL}/items/products/${targetId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      finalMasterId = targetId;
      console.log(
        `[Supplier Link Debug] Updated existing product. finalMasterId: ${finalMasterId}`,
      );
    } else {
      const res: any = await request<{ data: any }>(
        `${API_BASE_URL}/items/products`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      finalMasterId = res.data.id || res.data.product_id;
      console.log(
        `[Supplier Link Debug] Created new product. finalMasterId: ${finalMasterId}, res.data:`,
        res.data,
      );
    }

    // 4.5. Link to Supplier (For Parent AND Child SKUs)
    // Resolve Supplier ID from the new draft junction table
    const draftId = draft.id || (draft as any).product_id;
    let sId: number | null = null;

    try {
      const { data: draftSupplierLink } = await fetchItems<any>(
        "/items/product_draft_per_supplier",
        {
          filter: JSON.stringify({ product_draft_id: { _eq: draftId } }),
          limit: 1,
        },
      );

      if (draftSupplierLink?.length) {
        sId = draftSupplierLink[0].supplier_id;
        console.log(
          `[Supplier Link Debug] Found Supplier ID ${sId} in product_draft_per_supplier for draft ${draftId}`,
        );
      } else {
        // Fallback to various possible field names or formats for backward compatibility
        const rawValue =
          (draft as any).product_supplier || (draft as any).supplier_id;
        if (rawValue) {
          if (typeof rawValue === "object") {
            sId = rawValue.id;
          } else {
            const num = parseInt(String(rawValue));
            sId = isNaN(num) || num === 0 ? null : num;
          }
        }
        console.warn(
          `[Supplier Link Debug] No record found in product_draft_per_supplier. Fell back to raw draft value:`,
          sId,
        );
      }
    } catch (err: any) {
      console.error(
        `[Supplier Link Debug] Error fetching from product_draft_per_supplier:`,
        err.message,
      );
    }

    // Resolve Master ID as a number
    const resolvedMasterId = (function () {
      if (!finalMasterId) return null;
      const num = parseInt(String(finalMasterId));
      return isNaN(num) ? null : num;
    })();

    console.log(
      `[Supplier Link Debug] Resolved sId: ${sId}, resolvedMasterId: ${resolvedMasterId}`,
    );

    if (sId && resolvedMasterId) {
      try {
        // Check if this specific link already exists to avoid duplicates
        const { data: existingLink } = await fetchItems<any>(
          "/items/product_per_supplier",
          {
            filter: JSON.stringify({
              _and: [
                { product_id: { _eq: resolvedMasterId } },
                { supplier_id: { _eq: sId } },
              ],
            }),
            limit: 1,
          },
        );

        if (!existingLink || existingLink.length === 0) {
          console.log(
            `[Supplier Link Debug] No existing link. Creating for Product ${resolvedMasterId} and Supplier ${sId}...`,
          );
          const linkRes = await request<any>(
            `${API_BASE_URL}/items/product_per_supplier`,
            {
              method: "POST",
              body: JSON.stringify({
                product_id: resolvedMasterId,
                supplier_id: sId,
                discount_type: null,
              }),
            },
          );
          console.log(`[Supplier Link Debug] POST Success. Result:`, linkRes);
        } else {
          console.log(
            `[Supplier Link Debug] Link already exists for Product ${resolvedMasterId} and Supplier ${sId}`,
          );
        }
      } catch (linkErr: any) {
        console.error("[Supplier Link Debug] Error:", linkErr.message);
      }
    } else {
      console.log(
        `[Supplier Link Debug] SKIPPING linkage: sId=${sId}, masterId=${resolvedMasterId}`,
      );
    }

    // 5. "Adoption Logic": If this was a Parent, look for existing orphans to adopt
    if (!draft.parent_id) {
      const toId = (val: any) =>
        val && typeof val === "object" ? val.id : val;

      const orphanConditions: any[] = [
        { product_name: { _eq: draft.product_name } },
        { parent_id: { _null: true } },
        { product_id: { _neq: finalMasterId } },
      ];

      // Match by code prefix if possible for higher precision
      const codeBase = code.substring(0, 10);
      if (codeBase && codeBase.length >= 5) {
        orphanConditions.push({ product_code: { _starts_with: codeBase } });
      }

      const { data: orphans } = await fetchItems<any>("/items/products", {
        filter: JSON.stringify({ _and: orphanConditions }),
        limit: -1,
      });

      if (orphans?.length) {
        console.log(
          `Parent ${finalMasterId} adopting ${orphans.length} orphans...`,
        );
        await Promise.all(
          orphans.map((orphan) => {
            const oId = orphan.id || orphan.product_id;
            return request(`${API_BASE_URL}/items/products/${oId}`, {
              method: "PATCH",
              body: JSON.stringify({ parent_id: finalMasterId }),
            });
          }),
        );
      }
    }

    // 6. Cleanup only THIS draft
    await this.cleanupDraft(draft);
    return true;
  },

  /**
   * Helper to mark draft as active or delete it after approval
   */
  async cleanupDraft(draft: any) {
    const dId = draft.id || draft.product_id;
    try {
      await request(`${API_BASE_URL}/items/product_draft/${dId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
    } catch (e: any) {
      try {
        await request(`${API_BASE_URL}/items/product_draft/${dId}`, {
          method: "DELETE",
        });
      } catch (delErr: any) {}
    }
  },

  async submitForApproval(id: number | string) {
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "FOR_APPROVAL" }),
    });
    return true;
  },
  async rejectDraft(id: number | string, remarks?: string) {
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "REJECTED", remarks }),
    });
    return true;
  },
  async deleteDraft(id: number | string) {
    // 1. Clean up supplier junction records for this draft
    try {
      const { data: existing } = await fetchItems<any>(
        "/items/product_draft_per_supplier",
        {
          filter: JSON.stringify({ product_draft_id: { _eq: id } }),
          limit: -1,
        },
      );
      if (existing?.length) {
        await Promise.all(
          existing.map((record) =>
            request(
              `${API_BASE_URL}/items/product_draft_per_supplier/${record.id}`,
              {
                method: "DELETE",
              },
            ),
          ),
        );
      }
    } catch (err: any) {
      console.error(
        `[Cleanup] Failed to clean up supplier junction for draft ${id}: ${err.message}`,
      );
    }

    // 2. Delete the draft itself
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "DELETE",
    });
    return true;
  },
  async checkDuplicateName(name: string): Promise<boolean> {
    const filter = `filter[product_name][_eq]=${encodeURIComponent(name)}&limit=1`;
    const [approved, drafts] = await Promise.all([
      request<{ data: any[] }>(`${API_BASE_URL}/items/products?${filter}`),
      request<{ data: any[] }>(`${API_BASE_URL}/items/product_draft?${filter}`),
    ]);
    return approved.data?.length > 0 || drafts.data?.length > 0;
  },
  async updateProductStatus(id: number | string, isActive: boolean) {
    const val = isActive ? 1 : 0;
    const status = isActive ? "ACTIVE" : "INACTIVE";

    console.log(`Updating Product ${id}: isActive=${val}, status=${status}`);

    return request(`${API_BASE_URL}/items/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: val,
        status: status,
      }),
    });
  },
  async bulkUpdateProductStatus(ids: (number | string)[], isActive: boolean) {
    const url = `${API_BASE_URL}/items/products`;
    const val = isActive ? 1 : 0;
    const status = isActive ? "ACTIVE" : "INACTIVE";

    // Directus uses 'keys' for bulk updates on a collection
    const payload = {
      keys: ids,
      data: {
        isActive: val,
        status: status,
      },
    };

    console.log(
      `Directus Bulk Update [PATCH] ${url}:`,
      JSON.stringify(payload),
    );

    return request(url, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  generateSKUCode,
};
