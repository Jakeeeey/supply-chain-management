// src/app/api/suppliers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusHeaders } from "@/modules/supply-chain-management/supplier-management/purchase-order-creation/providers/fetchProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildUpstreamHeaders(): Record<string, string> {
    return directusHeaders();
}

export async function GET(req: NextRequest) {
    try {
        const base = getDirectusBase();
        const url = new URL(req.url);

        const limit = url.searchParams.get("limit") ?? "-1";

        const upstreamUrl = new URL(`${base}/items/suppliers`);
        upstreamUrl.searchParams.set("limit", limit);
        
        // Filter active suppliers and specific types
        upstreamUrl.searchParams.set("filter[isActive][_eq]", "1");
        upstreamUrl.searchParams.set("filter[supplier_type][_in]", "TRADE,NON-TRADE");

        const res = await fetch(upstreamUrl.toString(), {
            headers: buildUpstreamHeaders(),
            cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: "Upstream suppliers fetch failed", details: json },
                { status: res.status }
            );
        }

        // Return the active trade and non-trade suppliers
        return NextResponse.json({ data: json.data ?? [] });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json(
            { error: "Suppliers route failed", details: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
