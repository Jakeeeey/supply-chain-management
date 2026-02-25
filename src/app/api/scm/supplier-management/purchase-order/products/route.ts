import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDirectusBase() {
    const raw =
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        "http://100.110.197.61:8056";

    if (!/^https?:\/\//i.test(raw)) return `http://${raw}`;
    return raw.replace(/\/$/, "");
}

function buildUpstreamHeaders(req: NextRequest) {
    const h: Record<string, string> = { "Content-Type": "application/json" };

    const envToken = process.env.DIRECTUS_TOKEN;
    if (envToken) {
        h.Authorization = `Bearer ${envToken}`;
        return h;
    }

    const incomingAuth = req.headers.get("authorization");
    if (incomingAuth) h.Authorization = incomingAuth;

    return h;
}

function unique<T>(arr: T[]) {
    return Array.from(new Set(arr));
}

export async function GET(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const url = new URL(req.url);

        const supplierId = url.searchParams.get("supplierId");
        const idsParam = url.searchParams.get("ids");
        const limit = url.searchParams.get("limit") ?? "-1";

        const headers = buildUpstreamHeaders(req);

        // 1) If supplierId provided: fetch product_per_supplier then fetch products
        if (supplierId) {
            const linksUrl =
                `${base}/items/product_per_supplier` +
                `?limit=-1` +
                `&filter[supplier_id][_eq]=${encodeURIComponent(supplierId)}` +
                `&fields=id,product_id,supplier_id,discount_type`;

            const linksRes = await fetch(linksUrl, { headers, cache: "no-store" });
            const linksJson = await linksRes.json().catch(() => ({}));

            if (!linksRes.ok) {
                return NextResponse.json(
                    { error: "Upstream product_per_supplier fetch failed", details: linksJson },
                    { status: linksRes.status }
                );
            }

            const links = linksJson.data ?? [];

            const productIds = unique(
                links
                    .map((x: any) => x?.product_id)
                    .filter((v: any) => v !== null && v !== undefined)
                    .map((v: any) => String(v))
            );

            if (productIds.length === 0) return NextResponse.json({ data: [] });

            // Map product_id -> discount_type (FIXED)
            const discountByProductId = new Map<string, any>();
            for (const l of links) {
                const pid = String(l?.product_id ?? "");
                if (!pid) continue;
                discountByProductId.set(pid, l?.discount_type ?? null);
            }

            const productsUrl =
                `${base}/items/products?limit=-1&filter[product_id][_in]=${encodeURIComponent(
                    productIds.join(",")
                )}`;

            const prodRes = await fetch(productsUrl, { headers, cache: "no-store" });
            const prodJson = await prodRes.json().catch(() => ({}));

            if (!prodRes.ok) {
                return NextResponse.json(
                    { error: "Upstream products fetch failed", details: prodJson },
                    { status: prodRes.status }
                );
            }

            const rows = (prodJson.data ?? []).map((p: any) => {
                const pid = String(p?.product_id ?? p?.id ?? "");
                return {
                    ...p,
                    // ✅ Attach discount_type from product_per_supplier
                    discount_type: discountByProductId.get(pid) ?? null,
                };
            });

            return NextResponse.json({ data: rows });
        }

        // 2) If ids provided: fetch products by ids
        if (idsParam) {
            const ids = unique(
                idsParam
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
            );

            if (ids.length === 0) return NextResponse.json({ data: [] });

            const productsUrl =
                `${base}/items/products?limit=-1&filter[product_id][_in]=${encodeURIComponent(
                    ids.join(",")
                )}`;

            const prodRes = await fetch(productsUrl, { headers, cache: "no-store" });
            const prodJson = await prodRes.json().catch(() => ({}));

            if (!prodRes.ok) {
                return NextResponse.json(
                    { error: "Upstream products fetch failed", details: prodJson },
                    { status: prodRes.status }
                );
            }

            return NextResponse.json({ data: prodJson.data ?? [] });
        }

        // 3) fallback: all products
        const upstream = `${base}/items/products?limit=${encodeURIComponent(limit)}`;
        const res = await fetch(upstream, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: "Upstream products fetch failed", details: json },
                { status: res.status }
            );
        }

        return NextResponse.json({ data: json.data ?? [] });
    } catch (err: any) {
        return NextResponse.json(
            { error: "Products route failed", details: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
