import type { Product, ProductSupplierConnection, SupplierCategoryDiscount } from "../type";

/**
 * Resolves the final discount type based on a 2-level override hierarchy:
 * 1. Specific Match: Customer + Supplier + Category
 * 2. General Match: Customer + Supplier (where Category is NULL)
 * 
 * If a match is found but discount_type is NULL, it returns NULL (No Discount).
 * If no match is found, it returns NULL (No Fallback).
 */
export function resolveFinalDiscount(
  product: Product,
  customerCode: string | undefined,
  catalog: {
    connections: ProductSupplierConnection[];
    supplierCategoryDiscount?: SupplierCategoryDiscount[];
  }
): string | number | null {
  if (!customerCode) return null;

  const productId = product.product_id;
  const categoryId = product.product_category;

  // 1. Find supplier ID from connections
  const psc = catalog.connections?.find(
    (c) => c.product_id === productId
  );
  const supplierId = psc?.supplier_id;

  if (!supplierId) return null;

  // 2. TIER 1: Specific Category Match (Priority A)
  const specificMatch = catalog.supplierCategoryDiscount?.find(
    (c) => 
      c.customer_code === customerCode && 
      c.supplier_id === supplierId && 
      c.category_id === categoryId
  );
  if (specificMatch) {
    // Terminal: Use whatever is in the record (even if NULL)
    return specificMatch.discount_type || null;
  }

  // 3. TIER 2: Supplier-wide Match (Category is NULL) (Priority B)
  const generalMatch = catalog.supplierCategoryDiscount?.find(
    (c) => 
      c.customer_code === customerCode && 
      c.supplier_id === supplierId && 
      (c.category_id === null || c.category_id === undefined)
  );
  if (generalMatch) {
    // Terminal: Use whatever is in the record (even if NULL)
    return generalMatch.discount_type || null;
  }

  // 4. Default: No match found = No Discount
  return null;
}
