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

// Reference Data
export interface WeightUnit {
  id: number;
  code: string;
  name: string;
}

export interface CbmUnit {
  id: number;
  code: string;
  name: string;
}

export interface BarcodeType {
  id: number;
  name: string;
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
  product_code: string; // SKU
  barcode: string | null;
  barcode_date?: string | null;

  // Relations
  product_category: Category | string | null;
  unit_of_measurement: Unit | string | null;
  product_per_supplier?: ProductSupplierJunction[];

  // Logistics Fields
  // Note: These key names must match exactly what Directus returns
  barcode_type_id?: BarcodeType | null;

  weight?: number | null;
  weight_unit_id?: WeightUnit | null;

  cbm_length?: number | null;
  cbm_width?: number | null;
  cbm_height?: number | null;
  cbm_unit_id?: CbmUnit | null;
}

export const getSupplierName = (p: Product): string => {
  if (
    !p.product_per_supplier ||
    !Array.isArray(p.product_per_supplier) ||
    p.product_per_supplier.length === 0
  ) {
    return "-";
  }

  const names = p.product_per_supplier
    .map((junction) => {
      if (junction.supplier_id && typeof junction.supplier_id === "object") {
        const sup = junction.supplier_id as Supplier;
        return sup.supplier_name || sup.supplier_shortcut;
      }
      return null;
    })
    .filter((name): name is string => !!name);

  return names.length > 0 ? names.join(", ") : "-";
};
