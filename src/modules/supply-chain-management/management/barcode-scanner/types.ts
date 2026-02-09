export interface Category {
  category_id: string;
  category_name: string;
}

export interface Unit {
  unit_id: string;
  unit_name: string;
  unit_shortcut?: string;
}

export interface Product {
  product_id: string;
  product_name: string;
  barcode: string | null;
  sku_code: string;
  // Directus relations often return the object if fields=*.* is used
  product_category: Category | string | null;
  unit_of_measurement: Unit | string | null;
}

export interface UpdateBarcodeDTO {
  barcode: string;
}

export interface BarcodeScannerState {
  isModalOpen: boolean;
  selectedProduct: Product | null;
}
