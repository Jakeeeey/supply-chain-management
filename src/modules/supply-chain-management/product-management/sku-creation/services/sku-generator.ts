import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { fetchItems } from "./sku-api";

import {
  getSanitizedCode,
  getUOMCode,
  buildFinalSKU,
} from "../utils/sku-helpers";

// Main Generator Logic
export async function generateSKUCode(
  sku: SKU,
  masterData: MasterData,
): Promise<string> {
  try {
    // 1. Resolve Category Code
    const cat = masterData.categories.find((c) => c.id == sku.product_category);
    const catCode = getSanitizedCode(cat, "PROD");

    // 2. Resolve Brand Code
    const brand = masterData.brands.find((b) => b.id == sku.product_brand);
    const brandCode = getSanitizedCode(brand, "GEN");

    // 3. Resolve UOM Code
    const uomId = sku.base_unit || sku.unit_of_measurement;
    const uom = masterData.units.find((u) => u.id == uomId);
    const uomName = (
      (uom as any)?.name ||
      (uom as any)?.unit ||
      (uom as any)?.title ||
      ""
    )
      .toLowerCase()
      .trim();
    const uomCode = getUOMCode(uomName);

    // 4. Resolve Sequence (3 digits)
    let seq = "001";

    // A. Inherit sequence from parent if possible
    if (sku.parent_id) {
      try {
        const [prodParent, draftParent] = await Promise.all([
          fetchItems<any>("/items/products", {
            filter: JSON.stringify({ product_id: { _eq: sku.parent_id } }),
            fields: "product_code",
          }),
          fetchItems<any>("/items/product_draft", {
            filter: JSON.stringify({ id: { _eq: sku.parent_id } }),
            fields: "product_code",
          }),
        ]);
        const parentCode =
          prodParent.data?.[0]?.product_code ||
          draftParent.data?.[0]?.product_code;
        if (parentCode) {
          const parts = parentCode.split("-");
          const seqUOMPart = parts[parts.length - 1]; // e.g. "001PAC"
          const extractedSeq = seqUOMPart.substring(0, 3);
          if (/^\d{3}$/.test(extractedSeq)) {
            return buildFinalSKU(
              catCode,
              brandCode,
              extractedSeq,
              uomCode,
              sku,
            );
          }
        }
      } catch (e) {
        console.warn("Sequence inheritance skipped:", e);
      }
    }

    // B. Otherwise, calculate new sequence
    const commonFilters: any = {
      "filter[product_category][_eq]": sku.product_category,
      "filter[product_brand][_eq]": sku.product_brand,
      "filter[parent_id][_null]": "true",
    };

    const myId = sku.id || (sku as any).product_id;

    // Create collection-aware count function
    const countItems = async (
      endpoint: string,
      pKey: string,
    ): Promise<number> => {
      try {
        const params: any = {
          ...commonFilters,
          limit: 0,
          meta: "filter_count",
        };
        if (myId) {
          params[`filter[${pKey}][_neq]`] = myId;
        }
        const res = await fetchItems<any>(endpoint, params);
        return res.meta?.filter_count || 0;
      } catch (e) {
        return 0;
      }
    };

    const [prodCount, draftCount] = await Promise.all([
      countItems("/items/products", "product_id"),
      countItems("/items/product_draft", "id"),
    ]);

    const totalFamilies = (prodCount || 0) + (draftCount || 0);
    seq = String(totalFamilies + 1).padStart(3, "0");

    return buildFinalSKU(catCode, brandCode, seq, uomCode, sku);
  } catch (error) {
    console.error("SKU Generation Error:", error);
    return `SKU-${Date.now().toString().slice(-6)}`;
  }
}
