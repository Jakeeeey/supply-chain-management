// src/modules/supply-chain-management/management/barcode-scanner/types.ts

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
  product_code: string;
  product_category: Category | string | null;
  unit_of_measurement: Unit | string | null;
  product_per_supplier?: ProductSupplierJunction[];
}

export interface UpdateBarcodeDTO {
  barcode: string;
}

// REVISION: Return Supplier Name instead of Shortcut
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
        // CHANGED: Return supplier_name primarily
        return sup.supplier_name || sup.supplier_shortcut;
      }
      return null;
    })
    .filter((name): name is string => !!name);

  return names.length > 0 ? names.join(", ") : "-";
};
