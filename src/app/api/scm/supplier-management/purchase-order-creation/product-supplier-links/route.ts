import { NextRequest, NextResponse } from "next/server";

// =====================
// DIRECTUS HELPERS
// =====================
function getDirectusBase(): string {
    const raw = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const cleaned = raw.trim().replace(/\/$/, "");
    if (!cleaned) throw new Error("DIRECTUS_URL is not set.");
    return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
}

function getDirectusToken(): string {
    const token = (process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();
    if (!token) throw new Error("DIRECTUS_STATIC_TOKEN is not set.");
    return token;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns Directus product_per_supplier rows filtered by supplier_id
 * Example directus:
 *   /items/product_per_supplier?filter[supplier_id][_eq]=25&fields=product_id,supplier_id,discount_type,id&limit=-1
 *
 * Client calls:
 *   /api/scm/supplier-management/purchase-order/product-supplier-links?supplierId=25
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const supplierId = searchParams.get("supplierId");

        if (!supplierId) {
            return NextResponse.json({ data: [] });
        }

        const base = getDirectusBase();
        const TOKEN = getDirectusToken();

        const url =
            `${base}/items/product_per_supplier` +
            `?filter[supplier_id][_eq]=${encodeURIComponent(supplierId)}` +
            `&fields=id,product_id,supplier_id,discount_type` +
            `&limit=-1`;

        const res = await fetch(url, {
            cache: "no-store",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return NextResponse.json(
                {
                    error: `Directus error ${res.status} ${res.statusText}`,
                    details: text,
                    url,
                },
                { status: 500 }
            );
        }

        const json = await res.json();
        const links = json?.data ?? [];
        if (links.length === 0) return NextResponse.json({ data: [] });

        // ✅ Family Logic: Ensure siblings get the same discount link
        const linkedProductIds = Array.from(new Set(links.map((l: any) => String(l.product_id)).filter(Boolean)));

        // 1) Find Roots
        const initialUrl = `${base}/items/products?limit=-1&fields=product_id,parent_id&filter[product_id][_in]=${encodeURIComponent(linkedProductIds.join(","))}`;
        const initialRes = await fetch(initialUrl, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` }, cache: "no-store" });
        const initialJson = await initialRes.json().catch(() => ({}));
        const initialProducts = initialJson.data ?? [];
        const rootIds = Array.from(new Set(initialProducts.map((p: any) => String(p.parent_id || p.product_id)).filter(Boolean)));

        if (rootIds.length === 0) return NextResponse.json({ data: [] });

        // 2) Find All Family Members that are Box (UOM 11)
        const familyFilter = {
            _and: [
                {
                    _or: [
                        { product_id: { _in: rootIds } },
                        { parent_id: { _in: rootIds } }
                    ]
                },
                { unit_of_measurement: { _eq: 11 } }
            ]
        };
        const familyUrl = `${base}/items/products?limit=-1&fields=product_id,parent_id&filter=${encodeURIComponent(JSON.stringify(familyFilter))}`;
        const familyRes = await fetch(familyUrl, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` }, cache: "no-store" });
        const familyJson = await familyRes.json().catch(() => ({}));
        const familyProducts = familyJson.data ?? [];

        // 3) Build Synthetic Links
        const discountByRootId = new Map<string, any>();
        for (const l of links) {
            const pid = String(l.product_id);
            const pInfo = initialProducts.find((p: any) => String(p.product_id) === pid);
            if (pInfo) {
                const rid = String(pInfo.parent_id || pInfo.product_id);
                if (!discountByRootId.has(rid)) discountByRootId.set(rid, l.discount_type);
            }
        }

        const syntheticLinks = familyProducts.map((p: any) => {
            const pid = Number(p.product_id);
            const rid = String(p.parent_id || p.product_id);
            const exact = links.find((l: any) => Number(l.product_id) === pid);
            
            return {
                id: exact?.id || `synth-${pid}`,
                product_id: pid,
                supplier_id: Number(supplierId),
                discount_type: exact?.discount_type ?? discountByRootId.get(rid) ?? null
            };
        });

        return NextResponse.json({ data: syntheticLinks });
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json(
            { error: "Failed to fetch product-supplier-links", details: String(error?.message ?? error) },
            { status: 500 }
        );
    }
}
