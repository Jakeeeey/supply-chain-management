import { toast } from "sonner";
import { Product, RefData, UpdateBarcodeDTO } from "../types";
import { validateEAN13, validateCode128 } from "./barcodeUtils";
import { formatInTimeZone } from "@/modules/supply-chain-management/product-management/utils/timezone";

interface ValidationInput {
  barcode: string;
  selectedBarcodeTypeId: string;
  barcodeTypes: RefData[];
  dimensions: {
    weight: string;
    weightUnit: string;
    length: string;
    width: string;
    height: string;
    unit: string;
  };
  recordDimensions: boolean;
  product: Product | null;
  allBarcodes: { product_id: string; barcode: string; product_name: string }[];
  allProducts: Product[];
  dbTime?: string;
}

/**
 * Validates barcode + logistics fields and returns payload.
 * Shows toast errors for each validation failure.
 */
export function validateAndBuildPayload(
  input: ValidationInput,
): UpdateBarcodeDTO | null {
  const {
    barcode,
    selectedBarcodeTypeId,
    barcodeTypes,
    dimensions,
    recordDimensions,
    product,
    allBarcodes,
    allProducts,
    dbTime,
  } = input;

  // 1. Barcode required
  if (!barcode) {
    toast.error("Barcode cannot be empty.");
    return null;
  }

  // 2. Weight required
  if (!dimensions.weight || parseFloat(dimensions.weight) <= 0) {
    toast.error("Weight must be greater than zero.");
    return null;
  }
  if (!dimensions.weightUnit) {
    toast.error("Weight unit is required.");
    return null;
  }

  // 3. Format validation
  const typeName =
    barcodeTypes.find((t) => String(t.id) === selectedBarcodeTypeId)?.name ||
    "EAN-13";

  if (typeName.includes("EAN-13")) {
    const check = validateEAN13(barcode);
    if (!check.isValid) {
      toast.error(`Format Mismatch: ${typeName}`, {
        description: check.error || "Invalid EAN-13",
      });
      return null;
    }
  } else if (typeName.includes("Code 128")) {
    const check = validateCode128(barcode);
    if (!check.isValid) {
      toast.error(`Format Mismatch: ${typeName}`, {
        description: check.error || "Invalid Code 128",
      });
      return null;
    }
  } else {
    toast.error("Unsupported Barcode Type", {
      description: `"${typeName}" is not a recognized barcode format. Only EAN-13 and Code 128 are supported.`,
    });
    return null;
  }

  // 4. Duplicate check — against all existing barcodes (ignoring self)
  const currentProductId = product ? String(product.product_id) : "";
  const duplicateLinked = allBarcodes.find(
    (b) => b.barcode === barcode && b.product_id !== currentProductId,
  );
  if (duplicateLinked) {
    toast.error("Duplicate Barcode!", {
      description: `This barcode is already assigned to: "${duplicateLinked.product_name}"`,
    });
    return null;
  }

  // Duplicate check — across all products loaded in memory (ignoring self)
  const duplicateProduct = allProducts.find(
    (p) => p.barcode === barcode && String(p.product_id) !== currentProductId,
  );
  if (duplicateProduct) {
    toast.error("Duplicate Barcode!", {
      description: `Barcode used by: "${duplicateProduct.product_name || duplicateProduct.description || "Unknown"}"`,
    });
    return null;
  }

  // 5. Build payload
  const payload: UpdateBarcodeDTO = {
    barcode,
    barcode_type_id: parseInt(selectedBarcodeTypeId),
    barcode_date: dbTime || formatInTimeZone(new Date(), "Asia/Manila"),
    weight: parseFloat(dimensions.weight),
    weight_unit_id: parseInt(dimensions.weightUnit),
  };

  // 6. CBM dimensions (optional - null if unchecked to clear database values)
  if (recordDimensions) {
    if (
      !dimensions.length ||
      parseFloat(dimensions.length) <= 0 ||
      !dimensions.width ||
      parseFloat(dimensions.width) <= 0 ||
      !dimensions.height ||
      parseFloat(dimensions.height) <= 0
    ) {
      toast.error("All CBM dimensions must be greater than zero.");
      return null;
    }
    if (!dimensions.unit) {
      toast.error("CBM unit is required.");
      return null;
    }
    payload.cbm_length = parseFloat(dimensions.length);
    payload.cbm_width = parseFloat(dimensions.width);
    payload.cbm_height = parseFloat(dimensions.height);
    payload.cbm_unit_id = parseInt(dimensions.unit);
  } else {
    payload.cbm_length = null;
    payload.cbm_width = null;
    payload.cbm_height = null;
    payload.cbm_unit_id = null;
  }

  return payload;
}
