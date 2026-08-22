import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { API_BASE_URL, fetchItems, request } from "./sku-api";
import { generateSKUCode } from "./sku-generator";
import { skuQueryService } from "./sku-query";
import { getLiteralPHTTime } from "@/modules/supply-chain-management/product-management/utils/timezone";

/**
 * Draft write operations: create, update, submit for approval, reject, and delete.
 * All multi-step workflows (e.g.SKU code generation, supplier junction sync,
 * parent→child cascade) are preserved exactly as they were in sku.ts.
 */
export const skuLifecycleService = {
  async submitMasterEdit(id: number | string, editedFields: Partial<SKU>): Promise<SKU> {
    // 1. Fetch the current master product to get all existing fields
    const { data: master } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/products/${id}?fields=*`,
    );
    if (!master) throw new Error("Master product not found");

    // 2. Strip metadata fields that shouldn't be copied to draft
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      product_id: _pid,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      created_at, updated_at, user_created, user_updated,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      date_created, date_updated,
      ...baseFields
    } = master as SKU & Record<string, unknown>;

    // 3. Merge with edited fields and tag as a masterlist edit
    const nowPHT = getLiteralPHTTime();
    const draftPayload = {
      ...baseFields,
      ...editedFields,
      status: "FOR_APPROVAL" as const,
      remarks: `MASTER_EDIT:${id}`,
      date_added: nowPHT,
      created_at: nowPHT,
      last_updated: nowPHT,
    };

    // 4. Create the parent draft record
    const { data: draft } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft`,
      { method: "POST", body: JSON.stringify(draftPayload) },
    );

    // 5. Sync supplier into product_draft_per_supplier junction
    const supplierId = editedFields.product_supplier ?? master.product_supplier;
    const draftId = draft.id || draft.product_id;
    if (draftId && supplierId) {
      try {
        await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
          method: "POST",
          body: JSON.stringify({ product_draft_id: draftId, supplier_id: supplierId }),
        });
      } catch (err: unknown) {
        console.error(
          `[SKU Lifecycle] Failed to save supplier for master edit draft ${draftId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // 6. Cascade shared fields to child SKUs in products table
    const { data: children } = await fetchItems<SKU>("/items/products", {
      filter: JSON.stringify({ parent_id: { _eq: id } }),
      fields: "*",
      limit: -1,
    });

    if (children?.length && draftId) {
      // Shared fields that cascade from parent to children
      const sharedFields: Partial<SKU> = {
        product_name: draft.product_name,
        product_brand: draft.product_brand,
        product_category: draft.product_category,
        product_class: draft.product_class,
        product_segment: draft.product_segment,
        product_section: draft.product_section,
        product_supplier: draft.product_supplier,
        description: draft.description,
        short_description: draft.short_description,
        isActive: draft.isActive,
        inventory_type: draft.inventory_type,
        flavor: draft.flavor,
        size: draft.size,
        color: draft.color,
      };

      await Promise.all(
        children.map(async (child) => {
          const childMasterId = child.id || child.product_id;

          // Strip metadata from child
          const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            id: _cId,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            product_id: _cPid,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            created_at: _cCa, updated_at: _cUa, user_created: _cUc, user_updated: _cUu,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            date_created: _cDc, date_updated: _cDu,
            ...childBaseFields
          } = child as SKU & Record<string, unknown>;

          const childDraftPayload = {
            ...childBaseFields,
            ...sharedFields,
            parent_id: draftId,
            status: "FOR_APPROVAL" as const,
            remarks: `MASTER_EDIT:${childMasterId}`,
            date_added: nowPHT,
            created_at: nowPHT,
            last_updated: nowPHT,
          };

          const { data: childDraft } = await request<{ data: SKU }>(
            `${API_BASE_URL}/items/product_draft`,
            { method: "POST", body: JSON.stringify(childDraftPayload) },
          );

          // Sync supplier for child draft
          const childDraftId = childDraft.id || childDraft.product_id;
          if (childDraftId && supplierId) {
            try {
              await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
                method: "POST",
                body: JSON.stringify({ product_draft_id: childDraftId, supplier_id: supplierId }),
              });
            } catch (e) {
              console.error(`[SKU Lifecycle] Failed to save child supplier for draft ${childDraftId}:`, e);
            }
          }
        }),
      );
    }

    return draft;
  },

  async createDraft(sku: SKU): Promise<SKU> {
    const { units: rawUnits = [], ...baseData } = sku;
    const nowPHT = getLiteralPHTTime();
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
    const parentUnitName = masterData.units.find(
      (u) => u.id === units[0].unit_id
    )?.name || null;
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
      date_added: nowPHT,
      created_at: nowPHT,
      last_updated: nowPHT,
      base_unit: parentUnitName,
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
        units.slice(1).map(async (u, i) => {
          const { data: child } = await request<{ data: SKU }>(`${API_BASE_URL}/items/product_draft`, {
            method: "POST",
            body: JSON.stringify(createPayload(u, codes[i + 1], pId)),
          });

          const childId = child.id || child.product_id;
          if (childId && sId) {
            try {
              await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
                method: "POST",
                body: JSON.stringify({ product_draft_id: childId, supplier_id: sId }),
              });
            } catch (err: unknown) {
              console.error(
                `[SKU Lifecycle] Failed to save supplier for child draft ${childId}:`,
                err instanceof Error ? err.message : err,
              );
            }
          }
        }),
      );
    }
    return parent;
  },

  async updateDraft(id: number | string, sku: Partial<SKU>): Promise<SKU> {
    const { units = [], ...baseData } = sku;
    const nowPHT = getLiteralPHTTime();
    
    // 1. Fetch master data and prepare parent payload
    const masterData = await skuQueryService.fetchMasterData();
    const parentPayload = { ...baseData, last_updated: nowPHT } as Record<string, unknown>;
    
    let parentSequence: string | undefined = undefined;
    const codes: string[] = [];
    
    // Generate codes for all units
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
    
    const parentUnitName = units.length > 0
      ? (masterData.units.find((u) => u.id === units[0].unit_id)?.name || null)
      : null;

    if (units.length > 0) {
      const u = units[0];
      parentPayload.unit_of_measurement = u.unit_id;
      parentPayload.unit_of_measurement_count = u.conversion_factor;
      parentPayload.price_per_unit = u.price;
      parentPayload.cost_per_unit = u.cost;
      parentPayload.barcode = u.barcode;
      parentPayload.product_code = codes[0];
      if (parentUnitName) {
        parentPayload.base_unit = parentUnitName;
      }
    }
    
    // 2. Update parent draft
    const { data: parent } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${id}`,
      { method: "PATCH", body: JSON.stringify(parentPayload) },
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

    // 3. Fetch existing child drafts
    const { data: existingChildren } = await fetchItems<SKU>("/items/product_draft", {
      filter: JSON.stringify({ parent_id: { _eq: id } }),
      limit: -1,
    });
    
    const currentChildren = existingChildren || [];
    const childUnits = units.slice(1);
    
    // Determine which child drafts to delete
    const childUnitsIds = childUnits.map((u) => u.id).filter(Boolean);
    const toDelete = currentChildren.filter(
      (child) => !childUnitsIds.includes(child.id || child.product_id),
    );
    
    // Perform deletions
    await Promise.all(
      toDelete.map(async (child) => {
        const childId = child.id || child.product_id;
        if (childId) {
          await request(`${API_BASE_URL}/items/product_draft/${childId}`, {
            method: "DELETE",
          });
        }
      }),
    );
    
    // Create or update child units
    const sharedFields = {
      product_name: parent.product_name,
      product_brand: parent.product_brand,
      product_category: parent.product_category,
      product_class: parent.product_class,
      product_segment: parent.product_segment,
      product_section: parent.product_section,
      product_supplier: parent.product_supplier,
      description: parent.description,
      short_description: parent.short_description,
      isActive: parent.isActive,
      inventory_type: parent.inventory_type,
      flavor: parent.flavor,
      size: parent.size,
      color: parent.color,
      status: parent.status,
      base_unit: parent.base_unit || parentUnitName,
    };
    
    await Promise.all(
      childUnits.map(async (u, idx) => {
        const childCode = codes[idx + 1];
        const childId = u.id;
        
        const childPayload = {
          ...sharedFields,
          parent_id: id,
          unit_of_measurement: u.unit_id,
          unit_of_measurement_count: u.conversion_factor,
          price_per_unit: u.price,
          cost_per_unit: u.cost,
          barcode: u.barcode,
          product_code: childCode,
          last_updated: nowPHT,
        };
        
        if (childId) {
          // Update existing child draft
          await request(`${API_BASE_URL}/items/product_draft/${childId}`, {
            method: "PATCH",
            body: JSON.stringify(childPayload),
          });
          
          // Sync supplier for child draft
          if (sId) {
            try {
              const { data: existing } = await fetchItems<{ id: number; supplier_id: number }>(
                "/items/product_draft_per_supplier",
                {
                  filter: JSON.stringify({ product_draft_id: { _eq: childId } }),
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
                  body: JSON.stringify({ product_draft_id: childId, supplier_id: sId }),
                });
              }
            } catch (e) {
              console.error(`[SKU Lifecycle] Failed to sync child supplier:`, e);
            }
          }
        } else {
          // Create new child draft
          const { data: newChild } = await request<{ data: SKU }>(
            `${API_BASE_URL}/items/product_draft`,
            {
              method: "POST",
              body: JSON.stringify({
                ...childPayload,
                date_added: nowPHT,
                created_at: nowPHT,
              }),
            },
          );
          
          const newChildId = newChild.id || newChild.product_id;
          if (newChildId && sId) {
            try {
              await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
                method: "POST",
                body: JSON.stringify({ product_draft_id: newChildId, supplier_id: sId }),
              });
            } catch (e) {
              console.error(`[SKU Lifecycle] Failed to save child supplier:`, e);
            }
          }
        }
      }),
    );
    
    return parent;
  },

  async submitForApproval(id: number | string): Promise<boolean> {
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "FOR_APPROVAL" }),
    });
    return true;
  },

  async rejectDraft(
    id: number | string,
    remarks?: string,
    rejectedBy?: string | number,
    rejectedAt?: string,
  ): Promise<boolean> {
    const payload = {
      status: "REJECTED",
      remarks,
      rejected_by: rejectedBy,
      rejected_at: rejectedAt,
    };
    
    await request(`${API_BASE_URL}/items/product_draft/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
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
