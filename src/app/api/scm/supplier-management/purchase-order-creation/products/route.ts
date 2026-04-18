import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusHeaders } from "@/modules/supply-chain-management/supplier-management/utils/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildUpstreamHeaders(): Record<string, string> {
    return directusHeaders();
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

        const headers = buildUpstreamHeaders();

        // 0) Fetch all units for robust mapping
        const unitsUrl = `${base}/items/units?limit=-1&fields=unit_id,unit_name,unit_shortcut`;
        const unitsRes = await fetch(unitsUrl, { headers, cache: "no-store" });
        const unitsJson = await unitsRes.json().catch(() => ({}));
        const units = unitsJson.data ?? [];
        const unitsMap = new Map<number, any>();
        for (const u of units) {
            const uid = Number(u?.unit_id || u?.id);
            if (uid) unitsMap.set(uid, u);
        }

        const resolveUom = (p: any) => {
            const rawUom = p?.unit_of_measurement;
            const uomId = Number(typeof rawUom === "object" ? rawUom?.unit_id ?? rawUom?.id : rawUom);
            if (uomId && unitsMap.has(uomId)) {
                return unitsMap.get(uomId);
            }
            return rawUom; // Fallback to raw if not in map
        };

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
                    .map((x: Record<string, unknown>) => x?.product_id)
                    .filter((v: unknown) => v !== null && v !== undefined)
                    .map((v: unknown) => String(v))
            );

            if (productIds.length === 0) return NextResponse.json({ data: [] });

            // Map product_id -> discount_type (FIXED)
            const discountByProductId = new Map<string, unknown>();
            for (const l of links) {
                const pid = String(l?.product_id ?? "");
                if (!pid) continue;
                discountByProductId.set(pid, l?.discount_type ?? null);
            }

            const productsUrl =
                `${base}/items/products?limit=-1&fields=*,product_category.*,product_brand.*&filter[product_id][_in]=${encodeURIComponent(
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

            const rows = (prodJson.data ?? []).map((p: Record<string, unknown>) => {
                const pid = String(p?.product_id ?? p?.id ?? "");
                return {
                    ...p,
                    // ✅ Map UOM robustly
                    unit_of_measurement: resolveUom(p),
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
                `${base}/items/products?limit=-1&fields=*,product_category.*,product_brand.*&filter[product_id][_in]=${encodeURIComponent(
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

            const rows = (prodJson.data ?? []).map((p: any) => ({
                ...p,
                unit_of_measurement: resolveUom(p),
            }));

            return NextResponse.json({ data: rows });
        }

        // 3) fallback: all products
        const upstream = `${base}/items/products?limit=${encodeURIComponent(limit)}&fields=*,product_category.*,product_brand.*`;
        const res = await fetch(upstream, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: "Upstream products fetch failed", details: json },
                { status: res.status }
            );
        }

        return NextResponse.json({ data: json.data ?? [] });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json(
            { error: "Products route failed", details: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
