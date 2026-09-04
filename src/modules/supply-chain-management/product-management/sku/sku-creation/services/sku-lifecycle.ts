import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { API_BASE_URL, fetchItems, request } from "./sku-api";
import { generateSKUCode, generateBarcode } from "./sku-generator";
import { skuQueryService } from "./sku-query";
import { getLiteralPHTTime } from "@/modules/supply-chain-management/product-management/utils/timezone";

/**
 * Draft write operations: create, update, submit for approval, reject, and delete.
 * All multi-step workflows (e.g.SKU code generation, supplier junction sync,
 * parent→child cascade) are preserved exactly as they were in sku.ts.
 */
export const skuLifecycleService = {
  async submitMasterEdit(id: number | string, editedFields: Partial<SKU>): Promise<SKU> {
    const { units = [], ...baseData } = editedFields;
    const nowPHT = getLiteralPHTTime();

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

    // Helper to extract raw ID from relational fields
    const getRawId = (val: unknown): number | null => {
      if (!val) return null;
      if (typeof val === "object" && val !== null) {
        return (val as { id?: number }).id ?? null;
      }
      const num = parseInt(String(val));
      return isNaN(num) ? null : num;
    };

    // Sanitize any relational fields to prevent validation errors on insert
    const relationalKeys = [
      "product_brand",
      "product_category",
      "product_class",
      "product_segment",
      "product_section",
      "product_supplier",
      "unit_of_measurement",
    ];
    relationalKeys.forEach((key) => {
      if (baseFields[key] !== undefined) {
        baseFields[key] = getRawId(baseFields[key]) as unknown;
      }
    });

    // 3. Resolve codes for the units
    const masterData = await skuQueryService.fetchMasterData();
    let parentSequence: string | undefined = undefined;
    const codes: string[] = [];

    for (const u of units) {
      if (u.sku_code?.trim()) {
        codes.push(u.sku_code.trim());
      } else {
        const result = await generateSKUCode(
          {
            ...baseFields,
            ...baseData,
            id: Number(id),
            product_id: Number(id),
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
    }

    const parentUnitName = units.length > 0
      ? (masterData.units.find((u) => Number(u.id) === Number(units[0].unit_id))?.name || null)
      : null;

    // 4. Merge parent unit fields
    const parentPayload = {
      ...baseFields,
      ...baseData,
      status: "FOR_APPROVAL" as const,
      remarks: `MASTER_EDIT:${id}`,
      date_added: nowPHT,
      created_at: nowPHT,
      last_updated: nowPHT,
    } as Record<string, unknown>;

    if (units.length > 0) {
      const u = units[0];
      parentPayload.unit_of_measurement = u.unit_id;
      parentPayload.unit_of_measurement_count = u.conversion_factor;
      parentPayload.price_per_unit = u.price;
      parentPayload.cost_per_unit = u.cost;
      parentPayload.barcode = u.barcode?.trim() ? u.barcode.trim() : generateBarcode();
      parentPayload.product_code = codes[0];
      if (parentUnitName) {
        parentPayload.base_unit = parentUnitName;
      }
    }

    // 5. Create or update the parent draft record
    const { data: existingDrafts } = await fetchItems<SKU>("/items/product_draft", {
      filter: JSON.stringify({
        _and: [
          { product_code: { _eq: codes[0] } },
          { parent_id: { _null: true } }
        ]
      }),
      limit: 1,
    });

    let draft: SKU;
    if (existingDrafts && existingDrafts.length > 0) {
      const existingId = existingDrafts[0].id || existingDrafts[0].product_id;
      const { data: updated } = await request<{ data: SKU }>(
        `${API_BASE_URL}/items/product_draft/${existingId}`,
        {
          method: "PATCH",
          body: JSON.stringify(parentPayload),
        }
      );
      draft = updated;
      console.log(`[SKU Lifecycle] Overwrote existing parent draft ID: ${existingId}`);
    } else {
      const { data: created } = await request<{ data: SKU }>(
        `${API_BASE_URL}/items/product_draft`,
        {
          method: "POST",
          body: JSON.stringify(parentPayload),
        }
      );
      draft = created;
      console.log(`[SKU Lifecycle] Created new parent draft ID: ${draft.id || draft.product_id}`);
    }

    const draftId = draft.id || draft.product_id;

    // 6. Sync supplier in product_draft_per_supplier
    const supplierId = getRawId(editedFields.product_supplier ?? master.product_supplier);
    if (draftId && supplierId) {
      try {
        const { data: existingLink } = await fetchItems<Record<string, unknown>>(
          "/items/product_draft_per_supplier",
          {
            filter: JSON.stringify({
              _and: [
                { product_draft_id: { _eq: draftId } },
                { supplier_id: { _eq: supplierId } },
              ],
            }),
            limit: 1,
          },
        );

        if (!existingLink || existingLink.length === 0) {
          await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
            method: "POST",
            body: JSON.stringify({ product_draft_id: draftId, supplier_id: supplierId }),
          });
        }
      } catch (err: unknown) {
        console.error(
          `[SKU Lifecycle] Failed to save supplier for master edit draft ${draftId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Delete any existing child drafts that are not present in the new edit submission
    if (existingDrafts && existingDrafts.length > 0) {
      try {
        const { data: existingDraftChildren } = await fetchItems<SKU>("/items/product_draft", {
          filter: JSON.stringify({ parent_id: { _eq: draftId } }),
          limit: -1,
        });

        if (existingDraftChildren && existingDraftChildren.length > 0) {
          const newUnitCodes = codes.slice(1);

          for (const childDraft of existingDraftChildren) {
            const childDraftId = childDraft.id || childDraft.product_id;
            if (childDraftId && childDraft.product_code && !newUnitCodes.includes(childDraft.product_code)) {
              await skuLifecycleService.deleteDraft(childDraftId);
              console.log(`[SKU Lifecycle] Cleaned up removed variant draft ID: ${childDraftId}`);
            }
          }
        }
      } catch (cleanupErr) {
        console.error("[SKU Lifecycle] Failed to clean up removed child variant drafts:", cleanupErr);
      }
    }

    // 7. Create child draft records for remaining units
    const childUnits = units.slice(1);
    const sharedFields = {
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
      status: draft.status,
      base_unit: draft.base_unit || parentUnitName,
    };

    if (draftId) {
      await Promise.all(
        childUnits.map(async (u, idx) => {
          const childCode = codes[idx + 1];
          const childMasterId = u.id;
          const remarks = childMasterId ? `MASTER_EDIT:${childMasterId}` : `NEW_CHILD_OF_LIVE:${id}`;

          const childDraftPayload = {
            ...sharedFields,
            parent_id: draftId,
            unit_of_measurement: u.unit_id,
            unit_of_measurement_count: u.conversion_factor,
            price_per_unit: u.price,
            cost_per_unit: u.cost,
            barcode: u.barcode?.trim() ? u.barcode.trim() : generateBarcode(),
            product_code: childCode,
            remarks,
            date_added: nowPHT,
            created_at: nowPHT,
            last_updated: nowPHT,
          };

          // Check if child draft already exists
          let childDraftId: number | string | undefined = undefined;
          const { data: existingChildren } = await fetchItems<SKU>("/items/product_draft", {
            filter: JSON.stringify({
              _and: [
                { product_code: { _eq: childCode } },
                { parent_id: { _eq: draftId } }
              ]
            }),
            limit: 1,
          });
          if (existingChildren && existingChildren.length > 0) {
            childDraftId = existingChildren[0].id || existingChildren[0].product_id;
          }

          let childDraft: SKU;
          if (childDraftId) {
            const { data: updatedChild } = await request<{ data: SKU }>(
              `${API_BASE_URL}/items/product_draft/${childDraftId}`,
              {
                method: "PATCH",
                body: JSON.stringify(childDraftPayload),
              }
            );
            childDraft = updatedChild;
            console.log(`[SKU Lifecycle] Overwrote existing child draft ID: ${childDraftId}`);
          } else {
            const { data: createdChild } = await request<{ data: SKU }>(
              `${API_BASE_URL}/items/product_draft`,
              {
                method: "POST",
                body: JSON.stringify(childDraftPayload),
              }
            );
            childDraft = createdChild;
            console.log(`[SKU Lifecycle] Created new child draft ID: ${childDraft.id || childDraft.product_id}`);
          }

          // Sync supplier for child draft
          const resolvedChildDraftId = childDraft.id || childDraft.product_id;
          if (resolvedChildDraftId && supplierId) {
            try {
              const { data: existingLink } = await fetchItems<Record<string, unknown>>(
                "/items/product_draft_per_supplier",
                {
                  filter: JSON.stringify({
                    _and: [
                      { product_draft_id: { _eq: resolvedChildDraftId } },
                      { supplier_id: { _eq: supplierId } },
                    ],
                  }),
                  limit: 1,
                },
              );

              if (!existingLink || existingLink.length === 0) {
                await request(`${API_BASE_URL}/items/product_draft_per_supplier`, {
                  method: "POST",
                  body: JSON.stringify({ product_draft_id: resolvedChildDraftId, supplier_id: supplierId }),
                });
              }
            } catch (e) {
              console.error(`[SKU Lifecycle] Failed to save child supplier for draft ${resolvedChildDraftId}:`, e);
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
    const isManual = units.some((u) => u.sku_code?.trim());

    if (isManual) {
      for (const u of units) {
        codes.push(u.sku_code?.trim() || "");
      }
    } else {
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
      barcode: u.barcode?.trim() ? u.barcode.trim() : generateBarcode(),
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
    const isManual = units.some((u) => u.sku_code?.trim());
    
    if (isManual) {
      for (const u of units) {
        codes.push(u.sku_code?.trim() || "");
      }
    } else {
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
      parentPayload.barcode = u.barcode?.trim() ? u.barcode.trim() : generateBarcode();
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
          await skuLifecycleService.deleteDraft(childId);
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
          barcode: u.barcode?.trim() ? u.barcode.trim() : generateBarcode(),
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
    // 1. Fetch child drafts that point to this parent
    try {
      const { data: children } = await fetchItems<{ id: number; product_id: number }>("/items/product_draft", {
        filter: JSON.stringify({ parent_id: { _eq: id } }),
        limit: -1,
      });
      if (children?.length) {
        await Promise.all(
          children.map(async (child) => {
            const childId = child.id || child.product_id;
            if (childId) {
              await skuLifecycleService.deleteDraft(childId);
            }
          }),
        );
      }
    } catch (err: unknown) {
      console.error(
        `[SKU Lifecycle] Child drafts cleanup failed for parent ${id}:`,
        err instanceof Error ? err.message : err,
      );
    }

    // 2. Clean up supplier junction records for this draft first
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

    // 3. Delete the draft itself
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
