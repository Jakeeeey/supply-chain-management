import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { API_BASE_URL, fetchItems, request } from "./sku-api";
import { generateSKUCode } from "./sku-generator";
import { skuQueryService } from "./sku-query";

/**
 * Draft write operations: create, update, submit for approval, reject, and delete.
 * All multi-step workflows (e.g.SKU code generation, supplier junction sync,
 * parent→child cascade) are preserved exactly as they were in sku.ts.
 */
export const skuLifecycleService = {
  async createDraft(sku: SKU): Promise<SKU> {
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

    const masterData = await skuQueryService.fetchMasterData();
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

    const createPayload = (
      u: { unit_id: number; conversion_factor: number; price?: number | null; cost?: number | null; barcode?: string | null },
      code: string,
      pId: number | string | null = null,
    ) => ({
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

    const { data: parent } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft`,
      {
        method: "POST",
        body: JSON.stringify(createPayload(units[0], codes[0])),
      },
    );
    const pId = parent.id || parent.product_id;

    // Save supplier to product_draft_per_supplier junction table
    const sId = sku.product_supplier;
    if (pId && sId) {
      try {
        await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
          method: "POST",
          body: JSON.stringify({ product_draft_id: pId, supplier_id: sId }),
        });
      } catch (err: unknown) {
        console.error(
          `[SKU Lifecycle] Failed to save supplier for draft ${pId}:`,
          err instanceof Error ? err.message : err,
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

  async updateDraft(id: number | string, sku: Partial<SKU>): Promise<SKU> {
    const { data } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${id}`,
      { method: "PATCH", body: JSON.stringify(sku) },
    );

    // Sync supplier in product_draft_per_supplier
    const sId = sku.product_supplier;
    if (sId) {
      try {
        const { data: existing } = await fetchItems<{ id: number; supplier_id: number }>(
          "/items/product_draft_per_supplier",
          {
            filter: JSON.stringify({ product_draft_id: { _eq: id } }),
            limit: 1,
          },
        );

        if (existing?.length) {
          await request(
            `${API_BASE_URL}/items/product_draft_per_supplier/${existing[0].id}`,
            { method: "PATCH", body: JSON.stringify({ supplier_id: sId }) },
          );
        } else {
          await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
            method: "POST",
            body: JSON.stringify({ product_draft_id: id, supplier_id: sId }),
          });
        }
      } catch (err: unknown) {
        console.error(
          `[SKU Lifecycle] Failed to sync supplier for draft ${id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Cascade shared fields to child SKUs (variants) when a parent is updated
    if (!data.parent_id) {
      const { data: children } = await fetchItems<SKU>("/items/product_draft", {
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
        const masterData = await skuQueryService.fetchMasterData();
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

  async submitForApproval(id: number | string): Promise<boolean> {
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "FOR_APPROVAL" }),
    });
    return true;
  },

  async rejectDraft(id: number | string, remarks?: string): Promise<boolean> {
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "REJECTED", remarks }),
    });
    return true;
  },

  async deleteDraft(id: number | string): Promise<boolean> {
    // 1. Clean up supplier junction records for this draft first
    try {
      const { data: existing } = await fetchItems<{ id: number }>(
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
              { method: "DELETE" },
            ),
          ),
        );
      }
    } catch (err: unknown) {
      console.error(
        `[SKU Lifecycle] Cleanup failed for draft ${id}: ${err instanceof Error ? err.message : err}`,
      );
    }

    // 2. Delete the draft itself
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "DELETE",
    });
    return true;
  },

  async uploadImage(
    formData: FormData,
    folderName?: string,
  ): Promise<{ id: string }> {
    if (folderName) formData.append("folder_name", folderName);

    const res = await fetch("/api/scm/product-management/sku/upload", {
      method: "POST",
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Upload failed");
    return result.data;
  },
};
