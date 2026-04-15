"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { transmitItemScan, lookupRfidTag, submitManualPick } from "../providers/fetchProvider";
import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";
import { soundFX } from "../utils/audioProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface UseActivePickingProps {
    batch: ConsolidatorDto;
    currentUserId: number;
}

export interface ScanLog {
    id: string;
    tag: string;
    time: string;
    status: "success" | "error";
    message: string;
}

export function useActivePicking({ batch, currentUserId }: UseActivePickingProps) {
    const router = useRouter();
    const [localDetails, setLocalDetails] = useState<ConsolidatorDetailsDto[]>(batch.details || []);
    const [activeDetailId, setActiveDetailId] = useState<number | null>(null);
    const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualQuantity, setManualQuantity] = useState<number | "">("");

    // 🏎️ PERFORMANCE REFS
    const detailsRef = useRef(batch.details || []);
    const scannedTagsRef = useRef(new Set<string>());
    const bufferRef = useRef<string>("");
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef<boolean>(false);

    useEffect(() => {
        if (batch.details) {
            setLocalDetails(batch.details);
            detailsRef.current = batch.details;
        }
    }, [batch.id, batch.details]);

    const activeDetail = useMemo(() => localDetails.find(d => d.id === activeDetailId), [localDetails, activeDetailId]);
    const totalItems = useMemo(() => localDetails.reduce((sum, d) => sum + (d.orderedQuantity || 0), 0), [localDetails]);
    const totalPicked = useMemo(() => localDetails.reduce((sum, d) => sum + (d.pickedQuantity || 0), 0), [localDetails]);
    const progressPercent = totalItems > 0 ? (totalPicked / totalItems) * 100 : 0;
    const isBatchComplete = totalItems > 0 && totalPicked >= totalItems;

    const groupedDetails = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, ConsolidatorDetailsDto[]>>> = {};
        localDetails.forEach(detail => {
            const supplier = detail.supplierName || "UNASSIGNED";
            const brand = detail.brandName || "NO BRAND";
            const category = detail.categoryName || "UNCATEGORIZED";

            if (!groups[supplier]) groups[supplier] = {};
            if (!groups[supplier][brand]) groups[supplier][brand] = {};
            if (!groups[supplier][brand][category]) groups[supplier][brand][category] = [];
            groups[supplier][brand][category].push(detail);
        });
        return groups;
    }, [localDetails]);

    const logScan = useCallback((tag: string, status: "success" | "error", message: string) => {
        if (status === "success") soundFX.success();
        else soundFX.error();

        const newLog: ScanLog = {
            id: Math.random().toString(36).substring(7),
            tag,
            time: new Date().toLocaleTimeString([], { hour12: false }),
            status,
            message
        };
        setScanLogs(prev => [newLog, ...prev].slice(0, 50));
    }, []);

    // 🚀 HARDWARE SCANNER LOGIC (Memoized to prevent effect re-runs)
    const processScan = useCallback(async (inputString: string) => {
        const tag = inputString.trim();
        if (!tag) return;

        const isLikelyRFID = tag.length > 12;
        if (isLikelyRFID && scannedTagsRef.current.has(tag)) {
            soundFX.duplicate();
            return;
        }

        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsScanning(true);

        try {
            const currentDetails = detailsRef.current;

            let targetDetail = currentDetails.find(d =>
                d.barcode?.toLowerCase() === tag.toLowerCase() ||
                d.productId?.toString() === tag
            );

            if (!targetDetail) {
                const productId = await lookupRfidTag(tag);
                if (productId) targetDetail = currentDetails.find(d => d.productId === productId);
            }

            if (!targetDetail) {
                logScan(tag, "error", "Unrecognized Barcode/Tag");
                return;
            }

            const currentQty = targetDetail.pickedQuantity || 0;
            const requiredQty = targetDetail.orderedQuantity || 0;

            if (currentQty + 1 > requiredQty) {
                logScan(tag, "error", "Exceeds Requirement");
                return;
            }

            const updatedQty = currentQty + 1;
            if (isLikelyRFID) scannedTagsRef.current.add(tag);

            const updatedDetails = currentDetails.map(d =>
                d.id === targetDetail!.id ? { ...d, pickedQuantity: updatedQty } : d
            );

            detailsRef.current = updatedDetails;
            setLocalDetails(updatedDetails);
            setActiveDetailId(targetDetail.id || null);

            const isRFIDRequired = (targetDetail.unitOrder || 0) === 3;
            const transmitTag = isRFIDRequired ? tag : "";

            const result = await transmitItemScan({
                detailId: targetDetail.id!,
                rfidTag: transmitTag,
                scannedBy: currentUserId,
                newPickedQuantity: updatedQty
            });

            if (result.success) {
                logScan(transmitTag || tag, "success", `Picked ${targetDetail.productName}`);
            } else {
                if (isLikelyRFID) scannedTagsRef.current.delete(tag);

                const revertedDetails = currentDetails.map(d =>
                    d.id === targetDetail!.id ? { ...d, pickedQuantity: currentQty } : d
                );
                detailsRef.current = revertedDetails;
                setLocalDetails(revertedDetails);

                logScan(transmitTag || tag, "error", result.message || "Server Rejected");
            }
        } catch {
            logScan(tag, "error", "Connection Error");
        } finally {
            setIsScanning(false);
            isProcessingRef.current = false;
        }
    }, [currentUserId, logScan]);

    // 🚀 HARDWARE LISTENER
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (["Shift", "Control", "Alt", "CapsLock", "Meta"].includes(e.key)) return;

            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

            if (e.key === "Enter") {
                const finalTag = bufferRef.current.trim();
                bufferRef.current = "";
                if (finalTag) processScan(finalTag);
            } else if (e.key.length === 1) {
                bufferRef.current += e.key;
            }

            scanTimeoutRef.current = setTimeout(() => {
                const finalTag = bufferRef.current.trim();
                if (finalTag.length > 3) {
                    bufferRef.current = "";
                    processScan(finalTag);
                }
            }, 60);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        };
    }, [processScan]);

    // 🚀 MANUAL SUBMIT LOGIC
    const handleManualSubmit = async () => {
        const qty = Number(manualQuantity);

        if (!activeDetail || isNaN(qty) || qty <= 0) return;

        const currentQty = activeDetail.pickedQuantity || 0;
        const requiredQty = activeDetail.orderedQuantity || 0;

        if (currentQty + qty > requiredQty) {
            soundFX.error();
            toast.error(`Exceeds requirement! Max allowed: ${requiredQty - currentQty}`);
            return;
        }

        setIsScanning(true);

        try {
            await submitManualPick({
                batchId: batch.id!,
                productId: activeDetail.productId,
                quantity: qty
            });

            // Optimistic UI Update
            const updatedQty = currentQty + qty;
            const updatedDetails = detailsRef.current.map(d =>
                d.id === activeDetail.id ? { ...d, pickedQuantity: updatedQty } : d
            );

            detailsRef.current = updatedDetails;
            setLocalDetails(updatedDetails);

            logScan(`MANUAL-${qty}`, "success", `Added ${qty} x ${activeDetail.productName}`);
            soundFX.success();
            toast.success(`Updated ${activeDetail.productName}`);

            // Refresh data from server
            router.refresh();

            // Cleanup Modal
            setIsManualModalOpen(false);
            setManualQuantity("");

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Manual pick failed";
            logScan("MANUAL", "error", message);
            soundFX.error();
            toast.error(message);
        } finally {
            setIsScanning(false);
        }
    };

    return {
        groupedDetails, activeDetailId, activeDetail, scanLogs, isScanning,
        totalItems, totalPicked, progressPercent, isBatchComplete,
        isManualModalOpen, manualQuantity, setIsManualModalOpen,
        setManualQuantity, setActiveDetailId, handleManualSubmit
    };
}