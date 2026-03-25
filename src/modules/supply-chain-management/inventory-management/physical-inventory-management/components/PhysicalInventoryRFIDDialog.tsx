//src/modules/supply-chain-management/physical-inventory-management/components/PhysicalInventoryRFIDDialog.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import type {
    GroupedPhysicalInventoryChildRow,
    PhysicalInventoryDetailRFIDRow,
    PhysicalInventoryDetailRow,
} from "../types";
import {
    createPhysicalInventoryDetailRfid,
    deletePhysicalInventoryDetailRfid,
    fetchPhysicalInventoryDetailRfid,
    fetchPhysicalInventoryDetailRfidByDetailId,
    fetchHistoricalRfidScan,
    fetchRfidOnhandByTag,
    fetchRfidOnhandByBranch,
    updatePhysicalInventoryDetail,
} from "../providers/fetchProvider";
import {
    computeAmount,
    computeDifferenceCost,
    computeVariance,
} from "../utils/compute";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2 } from "lucide-react";

type RfidSavedPayload = {
    updatedDetail: PhysicalInventoryDetailRow;
    rfidCount: number;
};

type Props = {
    open: boolean;
    row: GroupedPhysicalInventoryChildRow | null;
    branchId: number | null;
    onOpenChange: (open: boolean) => void;
    onSaved?: (payload: RfidSavedPayload) => Promise<void> | void;
};

const RFID_EXACT_LENGTH = 24;
const RFID_PATTERN = /^[A-F0-9]{24}$/;

function normalizeTag(value: string): string {
    return value.trim().toUpperCase();
}

function sameTag(a: string, b: string): boolean {
    return normalizeTag(a) === normalizeTag(b);
}

function isValidExactRfidTag(value: string): boolean {
    return RFID_PATTERN.test(normalizeTag(value));
}

function getRfidValidationMessage(value: string): string {
    const normalized = normalizeTag(value);

    if (!normalized) {
        return "RFID tag is required.";
    }

    if (normalized.length !== RFID_EXACT_LENGTH) {
        return `RFID tag must be exactly ${RFID_EXACT_LENGTH} characters.`;
    }

    if (!/^[A-F0-9]+$/.test(normalized)) {
        return "RFID tag must contain uppercase letters A-F and numbers 0-9 only.";
    }

    if (!normalized.startsWith("E")) {
        return 'RFID tag must start with "E".';
    }

    if (!RFID_PATTERN.test(normalized)) {
        return "Invalid RFID tag format.";
    }

    return "";
}

export function PhysicalInventoryRFIDDialog(props: Props) {
    const { open, row, branchId, onOpenChange, onSaved } = props;

    const [tags, setTags] = React.useState<PhysicalInventoryDetailRFIDRow[]>([]);
    const [allPiTags, setAllPiTags] = React.useState<PhysicalInventoryDetailRFIDRow[]>([]);
    const [rfidInput, setRfidInput] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [onhandCache, setOnhandCache] = React.useState<Map<string, number>>(new Map());
    const [isSaving, setIsSaving] = React.useState(false);
    const [deletingId, setDeletingId] = React.useState<number | null>(null);

    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const refocusTimerRef = React.useRef<number | null>(null);

    const detailId = row?.detail_id ?? null;
    const phId = row?.ph_id ?? null;

    const clearRefocusTimer = React.useCallback(() => {
        if (refocusTimerRef.current !== null) {
            window.clearTimeout(refocusTimerRef.current);
            refocusTimerRef.current = null;
        }
    }, []);

    const focusInput = React.useCallback((shouldSelect?: boolean) => {
        clearRefocusTimer();

        refocusTimerRef.current = window.setTimeout(() => {
            const input = inputRef.current;
            if (!input) return;

            input.focus();

            if (shouldSelect) {
                input.select();
            }
        }, 0);
    }, [clearRefocusTimer]);

    const loadTags = React.useCallback(async () => {
        if (!detailId) {
            setTags([]);
            setAllPiTags([]);
            return;
        }

        try {
            setIsLoading(true);

            const CACHE_KEY = `rfid_onhand_${branchId}`;
            const cachedStorage = localStorage.getItem(CACHE_KEY);
            const nextCache = new Map<string, number>();

            if (cachedStorage) {
                try {
                    const parsed = JSON.parse(cachedStorage);
                    if (Array.isArray(parsed)) {
                        for (const [key, val] of parsed) {
                            nextCache.set(key, val);
                        }
                    }
                } catch {
                    // ignore parse error
                }
            }

            const [detailTags, piTags] = await Promise.all([
                fetchPhysicalInventoryDetailRfidByDetailId(detailId),
                phId ? fetchPhysicalInventoryDetailRfid(phId) : Promise.resolve([]),
            ]);

            setTags(detailTags);
            setAllPiTags(piTags);

            if (nextCache.size === 0 && branchId) {
                const onhandRows = await fetchRfidOnhandByBranch(branchId);
                for (const row of onhandRows) {
                    nextCache.set(row.rfid, row.productId);
                }
                localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(nextCache.entries())));
            }

            setOnhandCache(nextCache);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to load RFID tags.";
            toast.error(message);
        } finally {
            setIsLoading(false);
            focusInput();
        }
    }, [detailId, phId, branchId, focusInput]);

    React.useEffect(() => {
        if (!open) {
            setRfidInput("");
            setTags([]);
            setAllPiTags([]);
            clearRefocusTimer();
            return;
        }

        void loadTags();
    }, [clearRefocusTimer, loadTags, open]);

    React.useEffect(() => {
        if (!open) return;

        const timer = window.setTimeout(() => {
            focusInput();
        }, 50);

        return () => window.clearTimeout(timer);
    }, [focusInput, open]);

    React.useEffect(() => {
        return () => {
            clearRefocusTimer();
        };
    }, [clearRefocusTimer]);

    const hasDuplicateInCurrentPi = React.useCallback(
        (rfidTag: string): boolean => {
            return allPiTags.some((tag) => sameTag(tag.rfid_tag, rfidTag));
        },
        [allPiTags],
    );

    const persistRowFromRfidCount = React.useCallback(
        async (nextRfidCount: number): Promise<PhysicalInventoryDetailRow> => {
            if (!detailId || !row) {
                throw new Error("Detail row is not available.");
            }

            const nextVariance = computeVariance(nextRfidCount, row.system_count);
            const nextDifferenceCost = computeDifferenceCost(
                nextVariance,
                row.unit_price,
            );
            const nextAmount = computeAmount(nextRfidCount, row.unit_price);

            return updatePhysicalInventoryDetail(detailId, {
                physical_count: nextRfidCount,
                variance: nextVariance,
                difference_cost: nextDifferenceCost,
                amount: nextAmount,
            });
        },
        [detailId, row],
    );

    const persistTag = React.useCallback(
        async (rfidTag: string) => {
            if (!detailId) {
                toast.error("Detail row is not available.");
                focusInput(true);
                return;
            }

            if (!isValidExactRfidTag(rfidTag)) {
                toast.error(
                    `Invalid RFID tag. It must be exactly ${RFID_EXACT_LENGTH} uppercase hexadecimal characters.`,
                );
                setRfidInput("");
                focusInput(true);
                return;
            }

            if (hasDuplicateInCurrentPi(rfidTag)) {
                toast.error("This RFID tag already exists in the current PI.");
                setRfidInput("");
                focusInput();
                return;
            }

            if (!branchId) {
                const message = "Branch is required before verifying RFID.";
                toast.error(message);
                setRfidInput("");
                focusInput();
                return;
            }

            // Verify where it belongs (Current On-hand)
            // Use local cache for instant lookup to support fast scan
            let rfidProductId: number | null = null;
            const cachedProductId = onhandCache.get(rfidTag);

            if (cachedProductId !== undefined) {
                rfidProductId = cachedProductId;
            } else {
                // Background fallback to API if not in cache (though pre-fetch should cover most)
                const resolved = await fetchRfidOnhandByTag(rfidTag, branchId);
                if (!resolved.ok) {
                    throw new Error(resolved.message || "RFID lookup failed.");
                }
                if (resolved.item) {
                    rfidProductId = resolved.item.productId;
                    // Update cache for future scans in this session
                    setOnhandCache((prev) => {
                        const next = new Map(prev);
                        next.set(rfidTag, rfidProductId!);
                        localStorage.setItem(`rfid_onhand_${branchId}`, JSON.stringify(Array.from(next.entries())));
                        return next;
                    });
                }
            }

            // If the RFID belongs to a DIFFERENT product, prohibit it
            if (rfidProductId !== null && rfidProductId !== row?.product_id) {
                const message = `Scanned RFID belongs to product ID ${rfidProductId}, but this row is for "${row?.product_name || "a different product"}".`;
                toast.error(message, {
                    description: `RFID: ${rfidTag}`,
                });
                setRfidInput("");
                focusInput();
                return;
            }

            // Verify historical records
            const historical = await fetchHistoricalRfidScan(rfidTag);
            if (historical && historical.product_id !== row?.product_id) {
                const message = `This RFID was previously registered to product ID ${historical.product_id}, but this row is for "${row?.product_name || "a different product"}".`;
                toast.error(message, {
                    description: `RFID: ${rfidTag}`,
                });
                setRfidInput("");
                focusInput();
                return;
            }

            const created = await createPhysicalInventoryDetailRfid({
                pi_detail_id: detailId,
                rfid_tag: rfidTag,
            });

            const nextRfidCount = tags.length + 1;
            const updatedDetail = await persistRowFromRfidCount(nextRfidCount);

            setTags((prev) => [created, ...prev]);
            setAllPiTags((prev) => [created, ...prev]);
            setRfidInput("");

            if (onSaved) {
                await onSaved({
                    updatedDetail,
                    rfidCount: nextRfidCount,
                });
            }

            toast.success("RFID tag added.");
            focusInput();
        },
        [
            detailId,
            focusInput,
            hasDuplicateInCurrentPi,
            onSaved,
            persistRowFromRfidCount,
            tags.length,
        ],
    );

    const handleAddTagManual = React.useCallback(async () => {
        const normalized = normalizeTag(rfidInput);
        const validationMessage = getRfidValidationMessage(normalized);

        if (validationMessage) {
            toast.error(validationMessage);
            focusInput(true);
            return;
        }

        try {
            setIsSaving(true);
            await persistTag(normalized);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to add RFID tag.";
            toast.error(message);
            focusInput(true);
        } finally {
            setIsSaving(false);
            focusInput();
        }
    }, [focusInput, persistTag, rfidInput]);

    const handleDeleteTag = React.useCallback(
        async (id: number) => {
            try {
                setDeletingId(id);
                await deletePhysicalInventoryDetailRfid(id);

                const nextRfidCount = Math.max(0, tags.length - 1);
                const updatedDetail = await persistRowFromRfidCount(nextRfidCount);

                setTags((prev) => prev.filter((rowItem) => rowItem.id !== id));
                setAllPiTags((prev) => prev.filter((rowItem) => rowItem.id !== id));

                if (onSaved) {
                    await onSaved({
                        updatedDetail,
                        rfidCount: nextRfidCount,
                    });
                }

                toast.success("RFID tag removed.");
                focusInput();
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Failed to delete RFID tag.";
                toast.error(message);
                focusInput();
            } finally {
                setDeletingId(null);
            }
        },
        [focusInput, onSaved, persistRowFromRfidCount, tags.length],
    );

    const inputErrorMessage = React.useMemo(() => {
        if (!rfidInput) return "";
        return getRfidValidationMessage(rfidInput);
    }, [rfidInput]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[96vh] w-[94vw] overflow-hidden p-0 sm:max-w-2xl sm:w-full sm:rounded-2xl">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>RFID Tag Review</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Review saved RFID tags, manually add missing tags, or
                        remove incorrect ones.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col overflow-hidden px-6 pb-6">
                    <div className="mb-4 space-y-4">
                        <div className="rounded-xl border bg-muted/30 p-3 text-[11px] sm:p-4 sm:text-sm">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <p className="col-span-2 sm:col-span-1">
                                    <span className="font-semibold text-muted-foreground mr-1">Product:</span>
                                    <span className="font-medium text-foreground">{row?.product_name ?? "—"}</span>
                                </p>
                                <p>
                                    <span className="font-semibold text-muted-foreground mr-1">UOM:</span>
                                    <span className="font-medium text-foreground">{row?.unit_name ?? row?.unit_shortcut ?? "—"}</span>
                                </p>
                                <p className="hidden sm:block">
                                    <span className="font-semibold text-muted-foreground mr-1">Product ID:</span>
                                    <span className="font-medium text-foreground">{row?.product_id ?? "—"}</span>
                                </p>
                                <p>
                                    <span className="font-semibold text-muted-foreground mr-1">Count:</span>
                                    <span className="font-bold text-primary">{tags.length}</span>
                                </p>
                            </div>
                        </div>

                    <div className="space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                                ref={inputRef}
                                placeholder="Scan or enter RFID tag"
                                value={rfidInput}
                                maxLength={RFID_EXACT_LENGTH}
                                onChange={(e) => {
                                    const nextValue = e.target.value.toUpperCase().replace(/[^A-F0-9]/g, "");
                                    setRfidInput(nextValue.slice(0, RFID_EXACT_LENGTH));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (!isSaving) {
                                            void handleAddTagManual();
                                        }
                                    }
                                }}
                                onBlur={() => {
                                    if (!open || isSaving || deletingId !== null) return;
                                    focusInput();
                                }}
                                disabled={!detailId || isSaving}
                                className={inputErrorMessage ? "border-destructive" : ""}
                            />

                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => void handleAddTagManual()}
                                disabled={!detailId || isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Manual
                                    </>
                                )}
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Accepted format: exactly {RFID_EXACT_LENGTH} uppercase hexadecimal
                            characters, for example: <span className="font-medium">E280F302000000010EC7C500</span>
                        </p>

                        {inputErrorMessage ? (
                            <p className="text-xs text-destructive">{inputErrorMessage}</p>
                        ) : null}

                        <p className="text-[10px] text-muted-foreground sm:text-xs">
                            This field stays armed for continuous scan input.
                        </p>
                    </div>

                    <div className="min-h-0 flex-1 rounded-xl border">
                        <ScrollArea className="h-full min-h-[220px] max-h-[360px]">
                            <div className="divide-y">
                                {isLoading ? (
                                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading RFID tags...
                                    </div>
                                ) : tags.length ? (
                                    tags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="flex items-center justify-between gap-3 p-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {tag.rfid_tag}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Created at: {tag.created_at ?? "—"}
                                                </p>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="cursor-pointer"
                                                onClick={() => void handleDeleteTag(tag.id)}
                                                disabled={deletingId === tag.id}
                                            >
                                                {deletingId === tag.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Remove
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                                        No RFID tags registered yet.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}