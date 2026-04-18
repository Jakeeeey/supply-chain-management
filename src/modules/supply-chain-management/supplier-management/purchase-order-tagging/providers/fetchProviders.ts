// src/modules/supply-chain-management/supplier-management/purchase-order-tagging/providers/fetchProviders.ts
import type { TaggablePOListItem, TaggingPODetail } from "../types";

const API = "/api/scm/supplier-management/purchase-order-tagging";

async function asJson(res: Response) {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        // keep exact message from API (409 will now be meaningful)
        throw new Error(json?.error ?? `Request failed (${res.status})`);
    }
    return json?.data;
}

export async function fetchTaggablePOs(): Promise<TaggablePOListItem[]> {
    const res = await fetch(API, { method: "GET" });
    return (await asJson(res)) ?? [];
}

export async function fetchTaggingPODetail(poId: string): Promise<TaggingPODetail> {
    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detail", poId }),
    });
    return await asJson(res);
}

export async function tagItem(opts: {
    poId: string;
    sku: string;
    rfid: string;
    strict: boolean;
}): Promise<TaggingPODetail> {
    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "tag_item",
            poId: opts.poId,
            sku: opts.sku,
            rfid: opts.rfid,
            strict: opts.strict,
        }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.error ?? `Request failed (${res.status})`);
    }

    // ✅ The tag_item endpoint now returns { success, message, updatedDetail }
    // Fall back to json?.data for backwards compatibility
    return (json?.updatedDetail ?? json?.data) as TaggingPODetail;
}

/**
 * ✅ Non-breaking helpers for UI
 * - Use these in your component to decide when to show global toast
 */
export function getTaggingProgress(detail: TaggingPODetail | null | undefined) {
    const items = detail?.items ?? [];
    const expectedTotal = items.reduce((sum, it) => sum + Math.max(0, Number(it?.expectedQty ?? 0)), 0);
    const taggedTotal = items.reduce((sum, it) => sum + Math.max(0, Number(it?.taggedQty ?? 0)), 0);

    // Remaining is per-line accurate (prevents “over-tagged” weirdness)
    const remainingTotal = items.reduce((sum, it) => {
        const exp = Math.max(0, Number(it?.expectedQty ?? 0));
        const tag = Math.max(0, Number(it?.taggedQty ?? 0));
        return sum + Math.max(0, exp - tag);
    }, 0);

    return {
        expectedTotal,
        taggedTotal,
        remainingTotal,
        itemsCount: items.length,
    };
}

export function isTaggingCompleted(detail: TaggingPODetail | null | undefined) {
    const items = detail?.items ?? [];
    if (!items.length) return false;

    // Completed means: every line reached expected qty (expectedQty > 0)
    return items.every((it) => {
        const exp = Math.max(0, Number(it?.expectedQty ?? 0));
        const tag = Math.max(0, Number(it?.taggedQty ?? 0));
        if (exp <= 0) return true; // don't block completion on invalid/zero expected
        return tag >= exp;
    });
}

// =============================================================================
// SERVER-SIDE DIRECTUS HELPERS (For API Routes)
// =============================================================================

export function getDirectusBase(): string {
    const raw =
        process.env.DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_DIRECTUS_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "";
    const cleaned = raw.trim().replace(/\/$/, "");
    if (!cleaned) {
        throw new Error(
            "DIRECTUS_URL is not set. Add it to .env.local and restart the dev server."
        );
    }
    return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
}

export function getDirectusToken(): string {
    const token = (
        process.env.DIRECTUS_STATIC_TOKEN ||
        process.env.DIRECTUS_TOKEN ||
        ""
    ).trim();
    if (!token) {
        throw new Error(
            "DIRECTUS_STATIC_TOKEN is not set. Add it to .env.local and restart the dev server."
        );
    }
    return token;
}

export function directusHeaders(): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getDirectusToken()}`,
    };
}

export async function directusFetch<T = any>(
    url: string,
    init?: RequestInit
): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: {
            ...directusHeaders(),
            ...(init?.headers as Record<string, string> | undefined),
        },
        cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        const errors = json?.errors as Array<{ message: string }> | undefined;
        const msg =
            errors?.[0]?.message ||
            (json?.error as string) ||
            `Directus responded ${res.status} ${res.statusText}`;
        throw new Error(msg);
    }
    return json as T;
}

export async function directusGet<T>(path: string): Promise<T> {
    const base = getDirectusBase();
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    return directusFetch(url, { method: "GET" });
}

export async function directusMutate<T>(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown
): Promise<T> {
    const base = getDirectusBase();
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    const options: RequestInit = { method };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }
    return directusFetch(url, options);
}
export async function updateTaggingStatus(poId: string, action: string) {
    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, poId }),
    });
    return await asJson(res);
}
