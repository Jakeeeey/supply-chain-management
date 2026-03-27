// src/modules/supply-chain-management/supplier-management/tagging-of-po/providers/taggingOfPoProvider.ts
import type { TaggablePOListItem, TaggingPODetail } from "../types";

const API = "/api/scm/supplier-management/tagging-of-po";

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
