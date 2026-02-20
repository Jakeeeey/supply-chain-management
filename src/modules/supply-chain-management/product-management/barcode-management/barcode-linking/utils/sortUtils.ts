import { Product } from "../types";

export const sortProductsByBarcodeStatus = (products: Product[]): Product[] => {
  return [...products].sort((a, b) => {
    const aHasBarcode = !!a.barcode;
    const bHasBarcode = !!b.barcode;

    if (aHasBarcode === bHasBarcode) return 0;
    // If a has barcode (true) and b doesn't (false), a should come after b
    return aHasBarcode ? 1 : -1;
  });
};
