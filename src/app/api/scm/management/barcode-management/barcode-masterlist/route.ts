import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Prevent caching

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function json(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

async function fetchDirectus(endpoint: string, params: Record<string, string>) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN) throw new Error("Missing config");

  const url = new URL(`${DIRECTUS_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    console.error(`[API Error] ${endpoint}:`, json);
    throw new Error(json.error?.message || `Directus Error ${res.status}`);
  }

  return json.data;
}

async function updateDirectus(id: string, body: any) {
  const res = await fetch(`${DIRECTUS_URL}/items/products/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Update Failed");
  return json.data;
}

export async function GET(req: NextRequest) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");

  try {
    // ---------------------------------------------------------
    // 1. REFERENCE DATA (Strict Checks)
    // ---------------------------------------------------------
    if (scope === "barcode_type") {
      const data = await fetchDirectus("/items/barcode_type", {
        fields: "id,name",
        "filter[is_active][_eq]": "1",
        limit: "-1",
      });
      return json({ data });
    }

    if (scope === "weight_unit") {
      const data = await fetchDirectus("/items/weight_unit", {
        fields: "id,code,name",
        "filter[is_active][_eq]": "1",
        limit: "-1",
      });
      return json({ data });
    }

    if (scope === "cbm_unit") {
      const data = await fetchDirectus("/items/cbm_unit", {
        fields: "id,code,name",
        "filter[is_active][_eq]": "1",
        limit: "-1",
      });
      return json({ data });
    }

    if (scope === "suppliers") {
      const data = await fetchDirectus("/items/suppliers", {
        fields: "id,supplier_name,supplier_shortcut",
        "filter[isActive][_eq]": "1",
        limit: "-1",
        sort: "supplier_name",
      });
      return json({ data });
    }

    // ---------------------------------------------------------
    // 2. PRODUCT LIST (Default)
    // Only runs if scope is empty or explicitly "products"
    // ---------------------------------------------------------
    if (!scope || scope === "products") {
      const productsPromise = fetchDirectus("/items/products", {
        fields: [
          "product_id",
          "product_name",
          "barcode",
          "description",
          "product_code",
          "barcode_date",
          "product_category.category_name",
          "unit_of_measurement.unit_name",
          "unit_of_measurement.unit_shortcut",
          // Logistics Fields
          "weight",
          "weight_unit_id.id",
          "weight_unit_id.code",
          "weight_unit_id.name",
          "cbm_length",
          "cbm_width",
          "cbm_height",
          "cbm_unit_id.id",
          "cbm_unit_id.code",
          "cbm_unit_id.name",
          "barcode_type_id.id",
          "barcode_type_id.name",
        ].join(","),
        limit: "-1",
        "filter[isActive][_eq]": "1",
        "filter[barcode][_nnull]": "true",
        "filter[product_code][_nnull]": "true",
      });

      const junctionPromise = fetchDirectus("/items/product_per_supplier", {
        fields:
          "product_id,supplier_id.id,supplier_id.supplier_name,supplier_id.supplier_shortcut",
        limit: "-1",
      });

      const [products, junction] = await Promise.all([
        productsPromise,
        junctionPromise,
      ]);

      const supplierMap = new Map<number, any[]>();
      junction.forEach((item: any) => {
        if (!item.product_id || !item.supplier_id) return;
        const supplierObj =
          typeof item.supplier_id === "object"
            ? item.supplier_id
            : { id: item.supplier_id, supplier_name: "Unknown" };
        const pid = item.product_id;
        if (!supplierMap.has(pid)) supplierMap.set(pid, []);
        supplierMap.get(pid)?.push({ supplier_id: supplierObj });
      });

      const mergedData = products.map((p: any) => ({
        ...p,
        product_per_supplier: supplierMap.get(p.product_id) || [],
      }));

      return json({ data: mergedData });
    }

    // If scope is unknown, return error (Don't default to products!)
    return json({ error: `Invalid scope: ${scope}` }, 400);
  } catch (error: any) {
    console.error("Linking API Error:", error);
    return json({ error: error.message }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) return json({ error: "Product ID required" }, 400);

  try {
    const body = await req.json();
    const result = await updateDirectus(id, body);
    return json({ data: result });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}
