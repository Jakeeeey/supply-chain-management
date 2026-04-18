import { NextResponse } from "next/server";
import { getDirectusBase, getDirectusToken } from "@/modules/supply-chain-management/supplier-management/purchase-order-posting/providers/fetchProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same logic as utils/deriveDiscountPercentFromCode (server-safe copy)
 * Sequential: total = 1 - Π(1 - pi/100)
 */
function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();

    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;

    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? [])
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);

    if (!nums.length) return 0;

    const netFactor = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    const combined = (1 - netFactor) * 100;

    return Math.max(0, Math.min(100, Number(combined.toFixed(4))));
}

export async function GET() {
    try {
        const base = getDirectusBase();
        const TOKEN = getDirectusToken();

        const url = `${base}/items/discount_type?limit=-1&fields=id,discount_type,total_percent`;

        const res = await fetch(url, {
            cache: "no-store",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return NextResponse.json(
                { error: `Directus error ${res.status} ${res.statusText}`, details: text },
                { status: 500 }
            );
        }

        const json = await res.json();

        // ✅ ensure total_percent is usable (ACE promo already computed in DB)
        const mapped = (json?.data ?? []).map((d: Record<string, unknown>) => {
            const rawPct = Number.parseFloat(String(d?.total_percent ?? "0")) || 0;
            const code = String(d?.discount_type ?? "");
            const computed = rawPct > 0 ? rawPct : deriveDiscountPercentFromCode(code);

            return {
                id: d?.id,
                discount_type: d?.discount_type,
                total_percent: computed,
            };
        });

        return NextResponse.json({ data: mapped });
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json(
            { error: "Failed to fetch discount types", details: String(error?.message ?? error) },
            { status: 500 }
        );
    }
}
