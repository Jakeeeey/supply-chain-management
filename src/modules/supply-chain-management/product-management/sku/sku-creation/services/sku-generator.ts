import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
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
  precomputedSequence?: string
): Promise<{ code: string; sequence: string }> {
  try {
    // 1. Resolve Category Code
    const catId = typeof sku.product_category === "object" && sku.product_category !== null
      ? (sku.product_category as { id?: number }).id
      : sku.product_category;
    const cat = masterData.categories.find((c) => c.id == catId);
    const catCode = getSanitizedCode(cat, "PROD");

    // 2. Resolve Brand Code
    const brandId = typeof sku.product_brand === "object" && sku.product_brand !== null
      ? (sku.product_brand as { id?: number }).id
      : sku.product_brand;
    const brand = masterData.brands.find((b) => b.id == brandId);
    const brandCode = getSanitizedCode(brand, "GEN");

    // 3. Resolve UOM Code
    const uomId = typeof sku.unit_of_measurement === "object" && sku.unit_of_measurement !== null
      ? (sku.unit_of_measurement as { id?: number }).id
      : sku.unit_of_measurement;
    let uom = masterData.units.find((u) => u.id == uomId);

    // If not found by unit_of_measurement ID, try resolving from base_unit (ID or string name)
    if (!uom && sku.base_unit) {
      const parsedBaseUnit = parseInt(String(sku.base_unit));
      if (!isNaN(parsedBaseUnit)) {
        uom = masterData.units.find((u) => u.id == parsedBaseUnit);
      } else {
        uom = masterData.units.find((u) => 
          (u.name || "").toLowerCase().trim() === String(sku.base_unit).toLowerCase().trim()
        );
      }
    }
    const uomName = (
      (uom as { id: number; name: string; unit?: string; title?: string } | undefined)?.name ||
      (uom as { id: number; name: string; unit?: string; title?: string } | undefined)?.unit ||
      (uom as { id: number; name: string; unit?: string; title?: string } | undefined)?.title ||
      ""
    )
      .toLowerCase()
      .trim();
    const uomCode = getUOMCode(uomName);

    // 4. Resolve Sequence (3 digits)
    let seq = precomputedSequence || "001";

    if (!precomputedSequence) {
      // A. Inherit sequence from parent if possible
      if (sku.parent_id) {
        try {
          const [prodParent, draftParent] = await Promise.all([
            fetchItems<SKU>("/items/products", {
              filter: JSON.stringify({ product_id: { _eq: sku.parent_id } }),
              fields: "product_code",
            }),
            fetchItems<SKU>("/items/product_draft", {
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
              seq = extractedSeq;
            }
          }
        } catch {
          console.warn("Sequence inheritance skipped");
        }
      }

      // B. Otherwise, calculate new sequence
      if (seq === "001") {
        const commonFilters: Record<string, string | number | boolean> = {
          "filter[product_category][_eq]": catId!,
          "filter[product_brand][_eq]": brandId!,
          "filter[parent_id][_null]": "true",
        };

        const myId = sku.id || sku.product_id;

        // Create collection-aware count function
        const countItems = async (
          endpoint: string,
          pKey: string,
        ): Promise<number> => {
          try {
            const params: Record<string, string | number | boolean> = {
              ...commonFilters,
              limit: 0,
              meta: "filter_count",
            };
            if (myId) {
              params[`filter[${pKey}][_neq]`] = myId;
            }
            const res = await fetchItems<Record<string, unknown>>(endpoint, params);
            return res.meta?.filter_count || 0;
          } catch {
            return 0;
          }
        };

        const [prodCount, draftCount] = await Promise.all([
          countItems("/items/products", "product_id"),
          countItems("/items/product_draft", "product_id"),
        ]);

        const totalFamilies = (prodCount || 0) + (draftCount || 0);
        seq = String(totalFamilies + 1).padStart(3, "0");
      }
    }

    const code = buildFinalSKU(catCode, brandCode, seq, uomCode, sku);
    return { code, sequence: seq };
  } catch (error) {
    console.error("SKU Generation Error:", error);
    const fallbackSeq = Date.now().toString().slice(-3);
    return { 
      code: `SKU-${fallbackSeq}`, 
      sequence: fallbackSeq 
    };
  }
}

/**
 * Generates a unique 13-digit EAN-13 barcode starting with prefix "200" for internal use.
 * Calculates check digit according to standard EAN-13 rules.
 */
export function generateBarcode(): string {
  const prefix = "200";
  let body = "";
  for (let i = 0; i < 9; i++) {
    body += Math.floor(Math.random() * 10).toString();
  }
  const partial = prefix + body;
  
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(partial[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;
  
  return partial + checkDigit;
}
