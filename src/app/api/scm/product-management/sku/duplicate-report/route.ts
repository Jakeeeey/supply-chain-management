import { NextResponse } from "next/server";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

export const runtime = "nodejs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchAllProducts(): Promise<SKU[]> {
  const allProducts: SKU[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const res = await fetch(`${API_BASE_URL}/items/products?limit=${limit}&offset=${offset}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!data.data || data.data.length === 0) {
      break;
    }
    allProducts.push(...data.data);
    if (data.data.length < limit) {
      break;
    }
    offset += limit;
  }
  return allProducts;
}

export async function GET() {
  try {
    const allProducts = await fetchAllProducts();

    // Map for quick parent lookup
    const productMap = new Map<number | string, SKU>();
    allProducts.forEach(p => {
      const id = p.id || p.product_id;
      if (id) productMap.set(String(id), p);
    });

    // Function to find root ID
    const getRootId = (productId: number | string): string => {
      let currentId = String(productId);
      const visited = new Set<string>(); // Prevent infinite loops
      while (true) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        const p = productMap.get(currentId);
        if (!p || !p.parent_id) {
          return currentId;
        }
        currentId = typeof p.parent_id === 'object' ? String((p.parent_id as { id: string | number }).id) : String(p.parent_id);
      }
      return currentId;
    };

    // Group by Name + Description
    const groups = new Map<string, SKU[]>();
    allProducts.forEach(p => {
      const name = p.product_name?.trim().toLowerCase() || "";
      const desc = p.description?.trim().toLowerCase() || "";
      if (!name) return; // Skip unnamed products
      
      const key = `${name}|||${desc}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(p);
    });

    const duplicateGroups: {
      name: string;
      description: string;
      items: SKU[];
      totalItems: number;
    }[] = [];

    // Evaluate each group for duplicates
    for (const [key, items] of groups.entries()) {
      if (items.length < 2) continue; // No duplicates in this group

      // Group by root parent to find true duplicates
      const roots = new Set<string>();
      items.forEach(item => {
        const id = item.id || item.product_id;
        if (id) {
          roots.add(getRootId(id));
        }
      });

      // If there's more than 1 distinct root, it means there are actual duplicates
      if (roots.size > 1) {
        const [name, description] = key.split("|||");
        duplicateGroups.push({
          name: items[0].product_name || name,
          description: items[0].description || description,
          items,
          totalItems: items.length
        });
      }
    }

    return NextResponse.json({
      data: duplicateGroups,
      meta: {
        total_groups: duplicateGroups.length
      }
    });

  } catch (error: unknown) {
    console.error("Error fetching duplicate report:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
