import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function json(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

// Helper to handle fetches with better error logging
async function fetchDirectus(endpoint: string, params: Record<string, string>) {
  if (!DIRECTUS_URL || !ACCESS_TOKEN) throw new Error("Missing config");

  const url = new URL(`${DIRECTUS_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  console.log(`[API] Fetching: ${url.toString()}`); // Debug Log

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
    console.error(`[API Error] ${endpoint}:`, json); // Log specific Directus error
    throw new Error(json.error?.message || `Directus Error ${res.status}`);
  }

  return json.data;
}

async function proxyRequest(req: NextRequest, method: string) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const scope = url.searchParams.get("scope");

  // HANDLE PATCH (Update Barcode)
  if (method === "PATCH") {
    const body = await req.json();
    const recordType = url.searchParams.get("record_type") || "product";
    try {
      // SERVER-SIDE UNIQUENESS CHECK: Query both products AND bundles for this barcode
      const barcodeToCheck = recordType === "bundle" ? body.barcode_value : body.barcode;
      if (barcodeToCheck) {
        // Check products table
        const checkProductUrl = new URL(`${DIRECTUS_URL}/items/products`);
        checkProductUrl.searchParams.append("fields", "product_id,product_name,barcode");
        checkProductUrl.searchParams.append("filter[barcode][_eq]", barcodeToCheck);
        checkProductUrl.searchParams.append("filter[isActive][_eq]", "1");
        checkProductUrl.searchParams.append("limit", "1");

        const checkProductRes = await fetch(checkProductUrl.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
          cache: "no-store",
        });
        const checkProductData = await checkProductRes.json();
        if (checkProductData.data && checkProductData.data.length > 0) {
          const conflict = checkProductData.data[0];
          return json(
            { error: `Barcode already assigned to product: "${conflict.product_name || conflict.product_id}"` },
            409,
          );
        }

        // Check bundles table
        const checkBundleUrl = new URL(`${DIRECTUS_URL}/items/product_bundles`);
        checkBundleUrl.searchParams.append("fields", "id,bundle_name,barcode_value");
        checkBundleUrl.searchParams.append("filter[barcode_value][_eq]", barcodeToCheck);
        if (recordType === "bundle") {
          checkBundleUrl.searchParams.append("filter[id][_neq]", id!);
        }
        checkBundleUrl.searchParams.append("limit", "1");

        const checkBundleRes = await fetch(checkBundleUrl.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
          cache: "no-store",
        });
        const checkBundleData = await checkBundleRes.json();
        if (checkBundleData.data && checkBundleData.data.length > 0) {
          const conflict = checkBundleData.data[0];
          return json(
            { error: `Barcode already assigned to bundle: "${conflict.bundle_name || conflict.id}"` },
            409,
          );
        }
      }

      // Determine which collection to PATCH
      const patchCollection = recordType === "bundle" ? "product_bundles" : "products";
      const res = await fetch(`${DIRECTUS_URL}/items/${patchCollection}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return json(data, res.status);
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // HANDLE GET
  try {
    if (scope === "suppliers") {
      const data = await fetchDirectus("/items/suppliers", {
        fields: "id,supplier_name,supplier_shortcut",
        "filter[isActive][_eq]": "1",
        "filter[supplier_type][_eq]": "TRADE",
        limit: "-1",
        sort: "supplier_name",
      });
      return json({ data });
    } else if (scope === "barcode_type") {
      const data = await fetchDirectus("/items/barcode_type", {
        fields: "id,name",
        "filter[is_active][_eq]": "1",
        limit: "-1",
      });
      return json({ data });
    } else if (scope === "weight_unit") {
      const data = await fetchDirectus("/items/weight_unit", {
        fields: "id,code,name",
        "filter[is_active][_eq]": "1",
        limit: "-1",
      });
      return json({ data });
    } else if (scope === "cbm_unit") {
      const data = await fetchDirectus("/items/cbm_unit", {
        fields: "id,code,name",
        "filter[is_active][_eq]": "1",
        limit: "-1",
      });
      return json({ data });
    } else if (scope === "bundles") {
      // Fetch ALL bundles without barcodes (no status filter — temporary)
      // Also fetch barcode_type ref data for server-side resolution
      const [bundles, barcodeTypes] = await Promise.all([
        fetchDirectus("/items/product_bundles", {
          fields: "id,bundle_sku,bundle_name,bundle_type_id.name,barcode_value,barcode_type_id,barcode_date,weight,weight_unit_id,cbm_length,cbm_width,cbm_height,cbm_unit_id,unit_of_measurement",
          "filter[barcode_value][_null]": "true",
          limit: "-1",
        }),
        fetchDirectus("/items/barcode_type", {
          fields: "id,name",
          "filter[is_active][_eq]": "1",
          limit: "-1",
        }),
      ]);

      // Build lookup map for barcode types
      const btMap = new Map<number, { id: number; name: string }>();
      barcodeTypes.forEach((bt: any) => btMap.set(bt.id, { id: bt.id, name: bt.name }));

      // Manually resolve barcode_type_id integers to objects
      const resolved = bundles.map((b: any) => ({
        ...b,
        barcode_type_id:
          typeof b.barcode_type_id === "number"
            ? btMap.get(b.barcode_type_id) || null
            : b.barcode_type_id || null,
      }));

      return json({ data: resolved });
    } else {
      // 1. Fetch Products (FIXED: product_code instead of sku_code)
      const productsPromise = fetchDirectus("/items/products", {
        fields:
          "product_id,product_name,barcode,barcode_date,description,product_code,product_category.category_name,unit_of_measurement.unit_name,unit_of_measurement.unit_shortcut",
        limit: "-1",
        "filter[isActive][_eq]": "1",
      });

      // 2. Fetch Junction Table for Suppliers
      const junctionPromise = fetchDirectus("/items/product_per_supplier", {
        fields:
          "product_id,supplier_id.id,supplier_id.supplier_name,supplier_id.supplier_shortcut",
        limit: "-1",
      });

      const [products, junction] = await Promise.all([
        productsPromise,
        junctionPromise,
      ]);

      // 3. Manual Merge: Attach Suppliers to Products
      const supplierMap = new Map<number, any[]>();

      junction.forEach((item: any) => {
        if (!item.product_id || !item.supplier_id) return;

        // Handle case where supplier_id is expanded (Object) vs not (Number)
        const supplierObj =
          typeof item.supplier_id === "object"
            ? item.supplier_id
            : { id: item.supplier_id, supplier_name: "Unknown" };

        const pid = item.product_id;
        if (!supplierMap.has(pid)) {
          supplierMap.set(pid, []);
        }

        // Push in the format the frontend expects: { supplier_id: {...} }
        supplierMap.get(pid)?.push({ supplier_id: supplierObj });
      });

      const mergedData = products.map((p: any) => ({
        ...p,
        product_per_supplier: supplierMap.get(p.product_id) || [],
      }));

      return json({ data: mergedData });
    }
  } catch (error: any) {
    console.error("Proxy Error:", error);
    return json({ error: error.message }, 500);
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, "GET");
}
export async function PATCH(req: NextRequest) {
  return proxyRequest(req, "PATCH");
}
