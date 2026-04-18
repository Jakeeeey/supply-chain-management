import { NextResponse } from "next/server";

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

function directusHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getDirectusToken()}`,
    };
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { ...directusHeaders(), ...(init?.headers as Record<string, string> | undefined) },
        cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        const errors = json?.errors as Array<{ message: string }> | undefined;
        const msg = errors?.[0]?.message || (json?.error as string) || `Directus error ${res.status} ${res.statusText}`;
        throw new Error(msg);
    }
    return json as T;
}


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Robust relational calculation.
 * If multiple lines exist, they compound: 1 - Π(1 - pi/100)
 */
function calculateDiscountFromLines(lines: any[]): number {
    if (!lines?.length) return 0;
    const factor = lines.reduce((acc, line) => {
        const p = Number(line?.line_id?.percentage ?? line?.percentage ?? 0);
        return acc * (1 - p / 100);
    }, 1);
    const total = (1 - factor) * 100;
    return Number(total.toFixed(4));
}

/**
 * Legacy regex fallback
 */
function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;
    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? [])
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);
    if (!nums.length) return 0;
    const factor = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    return Number(((1 - factor) * 100).toFixed(4));
}

export async function GET() {
    try {
        const base = getDirectusBase();
        
        // Expansion: line_per_discount_type -> line_id -> *
        const fields = encodeURIComponent("id,discount_type,total_percent,line_per_discount_type.line_id.*");
        const url = `${base}/items/discount_type?limit=-1&fields=${fields}`;

        const json = await fetchJson<{ data: any[] }>(url);

        const mapped = (json?.data ?? []).map((d) => {
            const rawPct = Number.parseFloat(String(d?.total_percent ?? "0")) || 0;
            const lines = d?.line_per_discount_type ?? [];
            
            // Priority:
            // 1. Relational lines calculation
            // 2. Explicit total_percent field
            // 3. Regex parsing from label
            let computed = 0;
            if (lines.length > 0) {
                computed = calculateDiscountFromLines(lines);
            } else if (rawPct > 0) {
                computed = rawPct;
            } else {
                computed = deriveDiscountPercentFromCode(String(d?.discount_type ?? ""));
            }

            return {
                id: d?.id,
                name: d?.discount_type,
                percent: computed,
                lines: lines.map((l: any) => ({
                    id: l?.line_id?.id,
                    description: l?.line_id?.description,
                    percentage: Number(l?.line_id?.percentage ?? 0),
                })),
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
