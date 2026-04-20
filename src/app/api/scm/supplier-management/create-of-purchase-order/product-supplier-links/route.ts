// ✅ FILE: src/app/api/scm/supplier-management/purchase-order/product-supplier-links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, getDirectusToken } from "@/modules/supply-chain-management/supplier-management/utils/directus";

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
        return NextResponse.json({ data: json?.data ?? [] });
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json(
            { error: "Failed to fetch product-supplier-links", details: String(error?.message ?? error) },
            { status: 500 }
        );
    }
}
