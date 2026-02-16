// src/modules/supply-chain-management/supplier-management/tagging-of-po/TaggingOfPOModule.tsx
"use client";

import * as React from "react";
import * as Toast from "@radix-ui/react-toast";
import { X } from "lucide-react";

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

function isDuplicateRfidMessage(msg: string) {
    const m = (msg || "").toLowerCase();
    // match common backend messages
    return (
        (m.includes("rfid") && m.includes("already")) ||
        m.includes("already exists in receiving items") ||
        m.includes("rfid already exists")
    );
}

export default function TaggingOfPOModule() {
    const [loadingList, setLoadingList] = React.useState(true);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [error, setError] = React.useState("");

    const [pos, setPos] = React.useState<TaggablePOListItem[]>([]);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [detail, setDetail] = React.useState<TaggingPODetail | null>(null);

    // keep latest detail for safe fallback return on errors
    const detailRef = React.useRef<TaggingPODetail | null>(null);
    React.useEffect(() => {
        detailRef.current = detail;
    }, [detail]);

    // ✅ local toast inside module (safe for ERP submodule)
    const [toastOpen, setToastOpen] = React.useState(false);
    const [toastKey, setToastKey] = React.useState(0);
    const [toastTitle, setToastTitle] = React.useState("");
    const [toastDesc, setToastDesc] = React.useState("");

    const notify = React.useCallback((title: string, desc?: string) => {
        setToastTitle(title);
        setToastDesc(desc ?? "");
        setToastKey((k) => k + 1); // force restart animation if same toast repeated
        setToastOpen(true);
    }, []);

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
            detailRef.current = d;
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
        detailRef.current = null;
    }, []);

    const onDetailChange = React.useCallback((next: TaggingPODetail) => {
        setDetail(next);
        detailRef.current = next;

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
            if (!selectedId) {
                // keep old behavior but no crash
                const msg = "No PO selected.";
                setError(msg);
                notify("Cannot tag item", msg);
                // return whatever we have so UI won't break
                return (
                    detailRef.current ??
                    (await provider.fetchTaggingPODetail(String(selectedId)).catch(() => null)) ??
                    ({} as TaggingPODetail)
                );
            }

            try {
                setError("");
                const updated = await provider.tagItem({
                    poId: selectedId,
                    sku,
                    rfid,
                    strict,
                });

                onDetailChange(updated);
                return updated;
            } catch (e: any) {
                const msg = String(e?.message ?? e ?? "");

                // ✅ Duplicate RFID: notify only, no hard error UI
                if (isDuplicateRfidMessage(msg)) {
                    notify(
                        "RFID already exists",
                        "This RFID is already registered. Please attach another RFID for uniqueness of the products."
                    );

                    // do NOT setError (no red banner), just return current detail so UI stays stable
                    return (
                        detailRef.current ??
                        (await provider.fetchTaggingPODetail(selectedId).catch(() => null)) ??
                        ({} as TaggingPODetail)
                    );
                }

                // other errors: keep existing banner + also toast
                setError(msg || "Tagging failed.");
                notify("Tagging failed", msg || "Please try again.");

                return (
                    detailRef.current ??
                    (await provider.fetchTaggingPODetail(selectedId).catch(() => null)) ??
                    ({} as TaggingPODetail)
                );
            }
        },
        [selectedId, onDetailChange, notify]
    );

    return (
        <Toast.Provider swipeDirection="right">
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

                        <PurchaseOrderList
                            items={pos}
                            loading={loadingList}
                            onTagItems={onTagItems}
                        />
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

            {/* ✅ Module-scoped Toast (shadcn-style, no global changes) */}
            <Toast.Root
                key={toastKey}
                open={toastOpen}
                onOpenChange={setToastOpen}
                duration={3500}
                className="relative flex w-[360px] items-start gap-3 rounded-xl border border-border bg-background p-4 shadow-lg"
            >
                <div className="min-w-0 flex-1">
                    <Toast.Title className="text-sm font-semibold text-foreground">
                        {toastTitle}
                    </Toast.Title>
                    {toastDesc ? (
                        <Toast.Description className="mt-1 text-sm text-muted-foreground">
                            {toastDesc}
                        </Toast.Description>
                    ) : null}
                </div>

                <Toast.Close asChild>
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </Toast.Close>
            </Toast.Root>

            <Toast.Viewport className="fixed right-4 top-4 z-[9999] flex max-h-screen w-[360px] flex-col gap-2 outline-none" />
        </Toast.Provider>
    );
}
