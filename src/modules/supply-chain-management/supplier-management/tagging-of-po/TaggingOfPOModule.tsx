// src/modules/supply-chain-management/supplier-management/tagging-of-po/TaggingOfPOModule.tsx
"use client";

import * as React from "react";

import type { TaggablePOListItem, TaggingPODetail } from "./types";

import * as provider from "./providers/taggingOfPoProvider";

import PurchaseOrderList from "./components/PurchaseOrderList";
import ProductTaggingPanel from "./components/ProductTaggingPanel";

function sumExpected(po: TaggingPODetail) {
    return po.items.reduce((a, b) => a + (Number(b.expectedQty) || 0), 0);
}
function sumTagged(po: TaggingPODetail) {
    return po.items.reduce((a, b) => a + (Number(b.taggedQty) || 0), 0);
}

export default function TaggingOfPOModule() {
    const [loadingList, setLoadingList] = React.useState(true);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [error, setError] = React.useState("");

    const [pos, setPos] = React.useState<TaggablePOListItem[]>([]);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [detail, setDetail] = React.useState<TaggingPODetail | null>(null);

    const refreshList = React.useCallback(async () => {
        try {
            setLoadingList(true);
            setError("");
            const data = await provider.fetchTaggablePOs();
            setPos(data);
        } catch (e: any) {
            setError(String(e?.message ?? e));
        } finally {
            setLoadingList(false);
        }
    }, []);

    React.useEffect(() => {
        refreshList();
    }, [refreshList]);

    const loadDetail = React.useCallback(async (id: string) => {
        try {
            setLoadingDetail(true);
            setError("");
            setDetail(null);
            const d = await provider.fetchTaggingPODetail(id);
            setDetail(d);
        } catch (e: any) {
            setError(String(e?.message ?? e));
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    const onTagItems = React.useCallback(
        (id: string) => {
            setSelectedId(id);
            loadDetail(id);
        },
        [loadDetail]
    );

    const onBack = React.useCallback(() => {
        setSelectedId(null);
        setDetail(null);
    }, []);

    const onDetailChange = React.useCallback((next: TaggingPODetail) => {
        setDetail(next);

        const totalItems = sumExpected(next);
        const taggedItems = sumTagged(next);

        setPos((prev) =>
            prev.map((x) => {
                if (x.id !== next.id) return x;
                const status = taggedItems >= totalItems ? "completed" : "tagging";
                return { ...x, totalItems, taggedItems, status };
            })
        );
    }, []);

    const onTagItem = React.useCallback(
        async (sku: string, rfid: string, strict: boolean) => {
            if (!selectedId) throw new Error("No PO selected.");
            const updated = await provider.tagItem({ poId: selectedId, sku, rfid, strict });
            onDetailChange(updated);
            return updated;
        },
        [selectedId, onDetailChange]
    );

    return (
        <div className="w-full min-w-0 space-y-4">
            {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {!selectedId ? (
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="text-2xl font-black">Purchase Orders</div>
                        <div className="text-sm text-muted-foreground">
                            Select a PO to begin the inbound process.
                        </div>
                    </div>

                    <PurchaseOrderList items={pos} loading={loadingList} onTagItems={onTagItems} />
                </div>
            ) : (
                <ProductTaggingPanel
                    po={detail}
                    loading={loadingDetail}
                    onBack={onBack}
                    onChange={onDetailChange}
                    onTagItem={onTagItem}
                />
            )}
        </div>
    );
}
