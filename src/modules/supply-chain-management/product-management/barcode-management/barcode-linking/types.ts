export interface Supplier {
  id: number;
  supplier_name: string;
  supplier_shortcut: string;
}

export interface Category {
  category_id: string;
  category_name: string;
}

export interface Unit {
  unit_id: string;
  unit_name: string;
  unit_shortcut?: string;
}

export interface ProductSupplierJunction {
  id: number;
  product_id: number;
  supplier_id: Supplier | number;
}

export interface Product {
  product_id: string;
  description?: string | null;
  product_name: string;
  barcode: string | null;
  barcode_date?: string | null;
  product_code: string;
  product_category: Category | string | null;
  unit_of_measurement: Unit | string | null;
  product_per_supplier?: ProductSupplierJunction[];

  /** Runtime-only discriminator: "product" or "bundle" */
  record_type?: "product" | "bundle";
}

export interface RefData {
  id: number;
  name: string;
  code?: string;
}

export interface UpdateBarcodeDTO {
  barcode: string;
  barcode_type_id: number;
  barcode_date: string;

  // Dimensions
  cbm_length?: number;
  cbm_width?: number;
  cbm_height?: number;
  cbm_unit_id?: number;

  // Weight
  weight?: number;
  weight_unit_id?: number;
}
