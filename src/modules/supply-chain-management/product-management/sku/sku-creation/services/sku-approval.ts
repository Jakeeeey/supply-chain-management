import {
  MasterData,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { prepareSKUPayload } from "../utils/sku-mapper";
import { API_BASE_URL, fetchItems, request } from "./sku-api";
import { generateSKUCode } from "./sku-generator";

/**
 * Private helper: resolves the master product ID of a draft's parent.
 * Handles both expanded objects and raw IDs from Directus.
 */
async function resolveParentMasterId(
  draft: SKU,
): Promise<number | string | null> {
  if (!draft.parent_id) return null;

  let parentCode = (draft.parent_id as unknown as { product_code?: string } | undefined)?.product_code;

  if (!parentCode) {
    const parentId =
      typeof draft.parent_id === "object"
        ? (draft.parent_id as unknown as { id: number }).id
        : draft.parent_id;

    const { data: pDraft } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${parentId}`,
    );
    parentCode = pDraft?.product_code;
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
): Promise<number | string> {
  const { data: existing } = await fetchItems<SKU>("/items/products", {
    filter: JSON.stringify({ product_code: { _eq: code } }),
    limit: 1,
  });

  const targetId = existing?.[0]?.id || existing?.[0]?.product_id;
  const resolvedPMasterId =
    typeof pMasterId === "string" ? parseInt(pMasterId) : pMasterId;
  const payload = prepareSKUPayload(draft, resolvedPMasterId, code);

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
      }
    } catch (linkErr: unknown) {
      console.error("[SKU Approval] Linkage error:", linkErr instanceof Error ? linkErr.message : linkErr);
    }
  }
}

/**
 * Private helper: adopts orphan master products when a parent SKU is approved.
 * An "orphan" is a master product with the same name but no parent_id yet.
 */
async function handleOrphanAdoption(
  finalMasterId: number | string,
  code: string,
  draft: SKU,
): Promise<void> {
  if (!draft.parent_id) {
    const orphanConditions: Record<string, Record<string, unknown>>[] = [
      { product_name: { _eq: draft.product_name } },
      { parent_id: { _null: true } },
      { product_id: { _neq: finalMasterId } },
    ];

    const codeBase = code.substring(0, 10);
    if (codeBase && codeBase.length >= 5) {
      orphanConditions.push({ product_code: { _starts_with: codeBase } });
    }

    const { data: orphans } = await fetchItems<SKU>("/items/products", {
      filter: JSON.stringify({ _and: orphanConditions }),
      limit: 500, // Using 500 instead of -1 for safer bounds
    });

    if (orphans?.length) {
      console.log(
        `[SKU Approval] Parent ${finalMasterId} adopting ${orphans.length} orphans...`,
      );
      
      const keys = orphans.map((orphan) => orphan.id || orphan.product_id).filter(Boolean);
      
      if (keys.length > 0) {
        await request(`${API_BASE_URL}/items/products`, {
          method: "PATCH",
          body: JSON.stringify({
            keys,
            data: { parent_id: finalMasterId },
          }),
        });
      }
    }
  }
}

/**
 * Private helper: marks the draft as ACTIVE (or deletes it) after approval.
 * Tries PATCH first; falls back to DELETE if PATCH is rejected.
 */
async function cleanupDraft(draft: SKU): Promise<void> {
  const dId = draft.id || draft.product_id;
  try {
    await request(`${API_BASE_URL}/items/product_draft/${dId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ACTIVE" }),
    });
  } catch {
    try {
      await request(`${API_BASE_URL}/items/product_draft/${dId}`, {
        method: "DELETE",
      });
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
  ): Promise<boolean> {
    // 1. Fetch only the specific draft
    const { data: draft } = await request<{ data: SKU }>(
      `${API_BASE_URL}/items/product_draft/${id}?fields=*.*`,
    );

    if (!draft) throw new Error("Draft record not found");

    // 2. Resolve Parent Master ID (if any)
    const pMasterId = await resolveParentMasterId(draft);

    // 3. Generate or use existing code
    const code =
      draft.product_code || (await generateSKUCode(draft, masterData));

    // 4. Upsert Master records
    const finalMasterId = await upsertMasterProduct(draft, pMasterId, code);

    // 5. Link to supplier
    await syncSupplierLink(draft, finalMasterId);

    // 6. Handle orphan child adoptions
    await handleOrphanAdoption(finalMasterId, code, draft);

    // 7. Cleanup only THIS draft
    await cleanupDraft(draft);

    return true;
  },

  // Exposed on service so skuService barrel can spread them
  resolveParentMasterId,
  upsertMasterProduct,
  syncSupplierLink,
  handleOrphanAdoption,
  cleanupDraft,
};
