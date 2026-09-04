import {
  MasterData,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { prepareSKUPayload } from "../utils/sku-mapper";
import { API_BASE_URL, fetchItems, request } from "./sku-api";
import { generateSKUCode } from "./sku-generator";
import { getDatabaseTimeISO } from "@/modules/supply-chain-management/product-management/utils/timezone";
import { skuLifecycleService } from "./sku-lifecycle";

// In-memory cache to store parentDraftId -> parentMasterId mappings during sequential approval queue execution
const approvedDraftsMap = new Map<string | number, string | number>();

/**
 * Private helper: resolves the master product ID of a draft's parent.
 * Handles both expanded objects and raw IDs from Directus.
 */
async function resolveParentMasterId(
  draft: SKU,
): Promise<number | string | null> {
  if (!draft.parent_id) return null;

  const parentId =
    typeof draft.parent_id === "object"
      ? (draft.parent_id as unknown as { id: number }).id
      : draft.parent_id;

  // Fallback 1: Resolve using the in-memory cache if the parent draft has already been approved and deleted in this session
  if (parentId && approvedDraftsMap.has(parentId)) {
    return approvedDraftsMap.get(parentId)!;
  }

  // Fallback 2: If this is an edit of an existing child variant, lookup the variant's original parent ID in the master list
  if (draft.remarks?.startsWith("MASTER_EDIT:")) {
    const rawChildId = draft.remarks.split(":")[1];
    if (rawChildId && rawChildId !== "NEW") {
      try {
        const { data: existingChild } = await fetchItems<SKU>("/items/products", {
          filter: JSON.stringify({ product_id: { _eq: rawChildId } }),
          fields: "parent_id",
          limit: 1,
        });
        if (existingChild?.length && existingChild[0].parent_id) {
          const parentIdVal = typeof existingChild[0].parent_id === "object" && existingChild[0].parent_id !== null
            ? (existingChild[0].parent_id as { id?: number }).id
            : existingChild[0].parent_id;
          if (parentIdVal) {
            return parentIdVal;
          }
        }
      } catch (err) {
        console.warn(`[SKU Approval] Failed to resolve parent ID from existing child variant ${rawChildId}:`, err);
      }
    }
  }

  let parentCode = (draft.parent_id as unknown as { product_code?: string } | undefined)?.product_code;

  if (!parentCode) {
    try {
      const { data: pDraft } = await request<{ data: SKU }>(
        `${API_BASE_URL}/items/product_draft/${parentId}`,
      );
      parentCode = pDraft?.product_code;
    } catch (err) {
      console.warn(`[SKU Approval] Parent draft ${parentId} could not be fetched. It may have already been approved and deleted.`, err);
    }
  }

  if (parentCode) {
    const { data: realParent } = await fetchItems<SKU>("/items/products", {
      filter: JSON.stringify({ product_code: { _eq: parentCode } }),
      limit: 1,
    });

    if (realParent?.length) {
      return realParent[0].id || realParent[0].product_id || null;
    }
  }
  return null;
}

/**
 * Private helper: creates or updates the master product record.
 * Uses product_code as the unique key to detect an existing record.
 */
async function upsertMasterProduct(
  draft: SKU,
  pMasterId: number | string | null,
  code: string,
  approvedBy?: string | number,
  approvedAt?: string,
): Promise<number | string> {
  let targetId: number | string | undefined = undefined;

  // 1. If this is a master edit draft, resolve by original master ID from remarks
  if (draft.remarks?.startsWith("MASTER_EDIT:")) {
    const rawId = draft.remarks.split(":")[1];
    if (rawId && rawId !== "NEW") {
      const parsedId = parseInt(rawId);
      if (!isNaN(parsedId)) {
        targetId = parsedId;
      } else {
        targetId = rawId;
      }
    } else if (rawId === "NEW") {
      targetId = "EXPLICIT_NEW";
    }
  } else if (draft.remarks?.startsWith("NEW_CHILD_OF_LIVE:")) {
    targetId = "EXPLICIT_NEW";
  }

  // 2. Fallback to product_code lookup if not resolved via remarks
  if (!targetId) {
    const { data: existing } = await fetchItems<SKU>("/items/products", {
      filter: JSON.stringify({ product_code: { _eq: code } }),
      limit: 1,
    });
    targetId = existing?.[0]?.id || existing?.[0]?.product_id;
  }
  
  if (targetId === "EXPLICIT_NEW") {
    targetId = undefined; // Clear the flag to force a POST request
  }
  const resolvedPMasterId =
    typeof pMasterId === "string" ? parseInt(pMasterId) : pMasterId;
  const dbTime = approvedAt || (await getDatabaseTimeISO());
  const basePayload = prepareSKUPayload(draft, resolvedPMasterId, code, dbTime);

  const resolvedApprovedBy = approvedBy ? parseInt(String(approvedBy)) : null;
  const finalApprovedBy = isNaN(resolvedApprovedBy as number) ? null : resolvedApprovedBy;

  const payload = {
    ...basePayload,
    approved_by: finalApprovedBy,
    approved_at: approvedAt || dbTime || null,
  };

  if (targetId) {
    await request(`${API_BASE_URL}/items/products/${targetId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`[SKU Approval] Updated existing product ID: ${targetId}`);
    return targetId;
  } else {
    const res: {
      data: { id: number | string; product_id: number | string };
    } = await request<{ data: { id: number | string; product_id: number | string } }>(`${API_BASE_URL}/items/products`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const newId = res.data.id || res.data.product_id;
    console.log(`[SKU Approval] Created new master product ID: ${newId}`);
    return newId;
  }
}

/**
 * Private helper: links the approved SKU to its supplier in the junction table.
 * Falls back to the draft's inline supplier field if the junction record is missing.
 */
async function syncSupplierLink(
  draft: SKU,
  finalMasterId: number | string,
): Promise<void> {
  const draftId = draft.id || draft.product_id;
  let sId: number | null = null;

  try {
    const { data: draftSupplierLink } = await fetchItems<{
      supplier_id: number;
    }>("/items/product_draft_per_supplier", {
      filter: JSON.stringify({ product_draft_id: { _eq: draftId } }),
      limit: 1,
    });

    if (draftSupplierLink?.length) {
      sId = draftSupplierLink[0].supplier_id;
    } else {
      const rawValue = draft.product_supplier;
      if (rawValue) {
        if (typeof rawValue === "object") {
          sId = (rawValue as { id: number }).id;
        } else {
          const num = parseInt(String(rawValue));
          sId = isNaN(num) || num === 0 ? null : num;
        }
      }
    }
  } catch (err: unknown) {
    console.error(`[SKU Approval] Error fetching junction link:`, err instanceof Error ? err.message : err);
  }

  const resolvedMasterId = (() => {
    if (!finalMasterId) return null;
    const num = parseInt(String(finalMasterId));
    return isNaN(num) ? null : num;
  })();

  if (sId && resolvedMasterId) {
    try {
      const { data: existingLink } = await fetchItems<Record<string, unknown>>(
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
        await request<unknown>(`${API_BASE_URL}/items/product_per_supplier`, {
          method: "POST",
          body: JSON.stringify({
            product_id: resolvedMasterId,
            supplier_id: sId,
            discount_type: null,
          }),
        });
        console.log(
          `[SKU Approval] Linked Product ${resolvedMasterId} to Supplier ${sId}`,
        );
      } else {
        // Update existing link if supplier changed
        const existingRecord = existingLink[0] as { id?: number; supplier_id?: number };
        if (existingRecord.id && existingRecord.supplier_id !== sId) {
          await request<unknown>(
            `${API_BASE_URL}/items/product_per_supplier/${existingRecord.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({ supplier_id: sId }),
            },
          );
          console.log(
            `[SKU Approval] Updated supplier link for Product ${resolvedMasterId}: ${existingRecord.supplier_id} → ${sId}`,
          );
        }
      }
    } catch (linkErr: unknown) {
      console.error("[SKU Approval] Linkage error:", linkErr instanceof Error ? linkErr.message : linkErr);
    }
  }
}

/**
 * Private helper: marks the draft as ACTIVE (or deletes it) after approval.
 * Tries PATCH first; falls back to DELETE if PATCH is rejected.
 */
async function cleanupDraft(
  draft: SKU,
  masterCode: string,
  approvedBy?: string | number,
  approvedAt?: string,
): Promise<void> {
  const dId = draft.id || draft.product_id;
  
  // 1. Archive old ACTIVE drafts with the same product_code
  if (masterCode) {
    try {
      const filterConditions: Record<string, unknown>[] = [
        { product_code: { _eq: masterCode } },
        { status: { _eq: "ACTIVE" } },
        { product_id: { _neq: dId } },
      ];

      // Add context restriction to avoid collateral archiving of duplicate codes
      if (draft.parent_id) {
        filterConditions.push({ parent_id: { _eq: draft.parent_id } });
      } else {
        filterConditions.push({ parent_id: { _null: true } });
      }

      const { data: oldDrafts } = await fetchItems<SKU>("/items/product_draft", {
        filter: JSON.stringify({ _and: filterConditions }),
        limit: -1,
      });

      if (oldDrafts && oldDrafts.length > 0) {
        const keys = oldDrafts.map((d) => d.id || d.product_id).filter(Boolean);
        if (keys.length > 0) {
          await request(`${API_BASE_URL}/items/product_draft`, {
            method: "PATCH",
            body: JSON.stringify({
              keys,
              data: { status: "ARCHIVED" },
            }),
          });
          console.log(`[SKU Approval] Archived ${keys.length} old draft(s) for code ${masterCode}`);
        }
      }
    } catch (err: unknown) {
      console.error(
        `[SKU Approval] Failed to archive old drafts for ${masterCode}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 2. Mark the newly approved draft as ACTIVE
  try {
    await request(`${API_BASE_URL}/items/product_draft/${dId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "ACTIVE",
        approved_by: approvedBy,
        approved_at: approvedAt,
      }),
    });
  } catch {
    try {
      if (dId) {
        await skuLifecycleService.deleteDraft(dId);
      }
    } catch (delErr: unknown) {
      console.error(
        `[SKU Approval] Failed to cleanup draft ${dId} after approval:`,
        delErr instanceof Error ? delErr.message : delErr,
      );
    }
  }
}

/**
 * Approval workflow: promotes a single draft to the master product table.
 *
 * Step-by-step:
 *  1. Fetch the full draft record
 *  2. Resolve the parent's master product ID (if it's a child/variant)
 *  3. Generate or reuse the SKU product code
 *  4. Upsert the master product record
 *  5. Link the master product to its supplier
 *  6. Adopt any orphan variants that belong to this parent
 *  7. Mark the draft as ACTIVE (or delete it)
 */
export const skuApprovalService = {
  async approveDraft(
    id: number | string,
    masterData: MasterData,
    approvedBy?: string | number,
    approvedAt?: string,
  ): Promise<boolean> {
    // 1. Fetch only the specific draft
    const { data: draft } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${id}?fields=*.*`,
    );

    if (!draft) throw new Error("Draft record not found");

    // 1.5. Gatekeeper: Prevent child approval before parent draft
    if (draft.parent_id) {
      const parentId =
        typeof draft.parent_id === "object"
          ? (draft.parent_id as unknown as { id: number }).id
          : draft.parent_id;

      if (parentId && !approvedDraftsMap.has(parentId)) {
        const pDraftStatus = (draft.parent_id as unknown as { status?: string })?.status;
        if (pDraftStatus && pDraftStatus !== "ACTIVE" && pDraftStatus !== "ARCHIVED") {
            throw new Error("Cannot approve child unit before its parent draft is approved.");
        }
      }
    }

    // 2. Resolve Parent Master ID (if any)
    let pMasterId = await resolveParentMasterId(draft);
    if (draft.remarks?.startsWith("NEW_CHILD_OF_LIVE:")) {
      const liveId = parseInt(draft.remarks.split(":")[1]);
      if (!isNaN(liveId)) {
        pMasterId = liveId;
      }
    }

    // 3. Generate or use existing code
    const masterCode =
      draft.product_code || (await generateSKUCode(draft, masterData)).code;

    // 4. Upsert Master records
    const finalMasterId = await upsertMasterProduct(draft, pMasterId, masterCode, approvedBy, approvedAt);

    // If this is the parent product and it's a master edit, deactivate any removed variants
    if (!pMasterId && finalMasterId) {
      await deactivateRemovedVariants(draft, finalMasterId, id);
    }

    // Cache the approved draft to master mapping for any subsequent children variant approvals
    if (id && finalMasterId) {
      approvedDraftsMap.set(String(id), finalMasterId);
      approvedDraftsMap.set(Number(id), finalMasterId);
    }

    // 5. Link to supplier
    await syncSupplierLink(draft, finalMasterId);

    // 7. Mark draft as ACTIVE and archive old ones
    await cleanupDraft(draft, masterCode, approvedBy, approvedAt);

    return true;
  },

  // Exposed on service so skuService barrel can spread them
  resolveParentMasterId,
  upsertMasterProduct,
  syncSupplierLink,
  cleanupDraft,
};

/**
 * Deactivates child variant products in the products table that were removed in the edit session.
 */
async function deactivateRemovedVariants(
  draft: SKU,
  parentMasterId: string | number,
  draftId: string | number,
): Promise<void> {
  if (draft.remarks?.startsWith("MASTER_EDIT:")) {
    try {
      // 1. Fetch all child variants currently in products under this parent
      const { data: existingVariants } = await fetchItems<SKU>("/items/products", {
        filter: JSON.stringify({ parent_id: { _eq: parentMasterId } }),
        fields: "product_id,product_code",
        limit: -1,
      });

      if (existingVariants && existingVariants.length > 0) {
        // 2. Fetch all currently active child drafts for this parent draft
        const { data: childDrafts } = await fetchItems<SKU>("/items/product_draft", {
          filter: JSON.stringify({ parent_id: { _eq: draftId } }),
          fields: "product_code",
          limit: -1,
        });

        const activeDraftCodes = (childDrafts || []).map((d) => d.product_code).filter(Boolean);

        // 3. For any existing variant not in the active child drafts, set status to Inactive
        for (const variant of existingVariants) {
          if (variant.product_code && !activeDraftCodes.includes(variant.product_code)) {
            await request(`${API_BASE_URL}/items/products/${variant.product_id || variant.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "Inactive", isActive: 0 }),
            });
            console.log(`[SKU Approval] Deactivated removed variant product ID: ${variant.product_id || variant.id}`);
          }
        }
      }
    } catch (err: unknown) {
      console.error(
        `[SKU Approval] Failed to deactivate removed variants for parent product ${parentMasterId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
