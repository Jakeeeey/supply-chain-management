import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Prevent caching

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ACCESS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function json(res: unknown, status = 200) {
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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}


export async function GET(req: NextRequest) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");

  try {
    // ---------------------------------------------------------
    // 1. REFERENCE DATA (Strict Checks)
    // ---------------------------------------------------------
    if (scope === "timezone") {
      let tz = "Asia/Manila";
      try {
        const settings = (await fetchDirectus("/items/general_setting", {
          limit: "100",
        })) as { setting_key: string; setting_value: string }[] | undefined;
        const tzSetting = settings?.find((s) => s.setting_key === "time_zone");
        if (tzSetting?.setting_value) {
          tz = tzSetting.setting_value;
        }
      } catch (e) {
        console.warn("Failed to fetch timezone from general_setting, falling back to Asia/Manila", e);
      }
      return json({ data: tz });
    }

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
      barcodeTypes.forEach((bt: { id: number; name: string }) => btMap.set(bt.id, { id: bt.id, name: bt.name }));

      // Manually resolve barcode_type_id integers to objects
      const resolved = bundles.map((b: { barcode_type_id: number | { id: number; name: string } | null }) => ({
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
      barcodeTypes.forEach((bt: { id: number; name: string }) => barcodeTypeMap.set(bt.id, bt.name));

      // Helper: normalize barcode_type_id to { id, name } object
      const resolveBarcodeType = (raw: number | { id: number; name: string } | null) => {
        if (raw && typeof raw === "object" && raw.id) return raw; // already resolved (products)
        if (typeof raw === "number" && barcodeTypeMap.has(raw)) {
          return { id: raw, name: barcodeTypeMap.get(raw) };
        }
        return null;
      };

      // Normalize both into a unified shape
      const normalizedBundles = bundles.map((b: { id: number; bundle_sku: string; bundle_name: string; barcode_value: string; barcode_type_id: number | { id: number; name: string } | null; barcode_date: string; updated_by: number; updated_at: string }) => ({
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

      const normalizedProducts = products.map((p: { product_id: number; product_code: string; product_name: string; barcode: string; barcode_type_id: number | { id: number; name: string } | null; barcode_date: string; updated_by: number; updated_at: string }) => ({
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
      const userMap = new Map<number, { first_name: string; last_name: string }>();

      if (userIds.length > 0) {
        try {
          const users = await fetchDirectus("/items/user", {
            fields: "user_id,user_fname,user_lname",
            "filter[user_id][_in]": userIds.join(","),
            limit: "-1",
          });
          users.forEach((u: { user_id: number; user_fname: string; user_lname: string }) => userMap.set(u.user_id, {
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

      const supplierMap = new Map<number, { supplier_id: { id: number; supplier_name: string; supplier_shortcut?: string } }[]>();
      junction.forEach((item: { product_id: number; supplier_id: number | { id: number; supplier_name: string; supplier_shortcut?: string } }) => {
        if (!item.product_id || !item.supplier_id) return;
        const supplierObj =
          typeof item.supplier_id === "object"
            ? item.supplier_id
            : { id: item.supplier_id, supplier_name: "Unknown" };
        const pid = item.product_id;
        if (!supplierMap.has(pid)) supplierMap.set(pid, []);
        supplierMap.get(pid)?.push({ supplier_id: supplierObj });
      });

      const mergedData = products.map((p: { product_id: number }) => ({
        ...p,
        product_per_supplier: supplierMap.get(p.product_id) || [],
      }));

      return json({ data: mergedData });
    }

    // If scope is unknown, return error (Don't default to products!)
    return json({ error: `Invalid scope: ${scope}` }, 400);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Linking API Error:", err);
    return json({ error: err.message }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  if (!DIRECTUS_URL) return json({ error: "Missing Base URL" }, 500);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const recordType = url.searchParams.get("record_type") || "product";

  if (!id) return json({ error: "Product ID required" }, 400);

  try {
    const body = await req.json();

    // Extract user ID from JWT cookie for audit trail
    const token = req.cookies.get("vos_access_token")?.value;
    const jwtPayload = token ? decodeJwtPayload(token) : null;
    const userId = jwtPayload?.user_id ?? jwtPayload?.userId ?? jwtPayload?.sub ?? null;

    // Inject audit fields: user_id is int in both products and product_bundles
    if (userId) {
      const parsedUserId = typeof userId === "string" ? parseInt(userId, 10) : typeof userId === "number" ? userId : NaN;
      if (!Number.isNaN(parsedUserId)) {
        body.updated_by = parsedUserId;
      }
    }

    // Fetch timezone dynamically from database
    let tz = "Asia/Manila";
    try {
      const settings = (await fetchDirectus("/items/general_setting", {
        limit: "100",
      })) as { setting_key: string; setting_value: string }[] | undefined;
      const tzSetting = settings?.find((s) => s.setting_key === "time_zone");
      if (tzSetting?.setting_value) {
        tz = tzSetting.setting_value;
      }
    } catch (e) {
      console.warn("Failed to fetch timezone from general_setting, falling back to Asia/Manila", e);
    }

    // updated_at is datetime (YYYY-MM-DD HH:mm:ss or ISO without ms)
    body.updated_at = new Date().toLocaleString("sv-SE", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).replace(" ", "T");

    // barcode_date in DDL is 'date' (YYYY-MM-DD)
    if (body.barcode_date) {
      body.barcode_date = body.barcode_date.split("T")[0];
    } else {
      const nowFormatted = new Date().toLocaleString("sv-SE", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      body.barcode_date = nowFormatted;
    }

    // SERVER-SIDE UNIQUENESS CHECK: Query both products AND bundles for this barcode (excluding current record)
    const barcodeToCheck = recordType === "bundle" ? body.barcode_value : body.barcode;
    if (barcodeToCheck) {
      // Check products table (PK is product_id)
      const checkProductUrl = new URL(`${DIRECTUS_URL}/items/products`);
      checkProductUrl.searchParams.append("fields", "product_id,product_name,barcode");
      checkProductUrl.searchParams.append("filter[barcode][_eq]", barcodeToCheck);
      checkProductUrl.searchParams.append("filter[isActive][_eq]", "1");
      if (recordType !== "bundle") {
        checkProductUrl.searchParams.append("filter[product_id][_neq]", id);
      }
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

      // Check bundles table (PK is id)
      const checkBundleUrl = new URL(`${DIRECTUS_URL}/items/product_bundles`);
      checkBundleUrl.searchParams.append("fields", "id,bundle_name,barcode_value");
      checkBundleUrl.searchParams.append("filter[barcode_value][_eq]", barcodeToCheck);
      if (recordType === "bundle") {
        checkBundleUrl.searchParams.append("filter[id][_neq]", id);
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
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: err.message }, 500);
  }
}
