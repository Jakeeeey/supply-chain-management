// src/modules/supply-chain-management/supplier-management/purchase-order-tagging/TaggingOfPOModule.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import type { TaggablePOListItem, TaggingPODetail } from "./types";
import * as provider from "./providers/fetchProviders";

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
    return (
        m.includes("cannot be duplicate") ||
        (m.includes("rfid") && m.includes("already")) ||
        m.includes("already exists") ||
        m.includes("has to be unique") ||
        m.includes("unique")
    );
}

// ✅ RFID rules: exactly 24 hex chars
const RFID_LEN = 24;

/**
 * Normalize raw RFID input:
 * - Uppercase
 * - Extract the FIRST valid 24+ hex sequence (EPC), take first 24 chars
 * - If multiple EPCs exist in the raw string, we still return the first (to prevent multi-store)
 */
function normalizeRfidInput(raw: string): { rfid: string; hadMultiple: boolean } {
    const up = String(raw ?? "").trim().toUpperCase();

    // Find all sequences of hex length >= 24 (covers multiple tags separated by whitespace/newlines)
    const matches = up.match(/[0-9A-F]{24,}/g) ?? [];
    if (matches.length > 0) {
        const first = matches[0]!.slice(0, RFID_LEN);
        return { rfid: first, hadMultiple: matches.length > 1 };
    }

    // Fallback: strip non-hex and slice
    const cleaned = up.replace(/[^0-9A-F]/g, "");
    const sliced = cleaned.slice(0, RFID_LEN);
    return { rfid: sliced, hadMultiple: cleaned.length > RFID_LEN };
}

function findItemBySku(detail: TaggingPODetail | null, sku: string) {
    if (!detail) return null;
    const key = String(sku ?? "").trim().toLowerCase();
    if (!key) return null;
    return detail.items.find((it) => String(it.sku ?? "").trim().toLowerCase() === key) ?? null;
}

export default function TaggingOfPOModule() {
    const [loadingList, setLoadingList] = React.useState(true);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [error, setError] = React.useState("");

    const [searchQuery, setSearchQuery] = React.useState("");
    const [pos, setPos] = React.useState<TaggablePOListItem[]>([]);
    
    // ✅ Filtered list based on search
    const filteredPos = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return pos;
        return pos.filter((x) => {
            const poNo = String(x?.poNumber ?? "").toLowerCase();
            const sid = String(x?.supplierName ?? "").toLowerCase();
            const stat = String(x?.status ?? "").toLowerCase();
            return poNo.includes(q) || sid.includes(q) || stat.includes(q);
        });
    }, [pos, searchQuery]);

    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [detail, setDetail] = React.useState<TaggingPODetail | null>(null);

    // keep latest detail for safe fallback return on errors
    const detailRef = React.useRef<TaggingPODetail | null>(null);
    React.useEffect(() => {
        detailRef.current = detail;
    }, [detail]);

    // ✅ Prevent burst/multiple saves: lock per PO+SKU while request is in-flight
    const inFlightLocksRef = React.useRef<Set<string>>(new Set());

    const refreshList = React.useCallback(async () => {
        try {
            setLoadingList(true);
            setError("");
            const data = await provider.fetchTaggablePOs();
            setPos(data);
        } catch (e: unknown) {
            const msg = String((e as Error)?.message ?? e);
            if (msg.trim().toLowerCase() !== "fetch failed") {
                setError(msg);
            }
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
        } catch (e: unknown) {
            const msg = String((e as Error)?.message ?? e);
            if (msg.trim().toLowerCase() !== "fetch failed") {
                setError(msg);
            }
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
        async (sku: string, rfidRaw: string, strict: boolean) => {
            // Normalize RFID to FIRST valid 24-hex EPC only
            const { rfid, hadMultiple } = normalizeRfidInput(rfidRaw);

            if (!selectedId) {
                const msg = "No PO selected.";
                setError(msg);
                toast.error("Cannot tag item", { description: msg });
                return detailRef.current ?? ({} as TaggingPODetail);
            }

            // ✅ If scanner sent multiple tags, we keep ONLY the first (no multi-store)
            if (hadMultiple) {
                toast.warning("Multiple RFID detected", {
                    description: `Only the first RFID will be used. RFID must be exactly ${RFID_LEN} hex characters.`,
                });
            }

            // ✅ RFID must be exactly 24 hex chars
            if (!rfid || rfid.length !== RFID_LEN) {
                toast.error("Invalid RFID", {
                    description: `RFID must be exactly ${RFID_LEN} hexadecimal characters (example: E280F30200000000F1EACFA1).`,
                });
                return detailRef.current ?? ({} as TaggingPODetail);
            }

            // ✅ Client-side qty cap (no API call)
            const cur = detailRef.current;
            const item = findItemBySku(cur, sku);
            if (item && Number(item.taggedQty) >= Number(item.expectedQty)) {
                toast.info("Limit reached", {
                    description: "Tagging exceeds expected quantity for this SKU. You cannot add more RFID tags.",
                });
                return detailRef.current ?? ({} as TaggingPODetail);
            }

            // ✅ Burst protection: only 1 request per PO+SKU at a time
            const lockKey = `${selectedId}::${String(sku ?? "").trim().toLowerCase()}`;
            if (inFlightLocksRef.current.has(lockKey)) {
                return detailRef.current ?? ({} as TaggingPODetail);
            }

            inFlightLocksRef.current.add(lockKey);

            // ✅ CLIENT-SIDE OPTIMISTIC UPDATE — update UI immediately, before API responds
            if (cur) {
                const optimistic: TaggingPODetail = {
                    ...cur,
                    items: cur.items.map((it) =>
                        it.sku.toLowerCase() === sku.trim().toLowerCase()
                            ? { ...it, taggedQty: Math.min(it.taggedQty + 1, it.expectedQty) }
                            : it
                    ),
                    activity: [
                        {
                            id: `optimistic-${Date.now()}`,
                            sku,
                            productName: item?.name ?? sku,
                            rfid,
                            time: "Just Now",
                        },
                        ...cur.activity,
                    ].slice(0, 50),
                };
                onDetailChange(optimistic);
            }

            try {
                setError("");
                const serverDetail = await provider.tagItem({
                    poId: selectedId,
                    sku,
                    rfid,
                    strict,
                });

                // ✅ Merge: take the MAXIMUM taggedQty between client optimistic and server state
                // This prevents the server's stale Directus response from rolling back our count
                if (serverDetail && detailRef.current) {
                    const merged: TaggingPODetail = {
                        ...serverDetail,
                        items: serverDetail.items.map((serverItem) => {
                            const localItem = detailRef.current!.items.find(
                                (it) => it.sku === serverItem.sku
                            );
                            return localItem
                                ? { ...serverItem, taggedQty: Math.max(serverItem.taggedQty, localItem.taggedQty) }
                                : serverItem;
                        }),
                        activity: serverDetail.activity.length > 0
                            ? serverDetail.activity
                            : detailRef.current.activity,
                    };
                    onDetailChange(merged);
                    const product = findItemBySku(merged, sku);
                    toast.success("Item tagged successfully", {
                        description: product ? product.name : `SKU: ${sku}`,
                    });
                    return merged;
                }

                onDetailChange(serverDetail);
                return serverDetail;
            } catch (e: unknown) {
                const msg = String((e as Error)?.message ?? e ?? "");

                if (isDuplicateRfidMessage(msg)) {
                    toast.error("Already tagged, please tag another.");
                    // ✅ Roll back the optimistic update — it was a duplicate
                    if (cur) onDetailChange(cur);
                    return detailRef.current ?? ({} as TaggingPODetail);
                } else {
                    setError(msg || "Tagging failed.");
                    toast.error("Tagging failed", { description: msg || "Please try again." });
                    // ✅ Roll back on hard errors too
                    if (cur) onDetailChange(cur);
                }

                throw e;
            } finally {
                inFlightLocksRef.current.delete(lockKey);
            }
        },
        [selectedId, onDetailChange]
    );


    async function onSendPartiallyTagged() {
        if (!selectedId) return;
        try {
            setLoadingDetail(true);
            const data = await provider.updateTaggingStatus(selectedId, "send_partially_tagged");
            if (data) onDetailChange(data);
            
            toast.success("Ready for Receiving", {
                description: "This PO status is now updated and visible in Receiving Products."
            });
            onBack();
        } catch (e: unknown) {
            toast.error("Status Update Failed", { description: (e as Error)?.message });
        } finally {
            setLoadingDetail(false);
        }
    }

    return (
        <>
            <div className="w-full min-w-0 space-y-4">
                {error ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                {!selectedId ? (
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-black">Tagging Of Purchase Orders</div>
                                <div className="text-sm text-muted-foreground">
                                    Select a Purchase Order to begin the inbound process.
                                </div>
                            </div>

                            <div className="relative w-full sm:w-[350px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search PO#, Supplier, or Status..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-11 rounded-xl shadow-sm border-border bg-background"
                                />
                            </div>
                        </div>

                        <PurchaseOrderList items={filteredPos} loading={loadingList} onTagItems={onTagItems} />
                    </div>
                ) : (
                    <ProductTaggingPanel
                        po={detail}
                        loading={loadingDetail}
                        onBack={onBack}
                        onChange={onDetailChange}
                        onTagItem={onTagItem}
                        onSendPartiallyTagged={onSendPartiallyTagged}
                    />
                )}
            </div>
        </>
    );
}
