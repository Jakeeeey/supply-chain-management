import { ProductMovementRow, ProductTracingFiltersType, ProductFamilyRow } from "../types";

export async function fetchBranches(): Promise<Array<{ id: number; branch_name: string }>> {
    const res = await fetch("/api/scm/inventory-management/physical-inventory/directus/branches?fields=id,branch_name&sort=branch_name&limit=-1");
    const json = await res.json();
    return json.data || [];
}

/**
 * Fetches product families. 
 * A family is defined by products where parent_id is null/0 or by grouping by parent_id.
 */
export async function fetchProductFamilies(): Promise<ProductFamilyRow[]> {
    // We fetch products and filter for those that are "parents" (parent_id is null or 0)
    // We run these in parallel to improve load speed.
    const [resNull, resZero] = await Promise.all([
        fetch("/api/scm/inventory-management/physical-inventory/directus/products?fields=product_id,parent_id,product_name,product_code,short_description,product_category.category_name,product_brand.brand_name&filter[parent_id][_null]=true&filter[isActive][_eq]=1&sort=product_name&limit=-1"),
        fetch("/api/scm/inventory-management/physical-inventory/directus/products?fields=product_id,parent_id,product_name,product_code,short_description,product_category.category_name,product_brand.brand_name&filter[parent_id][_eq]=0&filter[isActive][_eq]=1&sort=product_name&limit=-1")
    ]);

    const [jsonNull, jsonZero] = await Promise.all([
        resNull.json(),
        resZero.json()
    ]);

    const allParents = [...(jsonNull.data || []), ...(jsonZero.data || [])];
    
    return allParents.map(p => ({
        parent_id: p.product_id,
        product_name: p.product_name,
        product_code: p.product_code,
        category_name: p.product_category?.category_name,
        brand_name: p.product_brand?.brand_name,
        short_description: p.short_description
    }));
}

export async function fetchMovements(filters: ProductTracingFiltersType): Promise<ProductMovementRow[]> {
    const params = new URLSearchParams();
    if (filters.branch_id) params.set("branchId", String(filters.branch_id));
    if (filters.parent_id) params.set("parentId", String(filters.parent_id));
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    const res = await fetch(`/api/scm/traceability-compliance/product-tracing?${params.toString()}`);
    if (!res.ok) {
        throw new Error("Failed to fetch movements");
    }
    return res.json();
}
