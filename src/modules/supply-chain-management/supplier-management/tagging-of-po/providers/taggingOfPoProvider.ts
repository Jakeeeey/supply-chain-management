// src/modules/supply-chain-management/supplier-management/tagging-of-po/providers/taggingOfPoProvider.ts
import type { TaggablePOListItem, TaggingPODetail } from "../types";

const API = "/api/scm/supplier-management/tagging-of-po";

async function asJson(res: Response) {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
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
    return await asJson(res);
}
