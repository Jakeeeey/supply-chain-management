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
        "filter[supplier_type][_eq]": "TRADE",
        limit: "-1",
        sort: "supplier_name",
      });
      return json({ data });
    }

    if (scope === "bundles") {
      // Fetch ALL bundles WITH barcodes (no status filter — temporary)
      // Also fetch barcode_type ref data for server-side resolution
      const [bundles, barcodeTypes] = await Promise.all([
        fetchDirectus("/items/product_bundles", {
          fields: [
            "id",
            "bundle_sku",
            "bundle_name",
            "bundle_type_id.name",
            "barcode_value",
            "barcode_type_id",
            "barcode_date",
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
            "unit_of_measurement",
          ].join(","),
          "filter[barcode_value][_nempty]": "true",
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
    }

    if (scope === "history") {
      // Fetch bundles, products, and barcode types in parallel
      const [bundles, products, barcodeTypes] = await Promise.all([
        fetchDirectus("/items/product_bundles", {
          fields: [
            "id", "bundle_sku", "bundle_name", "barcode_value",
            "barcode_type_id",
            "barcode_date", "updated_by", "updated_at",
          ].join(","),
          "filter[barcode_value][_nempty]": "true",
          limit: "-1",
        }),
        fetchDirectus("/items/products", {
          fields: [
            "product_id", "product_code", "product_name", "barcode",
            "barcode_type_id.id", "barcode_type_id.name",
            "barcode_date", "updated_by", "updated_at",
          ].join(","),
          "filter[barcode][_nempty]": "true",
          "filter[isActive][_eq]": "1",
          limit: "-1",
        }),
        fetchDirectus("/items/barcode_type", {
          fields: "id,name",
          limit: "-1",
        }),
      ]);

      // Build a barcode type lookup map for resolving plain int IDs (bundles)
      const barcodeTypeMap = new Map<number, string>();
      barcodeTypes.forEach((bt: any) => barcodeTypeMap.set(bt.id, bt.name));

      // Helper: normalize barcode_type_id to { id, name } object
      const resolveBarcodeType = (raw: any) => {
        if (raw && typeof raw === "object" && raw.id) return raw; // already resolved (products)
        if (typeof raw === "number" && barcodeTypeMap.has(raw)) {
          return { id: raw, name: barcodeTypeMap.get(raw) };
        }
        return null;
      };

      // Normalize both into a unified shape
      const normalizedBundles = bundles.map((b: any) => ({
        id: `bundle-${b.id}`,
        sku_code: b.bundle_sku,
        name: b.bundle_name,
        barcode_value: b.barcode_value,
        barcode_type_id: resolveBarcodeType(b.barcode_type_id),
        barcode_date: b.barcode_date,
        updated_by: b.updated_by,
        updated_at: b.updated_at,
        record_type: "Bundle",
      }));

      const normalizedProducts = products.map((p: any) => ({
        id: `product-${p.product_id}`,
        sku_code: p.product_code,
        name: p.product_name,
        barcode_value: p.barcode,
        barcode_type_id: resolveBarcodeType(p.barcode_type_id),
        barcode_date: p.barcode_date,
        updated_by: p.updated_by,
        updated_at: p.updated_at,
        record_type: "Regular",
      }));

      // Merge and sort by updated_at descending
      const merged = [...normalizedBundles, ...normalizedProducts].sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      });

      // Collect unique user IDs and resolve names from the user table
      const userIds = [...new Set(merged.map((r) => r.updated_by).filter(Boolean))] as number[];
      let userMap = new Map<number, { first_name: string; last_name: string }>();

      if (userIds.length > 0) {
        try {
          const users = await fetchDirectus("/items/user", {
            fields: "user_id,user_fname,user_lname",
            "filter[user_id][_in]": userIds.join(","),
            limit: "-1",
          });
          users.forEach((u: any) => userMap.set(u.user_id, {
            first_name: u.user_fname || "",
            last_name: u.user_lname || "",
          }));
        } catch {
          // If user table is inaccessible, fall back to showing IDs
        }
      }

      // Merge user names into records
      const data = merged.map((r) => ({
        ...r,
        updated_by: r.updated_by && userMap.has(r.updated_by)
          ? { id: r.updated_by, ...userMap.get(r.updated_by) }
          : r.updated_by
            ? { id: r.updated_by, first_name: "User", last_name: `#${r.updated_by}` }
            : null,
      }));

      return json({ data });
    }

    if (scope === "bundle_items") {
      const bundleId = url.searchParams.get("bundle_id");
      if (!bundleId) return json({ error: "bundle_id required" }, 400);

      const data = await fetchDirectus("/items/product_bundle_items", {
        fields: "id,quantity,product_id.product_id,product_id.product_code,product_id.product_name",
        "filter[bundle_id][_eq]": bundleId,
        limit: "-1",
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
        "filter[barcode][_nempty]": "true",
        "filter[product_code][_nempty]": "true",
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
