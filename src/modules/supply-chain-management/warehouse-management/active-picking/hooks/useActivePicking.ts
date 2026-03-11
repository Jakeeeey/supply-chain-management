"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { transmitItemScan, lookupRfidTag } from "../providers/fetchProvider";
import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";

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
    const [localDetails, setLocalDetails] = useState<ConsolidatorDetailsDto[]>(batch.details || []);
    const [activeDetailId, setActiveDetailId] = useState<number | null>(null);
    const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualQuantity, setManualQuantity] = useState<number | "">("");

    // 🏎️ PERFORMANCE REFS: These don't trigger re-renders
    const bufferRef = useRef<string>("");
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef<boolean>(false);

    useEffect(() => {
        if (batch.details) setLocalDetails(batch.details);
    }, [batch.id, batch.details]);

    const activeDetail = useMemo(() => localDetails.find(d => d.id === activeDetailId), [localDetails, activeDetailId]);
    const totalItems = useMemo(() => localDetails.reduce((sum, d) => sum + (d.orderedQuantity || 0), 0), [localDetails]);
    const totalPicked = useMemo(() => localDetails.reduce((sum, d) => sum + (d.pickedQuantity || 0), 0), [localDetails]);
    const progressPercent = totalItems > 0 ? (totalPicked / totalItems) * 100 : 0;
    const isBatchComplete = totalItems > 0 && totalPicked >= totalItems;

    const groupedDetails = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, ConsolidatorDetailsDto[]>>> = {};
        localDetails.forEach(detail => {
            const supplier = (detail as any).supplierName || "UNASSIGNED";
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
        const newLog: ScanLog = {
            id: Math.random().toString(36).substring(7),
            tag,
            time: new Date().toLocaleTimeString([], { hour12: false }),
            status,
            message
        };
        setScanLogs(prev => [newLog, ...prev].slice(0, 50));
    }, []);

    const processScan = async (inputString: string, isManual: boolean = false, overrideQuantity: number = 1) => {
        if ((!inputString && !isManual) || isProcessingRef.current) return;

        isProcessingRef.current = true;
        setIsScanning(true);

        try {
            // 1. Identification
            let targetDetail = localDetails.find(d =>
                d.barcode?.toLowerCase() === inputString.toLowerCase() ||
                d.productId?.toString() === inputString
            );

            if (!targetDetail && !isManual) {
                const productId = await lookupRfidTag(inputString);
                if (productId) targetDetail = localDetails.find(d => d.productId === productId);
            }

            if (!targetDetail && activeDetailId) {
                targetDetail = localDetails.find(d => d.id === activeDetailId);
            }

            if (!targetDetail) {
                logScan(inputString, "error", "Unknown Product/Tag");
                return;
            }

            const currentQty = targetDetail.pickedQuantity || 0;
            const requiredQty = targetDetail.orderedQuantity || 0;

            if (currentQty + overrideQuantity > requiredQty) {
                logScan(inputString || "MANUAL", "error", "Exceeds Requirement");
                return;
            }

            // 🚀 OPTIMISTIC UPDATE: Update UI immediately before API call
            const updatedQty = currentQty + overrideQuantity;
            setActiveDetailId(targetDetail.id || null);
            setLocalDetails(prev => prev.map(d =>
                d.id === targetDetail!.id ? { ...d, pickedQuantity: updatedQty } : d
            ));

            const isRFIDRequired = (targetDetail.unitOrder || 0) === 3;
            const transmitTag = isManual ? `MANUAL-${Date.now()}` : inputString;

            // 2. Transmit in background
            const result = await transmitItemScan({
                detailId: targetDetail.id!,
                rfidTag: isRFIDRequired ? transmitTag : "",
                scannedBy: currentUserId,
                newPickedQuantity: updatedQty
            });

            if (result.success) {
                logScan(transmitTag, "success", `Picked ${targetDetail.productName}`);
            } else {
                // ❌ ROLLBACK on failure
                setLocalDetails(prev => prev.map(d =>
                    d.id === targetDetail!.id ? { ...d, pickedQuantity: currentQty } : d
                ));
                logScan(transmitTag, "error", result.message || "Server Rejected");
            }
        } catch (err) {
            logScan(inputString || "N/A", "error", "Connection Error");
        } finally {
            setIsScanning(false);
            isProcessingRef.current = false;
            if (isManualModalOpen) {
                setIsManualModalOpen(false);
                setManualQuantity("");
            }
        }
    };

    // 🚀 ULTRA-FAST SCANNER LISTENER
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Ignore modifiers
            if (e.key === "Shift" || e.key === "Control" || e.key === "Alt") return;

            // Clear buffer if it's been a while (manual typing vs scanner speed)
            // Scanners usually send keys < 20ms apart
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

            if (e.key === "Enter") {
                const finalTag = bufferRef.current.trim();
                bufferRef.current = "";
                if (finalTag) processScan(finalTag, false);
            } else if (e.key.length === 1) {
                bufferRef.current += e.key;
            }

            // Auto-trigger if the scanner doesn't send "Enter" but stops sending keys
            scanTimeoutRef.current = setTimeout(() => {
                const finalTag = bufferRef.current.trim();
                if (finalTag.length > 5) { // Assuming RFID tags are long
                    bufferRef.current = "";
                    processScan(finalTag, false);
                }
            }, 50); // 50ms is the sweet spot for long-range scanners
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        };
    }, [localDetails, activeDetailId, currentUserId]);

    const handleManualSubmit = async () => {
        const qty = Number(manualQuantity);
        if (qty > 0 && !isNaN(qty)) await processScan("", true, qty);
    };

    return {
        groupedDetails, activeDetailId, activeDetail, scanLogs, isScanning,
        totalItems, totalPicked, progressPercent, isBatchComplete,
        isManualModalOpen, manualQuantity, setIsManualModalOpen,
        setManualQuantity, setActiveDetailId, handleManualSubmit
    };
}