//src/modules/supply-chain-management/physical-inventory-management/components/PhysicalInventoryGlobalRFIDScannerDialog.tsx
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
    fetchPhysicalInventoryDetailRfid,
    fetchRfidOnhandByTag,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    ScanLine,
    Wifi,
} from "lucide-react";

type ScanHistoryItem = {
    id: string;
    rfidTag: string;
    status: "success" | "error";
    message: string;
    productId: number | null;
    productName: string | null;
    unitName: string | null;
    createdAt: string;
};

type RfidSavedPayload = {
    updatedDetail: PhysicalInventoryDetailRow;
    rfidCount: number;
};

type Props = {
    open: boolean;
    branchId: number | null;
    phId: number | null;
    rows: GroupedPhysicalInventoryChildRow[];
    canEdit: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: (payload: RfidSavedPayload) => Promise<void> | void;
};

type ScannerSignalState = "idle" | "ready" | "processing" | "success" | "error";
type ScanAnimationState = "none" | "success" | "error";

function normalizeTag(value: string): string {
    return value.trim();
}

function sameTag(a: string, b: string): boolean {
    return normalizeTag(a).toLowerCase() === normalizeTag(b).toLowerCase();
}

function createHistoryId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function playTone(
    audioContext: AudioContext,
    frequency: number,
    durationMs: number,
    startAt: number,
): void {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + durationMs / 1000);
}

export function PhysicalInventoryGlobalRFIDScannerDialog(props: Props) {
    const { open, branchId, phId, rows, canEdit, onOpenChange, onSaved } = props;

    const [isLoadingExisting, setIsLoadingExisting] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [existingPiTags, setExistingPiTags] = React.useState<PhysicalInventoryDetailRFIDRow[]>(
        [],
    );
    const [history, setHistory] = React.useState<ScanHistoryItem[]>([]);
    const [scannerSignal, setScannerSignal] = React.useState<ScannerSignalState>("idle");
    const [lastScannedTag, setLastScannedTag] = React.useState<string>("");
    const [lastSignalMessage, setLastSignalMessage] = React.useState<string>(
        "Scanner is waiting.",
    );
    const [scanAnimation, setScanAnimation] = React.useState<ScanAnimationState>("none");
    const [savedCountPulse, setSavedCountPulse] = React.useState(false);
    const [latestHistoryId, setLatestHistoryId] = React.useState<string | null>(null);

    const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);
    const signalResetTimerRef = React.useRef<number | null>(null);
    const animationResetTimerRef = React.useRef<number | null>(null);
    const savedCountPulseTimerRef = React.useRef<number | null>(null);
    const historyHighlightTimerRef = React.useRef<number | null>(null);
    const audioContextRef = React.useRef<AudioContext | null>(null);

    const flattenedRows = React.useMemo(() => rows, [rows]);

    const rowByProductId = React.useMemo(() => {
        const map = new Map<number, GroupedPhysicalInventoryChildRow>();

        for (const row of flattenedRows) {
            map.set(row.product_id, row);
        }

        return map;
    }, [flattenedRows]);

    const ensureAudioContext = React.useCallback(async (): Promise<AudioContext | null> => {
        if (typeof window === "undefined") return null;

        const AudioContextCtor =
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextCtor) return null;

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextCtor();
        }

        if (audioContextRef.current.state === "suspended") {
            try {
                await audioContextRef.current.resume();
            } catch {
                return null;
            }
        }

        return audioContextRef.current;
    }, []);

    const playSuccessBeep = React.useCallback(async () => {
        const context = await ensureAudioContext();
        if (!context) return;

        const startAt = context.currentTime;
        playTone(context, 880, 90, startAt);
        playTone(context, 1180, 120, startAt + 0.11);
    }, [ensureAudioContext]);

    const playErrorBeep = React.useCallback(async () => {
        const context = await ensureAudioContext();
        if (!context) return;

        const startAt = context.currentTime;
        playTone(context, 320, 140, startAt);
        playTone(context, 240, 180, startAt + 0.16);
    }, [ensureAudioContext]);

    const triggerScanAnimation = React.useCallback((state: Exclude<ScanAnimationState, "none">) => {
        if (animationResetTimerRef.current !== null) {
            window.clearTimeout(animationResetTimerRef.current);
            animationResetTimerRef.current = null;
        }

        setScanAnimation("none");

        window.setTimeout(() => {
            setScanAnimation(state);

            animationResetTimerRef.current = window.setTimeout(() => {
                setScanAnimation("none");
            }, 420);
        }, 0);
    }, []);

    const triggerSavedCountPulse = React.useCallback(() => {
        if (savedCountPulseTimerRef.current !== null) {
            window.clearTimeout(savedCountPulseTimerRef.current);
            savedCountPulseTimerRef.current = null;
        }

        setSavedCountPulse(false);

        window.setTimeout(() => {
            setSavedCountPulse(true);

            savedCountPulseTimerRef.current = window.setTimeout(() => {
                setSavedCountPulse(false);
            }, 360);
        }, 0);
    }, []);

    const markLatestHistoryItem = React.useCallback((id: string) => {
        if (historyHighlightTimerRef.current !== null) {
            window.clearTimeout(historyHighlightTimerRef.current);
            historyHighlightTimerRef.current = null;
        }

        setLatestHistoryId(id);

        historyHighlightTimerRef.current = window.setTimeout(() => {
            setLatestHistoryId(null);
        }, 650);
    }, []);

    const focusHiddenReceiver = React.useCallback(() => {
        if (!open || !canEdit) return;

        window.setTimeout(() => {
            hiddenInputRef.current?.focus();
        }, 0);
    }, [canEdit, open]);

    const clearSignalResetTimer = React.useCallback(() => {
        if (signalResetTimerRef.current !== null) {
            window.clearTimeout(signalResetTimerRef.current);
            signalResetTimerRef.current = null;
        }
    }, []);

    const clearAnimationResetTimer = React.useCallback(() => {
        if (animationResetTimerRef.current !== null) {
            window.clearTimeout(animationResetTimerRef.current);
            animationResetTimerRef.current = null;
        }
    }, []);

    const clearSavedCountPulseTimer = React.useCallback(() => {
        if (savedCountPulseTimerRef.current !== null) {
            window.clearTimeout(savedCountPulseTimerRef.current);
            savedCountPulseTimerRef.current = null;
        }
    }, []);

    const clearHistoryHighlightTimer = React.useCallback(() => {
        if (historyHighlightTimerRef.current !== null) {
            window.clearTimeout(historyHighlightTimerRef.current);
            historyHighlightTimerRef.current = null;
        }
    }, []);

    const setTemporarySignal = React.useCallback(
        (
            state: Extract<ScannerSignalState, "success" | "error">,
            message: string,
            scannedTag: string,
        ) => {
            clearSignalResetTimer();
            setScannerSignal(state);
            setLastSignalMessage(message);
            setLastScannedTag(scannedTag);

            if (state === "success") {
                void playSuccessBeep();
                triggerScanAnimation("success");
                triggerSavedCountPulse();
            } else {
                void playErrorBeep();
                triggerScanAnimation("error");
            }

            signalResetTimerRef.current = window.setTimeout(() => {
                setScannerSignal(canEdit ? "ready" : "idle");
                setLastSignalMessage(
                    canEdit ? "Ready to scan. Present an RFID tag." : "Scanner is disabled.",
                );
                setLastScannedTag("");
                setScanAnimation("none");
                focusHiddenReceiver();
            }, 1400);
        },
        [
            canEdit,
            clearSignalResetTimer,
            focusHiddenReceiver,
            playErrorBeep,
            playSuccessBeep,
            triggerSavedCountPulse,
            triggerScanAnimation,
        ],
    );

    const loadExistingPiTags = React.useCallback(async () => {
        if (!phId) {
            setExistingPiTags([]);
            return;
        }

        try {
            setIsLoadingExisting(true);
            const tags = await fetchPhysicalInventoryDetailRfid(phId);
            setExistingPiTags(tags);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to load existing RFID tags.";
            toast.error(message);
        } finally {
            setIsLoadingExisting(false);
        }
    }, [phId]);

    React.useEffect(() => {
        if (!open) {
            clearSignalResetTimer();
            clearAnimationResetTimer();
            clearSavedCountPulseTimer();
            clearHistoryHighlightTimer();
            setExistingPiTags([]);
            setHistory([]);
            setScannerSignal("idle");
            setLastScannedTag("");
            setLastSignalMessage("Scanner is waiting.");
            setScanAnimation("none");
            setSavedCountPulse(false);
            setLatestHistoryId(null);
            return;
        }

        setScannerSignal(canEdit ? "ready" : "idle");
        setLastSignalMessage(
            canEdit ? "Ready to scan. Present an RFID tag." : "This PI can no longer be edited.",
        );
        setLastScannedTag("");
        setScanAnimation("none");
        setSavedCountPulse(false);
        setLatestHistoryId(null);
        void loadExistingPiTags();
    }, [
        canEdit,
        clearAnimationResetTimer,
        clearHistoryHighlightTimer,
        clearSavedCountPulseTimer,
        clearSignalResetTimer,
        loadExistingPiTags,
        open,
    ]);

    React.useEffect(() => {
        if (!open || !canEdit) return;

        const timer = window.setTimeout(() => {
            focusHiddenReceiver();
        }, 50);

        return () => window.clearTimeout(timer);
    }, [canEdit, focusHiddenReceiver, open]);

    React.useEffect(() => {
        if (!open || !canEdit) return;

        const handlePointerOrFocus = () => {
            if (isProcessing) return;
            focusHiddenReceiver();
        };

        window.addEventListener("click", handlePointerOrFocus);
        window.addEventListener("focus", handlePointerOrFocus);

        return () => {
            window.removeEventListener("click", handlePointerOrFocus);
            window.removeEventListener("focus", handlePointerOrFocus);
        };
    }, [canEdit, focusHiddenReceiver, isProcessing, open]);

    React.useEffect(() => {
        return () => {
            clearSignalResetTimer();
            clearAnimationResetTimer();
            clearSavedCountPulseTimer();
            clearHistoryHighlightTimer();

            if (audioContextRef.current) {
                void audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, [
        clearAnimationResetTimer,
        clearHistoryHighlightTimer,
        clearSavedCountPulseTimer,
        clearSignalResetTimer,
    ]);

    const pushHistory = React.useCallback(
        (item: Omit<ScanHistoryItem, "id" | "createdAt">) => {
            const nextItem: ScanHistoryItem = {
                ...item,
                id: createHistoryId(),
                createdAt: new Date().toLocaleString("en-PH"),
            };

            setHistory((prev) => [nextItem, ...prev].slice(0, 50));
            markLatestHistoryItem(nextItem.id);
        },
        [markLatestHistoryItem],
    );

    const hasDuplicateInCurrentPi = React.useCallback(
        (rfidTag: string): boolean => {
            return existingPiTags.some((row) => sameTag(row.rfid_tag, rfidTag));
        },
        [existingPiTags],
    );

    const processScan = React.useCallback(
        async (rawTag: string) => {
            const normalized = normalizeTag(rawTag);

            if (!canEdit) {
                const message = "This PI can no longer be edited.";
                toast.error(message);
                setTemporarySignal("error", message, normalized);
                return;
            }

            if (!normalized) {
                return;
            }

            if (!branchId) {
                const message = "Branch is required before scanning RFID.";
                toast.error(message);
                setTemporarySignal("error", message, normalized);
                return;
            }

            if (!phId) {
                const message = "Please save the PI header first.";
                toast.error(message);
                setTemporarySignal("error", message, normalized);
                return;
            }

            if (!flattenedRows.length) {
                const message = "Load products first before scanning RFID.";
                toast.error(message);
                setTemporarySignal("error", message, normalized);
                return;
            }

            if (hasDuplicateInCurrentPi(normalized)) {
                const message = "This RFID tag already exists in the current PI.";
                toast.error(message);
                pushHistory({
                    rfidTag: normalized,
                    status: "error",
                    message,
                    productId: null,
                    productName: null,
                    unitName: null,
                });
                setTemporarySignal("error", message, normalized);
                return;
            }

            try {
                setIsProcessing(true);
                setScannerSignal("processing");
                setLastSignalMessage("Processing scan...");
                setLastScannedTag(normalized);
                setScanAnimation("none");

                const resolved = await fetchRfidOnhandByTag(normalized, branchId);

                if (!resolved.ok) {
                    throw new Error(resolved.message || "RFID lookup failed.");
                }

                if (!resolved.item) {
                    const message = resolved.message || "RFID not found in on-hand records.";
                    toast.error(message);
                    pushHistory({
                        rfidTag: normalized,
                        status: "error",
                        message,
                        productId: null,
                        productName: null,
                        unitName: null,
                    });
                    setTemporarySignal("error", message, normalized);
                    return;
                }

                const matchedRow = rowByProductId.get(resolved.item.productId);

                if (!matchedRow) {
                    const message = `Scanned RFID belongs to product ID ${resolved.item.productId}, but that product is not loaded in the current PI.`;
                    toast.error(message);
                    pushHistory({
                        rfidTag: normalized,
                        status: "error",
                        message,
                        productId: resolved.item.productId,
                        productName: null,
                        unitName: null,
                    });
                    setTemporarySignal("error", message, normalized);
                    return;
                }

                if (!matchedRow.detail_id) {
                    const message = `Matched product "${matchedRow.product_name}" does not have a valid PI detail row.`;
                    toast.error(message);
                    pushHistory({
                        rfidTag: normalized,
                        status: "error",
                        message,
                        productId: matchedRow.product_id,
                        productName: matchedRow.product_name,
                        unitName: matchedRow.unit_name ?? matchedRow.unit_shortcut ?? null,
                    });
                    setTemporarySignal("error", message, normalized);
                    return;
                }

                const createdTag = await createPhysicalInventoryDetailRfid({
                    pi_detail_id: matchedRow.detail_id,
                    rfid_tag: normalized,
                });

                setExistingPiTags((prev) => [createdTag, ...prev]);

                let updatedDetail: PhysicalInventoryDetailRow;
                let nextRfidCount = 0;

                if (matchedRow.requires_rfid) {
                    const currentRfidCount = existingPiTags.filter(
                        (tag) => tag.pi_detail_id === matchedRow.detail_id,
                    ).length;
                    nextRfidCount = currentRfidCount + 1;

                    const nextVariance = computeVariance(nextRfidCount, matchedRow.system_count);
                    const nextDifferenceCost = computeDifferenceCost(
                        nextVariance,
                        matchedRow.unit_price,
                    );
                    const nextAmount = computeAmount(nextRfidCount, matchedRow.unit_price);

                    updatedDetail = await updatePhysicalInventoryDetail(matchedRow.detail_id, {
                        physical_count: nextRfidCount,
                        variance: nextVariance,
                        difference_cost: nextDifferenceCost,
                        amount: nextAmount,
                    });

                    const successMessage = `RFID counted to ${matchedRow.product_name} (${matchedRow.unit_name ?? matchedRow.unit_shortcut ?? "UOM"}).`;
                    toast.success(successMessage);

                    pushHistory({
                        rfidTag: normalized,
                        status: "success",
                        message: successMessage,
                        productId: matchedRow.product_id,
                        productName: matchedRow.product_name,
                        unitName: matchedRow.unit_name ?? matchedRow.unit_shortcut ?? null,
                    });

                    setTemporarySignal("success", successMessage, normalized);
                } else {
                    nextRfidCount =
                        existingPiTags.filter((tag) => tag.pi_detail_id === matchedRow.detail_id)
                            .length + 1;

                    const nextPhysicalCount = matchedRow.physical_count + 1;
                    const nextVariance = computeVariance(
                        nextPhysicalCount,
                        matchedRow.system_count,
                    );
                    const nextDifferenceCost = computeDifferenceCost(
                        nextVariance,
                        matchedRow.unit_price,
                    );
                    const nextAmount = computeAmount(nextPhysicalCount, matchedRow.unit_price);

                    updatedDetail = await updatePhysicalInventoryDetail(matchedRow.detail_id, {
                        physical_count: nextPhysicalCount,
                        variance: nextVariance,
                        difference_cost: nextDifferenceCost,
                        amount: nextAmount,
                    });

                    const successMessage = `Tag saved and count incremented to ${matchedRow.product_name} (${matchedRow.unit_name ?? matchedRow.unit_shortcut ?? "UOM"}). Physical count is now ${nextPhysicalCount}.`;
                    toast.success(successMessage);

                    pushHistory({
                        rfidTag: normalized,
                        status: "success",
                        message: successMessage,
                        productId: matchedRow.product_id,
                        productName: matchedRow.product_name,
                        unitName: matchedRow.unit_name ?? matchedRow.unit_shortcut ?? null,
                    });

                    setTemporarySignal("success", successMessage, normalized);
                }

                if (onSaved) {
                    await onSaved({
                        updatedDetail,
                        rfidCount: nextRfidCount,
                    });
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Failed to process RFID scan.";

                toast.error(message);
                pushHistory({
                    rfidTag: normalized,
                    status: "error",
                    message,
                    productId: null,
                    productName: null,
                    unitName: null,
                });
                setTemporarySignal("error", message, normalized);
            } finally {
                setIsProcessing(false);

                if (hiddenInputRef.current) {
                    hiddenInputRef.current.value = "";
                }

                focusHiddenReceiver();
            }
        },
        [
            branchId,
            canEdit,
            existingPiTags,
            flattenedRows.length,
            focusHiddenReceiver,
            hasDuplicateInCurrentPi,
            onSaved,
            phId,
            pushHistory,
            rowByProductId,
            setTemporarySignal,
        ],
    );

    const totalRfidRows = existingPiTags.length;
    const totalRfidEligibleRows = flattenedRows.filter((row) => row.requires_rfid).length;

    const signalToneClasses =
        scannerSignal === "processing"
            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
            : scannerSignal === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                : scannerSignal === "error"
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300";

    const signalAnimationClasses =
        scanAnimation === "success"
            ? "animate-[scanSuccess_420ms_ease-out]"
            : scanAnimation === "error"
                ? "animate-[scanError_420ms_ease-out]"
                : "";

    const savedCountAnimationClasses = savedCountPulse
        ? "animate-[savedCountPop_360ms_ease-out]"
        : "";

    const readyRippleClasses =
        scannerSignal === "ready" && canEdit
            ? "animate-[scannerRipple_1.8s_ease-out_infinite]"
            : "";

    return (
        <>
            <style jsx>{`
                @keyframes scanSuccess {
                    0% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                    }
                    30% {
                        transform: scale(1.02);
                        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.16);
                    }
                    100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                    }
                }

                @keyframes scanError {
                    0% {
                        transform: scale(1) translateX(0);
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                    }
                    20% {
                        transform: scale(1.01) translateX(-4px);
                    }
                    40% {
                        transform: scale(1.01) translateX(4px);
                        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.12);
                    }
                    60% {
                        transform: scale(1.01) translateX(-3px);
                    }
                    80% {
                        transform: scale(1.005) translateX(3px);
                    }
                    100% {
                        transform: scale(1) translateX(0);
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                    }
                }

                @keyframes savedCountPop {
                    0% {
                        transform: scale(1);
                    }
                    35% {
                        transform: scale(1.18);
                    }
                    65% {
                        transform: scale(0.96);
                    }
                    100% {
                        transform: scale(1);
                    }
                }

                @keyframes historySlideIn {
                    0% {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.985);
                        background-color: rgba(16, 185, 129, 0.08);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        background-color: transparent;
                    }
                }

                @keyframes historySlideInError {
                    0% {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.985);
                        background-color: rgba(239, 68, 68, 0.08);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        background-color: transparent;
                    }
                }

                @keyframes scannerRipple {
                    0% {
                        transform: scale(0.8);
                        opacity: 0.35;
                    }
                    70% {
                        transform: scale(1.45);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(1.45);
                        opacity: 0;
                    }
                }
            `}</style>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[96vw] max-w-2xl gap-0 overflow-hidden p-0">
                    <DialogHeader className="border-b px-4 py-3">
                        <DialogTitle className="text-lg">Global RFID Scanner</DialogTitle>
                        <DialogDescription className="text-xs">
                            Direct scan mode is active. Keep this dialog open and scan RFID tags
                            directly.
                        </DialogDescription>
                    </DialogHeader>

                    <input
                        ref={hiddenInputRef}
                        type="text"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
                        disabled={!open || !canEdit || isProcessing}
                        onBlur={() => {
                            if (!open || !canEdit || isProcessing) return;
                            focusHiddenReceiver();
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== "Enter") return;

                            event.preventDefault();

                            if (isProcessing) return;

                            const rawValue = hiddenInputRef.current?.value ?? "";
                            void processScan(rawValue);
                        }}
                    />

                    <div className="space-y-3 p-4">
                        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-3 text-xs md:grid-cols-4">
                            <div>
                                <span className="font-medium">Branch:</span> {branchId ?? "—"}
                            </div>
                            <div>
                                <span className="font-medium">PI:</span> {phId ?? "—"}
                            </div>
                            <div>
                                <span className="font-medium">RFID Rows:</span>{" "}
                                {totalRfidEligibleRows}
                            </div>
                            <div>
                                <span className="font-medium">Saved:</span>{" "}
                                <span
                                    className={[
                                        "inline-block font-semibold text-emerald-700 dark:text-emerald-300",
                                        savedCountAnimationClasses,
                                    ].join(" ")}
                                >
                                    {totalRfidRows}
                                </span>
                            </div>
                        </div>

                        <div
                            className={[
                                "rounded-xl border px-4 py-4 transition-colors will-change-transform",
                                signalToneClasses,
                                signalAnimationClasses,
                            ].join(" ")}
                        >
                            <div className="flex flex-col items-center justify-center gap-2 text-center">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex h-8 w-8 items-center justify-center">
                                        {scannerSignal === "ready" && canEdit ? (
                                            <>
                                                <span
                                                    className={[
                                                        "absolute h-8 w-8 rounded-full border border-emerald-400/40",
                                                        readyRippleClasses,
                                                    ].join(" ")}
                                                />
                                                <Wifi className="relative z-10 h-5 w-5" />
                                            </>
                                        ) : scannerSignal === "processing" ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : scannerSignal === "success" ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : scannerSignal === "error" ? (
                                            <AlertCircle className="h-5 w-5" />
                                        ) : (
                                            <Wifi className="h-5 w-5" />
                                        )}
                                    </div>

                                    <span className="text-base font-semibold">
                                        {scannerSignal === "processing"
                                            ? "Processing"
                                            : scannerSignal === "success"
                                                ? "Success"
                                                : scannerSignal === "error"
                                                    ? "Error"
                                                    : canEdit
                                                        ? "Ready to Scan"
                                                        : "Scanner Disabled"}
                                    </span>
                                </div>

                                <p className="text-xs opacity-90">{lastSignalMessage}</p>

                                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] opacity-90">
                                    <span className="rounded-full border border-current/20 px-2 py-0.5">
                                        No field
                                    </span>
                                    <span className="rounded-full border border-current/20 px-2 py-0.5">
                                        Direct scan
                                    </span>
                                    <span className="rounded-full border border-current/20 px-2 py-0.5">
                                        Auto re-arm
                                    </span>
                                </div>

                                <div className="rounded-lg border border-current/15 bg-background/70 px-3 py-2 text-xs text-foreground shadow-sm">
                                    <div className="flex items-center justify-center gap-2">
                                        <ScanLine
                                            className={[
                                                "h-3.5 w-3.5",
                                                scannerSignal === "processing" ? "animate-pulse" : "",
                                            ].join(" ")}
                                        />
                                        <span className="font-medium">
                                            {lastScannedTag
                                                ? lastScannedTag
                                                : "Waiting for RFID scan..."}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border">
                            <div className="border-b px-4 py-2">
                                <p className="text-sm font-medium">Scan History</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Latest scans are shown first.
                                    {isLoadingExisting ? " Loading current PI saved tags..." : ""}
                                </p>
                            </div>

                            <ScrollArea className="h-[260px]">
                                <div className="divide-y">
                                    {history.length ? (
                                        history.map((item) => {
                                            const isNewest = item.id === latestHistoryId;
                                            const historyAnimationClass = isNewest
                                                ? item.status === "success"
                                                    ? "animate-[historySlideIn_520ms_ease-out]"
                                                    : "animate-[historySlideInError_520ms_ease-out]"
                                                : "";

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={[
                                                        "flex flex-col gap-1 p-3 text-xs",
                                                        historyAnimationClass,
                                                    ].join(" ")}
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold">
                                                            {item.rfidTag}
                                                        </span>
                                                        <span
                                                            className={[
                                                                "rounded-full border px-2 py-0.5 text-[10px]",
                                                                item.status === "success"
                                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300",
                                                            ].join(" ")}
                                                        >
                                                            {item.status === "success"
                                                                ? "Success"
                                                                : "Error"}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {item.createdAt}
                                                        </span>
                                                    </div>

                                                    <p>{item.message}</p>

                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                                        <span>
                                                            Product ID: {item.productId ?? "—"}
                                                        </span>
                                                        <span>
                                                            Product: {item.productName ?? "—"}
                                                        </span>
                                                        <span>UOM: {item.unitName ?? "—"}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                                            No scans yet.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="flex justify-end pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}