import { toast } from "sonner";
import { Product, RefData, UpdateBarcodeDTO } from "../types";
import { validateEAN13, validateCode128 } from "./barcodeUtils";

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
}

/**
 * Validates all barcode + logistics fields and returns a ready-to-send payload.
 * Shows toast errors for each validation failure.
 * @returns The payload if valid, or `null` if validation failed.
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
    }

    // 4. Duplicate check — linked products
    const duplicateLinked = allBarcodes.find(
        (b) =>
            b.barcode === barcode && b.product_id !== String(product?.product_id),
    );
    if (duplicateLinked) {
        toast.error("Duplicate Barcode!", {
            description: `This barcode is already assigned to: "${duplicateLinked.product_name}"`,
        });
        return null;
    }

    // 5. Duplicate check — unlinked products (same session)
    const duplicateUnlinked = allProducts.find(
        (p) => p.barcode === barcode && p.product_id !== product?.product_id,
    );
    if (duplicateUnlinked) {
        toast.error("Duplicate Barcode!", {
            description: `Barcode used by: "${duplicateUnlinked.product_name}"`,
        });
        return null;
    }

    // 6. Build payload
    const payload: UpdateBarcodeDTO = {
        barcode,
        barcode_type_id: parseInt(selectedBarcodeTypeId),
        barcode_date: new Date().toISOString(),
        weight: parseFloat(dimensions.weight),
        weight_unit_id: parseInt(dimensions.weightUnit),
    };

    // 7. CBM dimensions (optional)
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
    }

    return payload;
}
