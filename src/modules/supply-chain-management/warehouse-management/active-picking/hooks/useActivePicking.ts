"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { transmitItemScan, lookupRfidTag } from "../providers/fetchProvider";
import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";
import { soundFX } from "../utils/audioProvider";

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

    // 🏎️ PERFORMANCE REFS
    const detailsRef = useRef(batch.details || []);
    const scannedTagsRef = useRef(new Set<string>()); // DB Shield for RFIDs
    const bufferRef = useRef<string>("");
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef<boolean>(false);

    // Initial load sync
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

    const processScan = async (inputString: string, isManual: boolean = false, overrideQuantity: number = 1) => {
        const tag = inputString.trim();
        if ((!tag && !isManual)) return;

        const isLikelyRFID = tag.length > 12;
        if (!isManual && isLikelyRFID && scannedTagsRef.current.has(tag)) {
            soundFX.duplicate();
            return;
        }

        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsScanning(true);

        try {
            const currentDetails = detailsRef.current; // Always read fresh state

            // 1. Exact Barcode/ID Match
            let targetDetail = currentDetails.find(d =>
                d.barcode?.toLowerCase() === tag.toLowerCase() ||
                d.productId?.toString() === tag
            );

            // 2. RFID Database Lookup
            if (!targetDetail && !isManual) {
                const productId = await lookupRfidTag(tag);
                if (productId) targetDetail = currentDetails.find(d => d.productId === productId);
            }

            // 🚨 BUG FIX 1: Removed the dangerous "fallback to activeDetailId" logic here.
            // If the scanner scans an unknown barcode, it will cleanly reject it instead of adding +1 to the selected card!
            if (!targetDetail) {
                logScan(tag, "error", "Unrecognized Barcode/Tag");
                return;
            }

            const currentQty = targetDetail.pickedQuantity || 0;
            const requiredQty = targetDetail.orderedQuantity || 0;

            // Strict limit check
            if (currentQty + overrideQuantity > requiredQty) {
                logScan(tag || "MANUAL", "error", "Exceeds Requirement");
                return;
            }

            // 🚨 BUG FIX 2: Synchronous Ref Update!
            // We update `detailsRef` IMMEDIATELY before React even re-renders.
            // This prevents a rapid double-scan from over-picking.
            const updatedQty = currentQty + overrideQuantity;
            if (!isManual && isLikelyRFID) scannedTagsRef.current.add(tag);

            const updatedDetails = currentDetails.map(d =>
                d.id === targetDetail!.id ? { ...d, pickedQuantity: updatedQty } : d
            );

            detailsRef.current = updatedDetails; // Immediate sync
            setLocalDetails(updatedDetails);     // Triggers UI render
            setActiveDetailId(targetDetail.id || null);

            const isRFIDRequired = (targetDetail.unitOrder || 0) === 3;
            const transmitTag = isManual ? `MANUAL-${Date.now()}` : tag;

            // API Transmission
            const result = await transmitItemScan({
                detailId: targetDetail.id!,
                rfidTag: isRFIDRequired ? transmitTag : "",
                scannedBy: currentUserId,
                newPickedQuantity: updatedQty
            });

            if (result.success) {
                logScan(transmitTag, "success", `Picked ${targetDetail.productName}`);
            } else {
                // ❌ ROLLBACK ON SERVER REJECT
                if (!isManual && isLikelyRFID) scannedTagsRef.current.delete(tag);

                const revertedDetails = currentDetails.map(d =>
                    d.id === targetDetail!.id ? { ...d, pickedQuantity: currentQty } : d
                );
                detailsRef.current = revertedDetails;
                setLocalDetails(revertedDetails);

                logScan(transmitTag, "error", result.message || "Server Rejected");
            }
        } catch (err) {
            logScan(tag || "N/A", "error", "Connection Error");
        } finally {
            setIsScanning(false);
            isProcessingRef.current = false;
            if (isManualModalOpen) {
                setIsManualModalOpen(false);
                setManualQuantity("");
            }
        }
    };

    // 🚀 HARDWARE SCANNER LISTENER
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (["Shift", "Control", "Alt", "CapsLock", "Meta"].includes(e.key)) return;

            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

            if (e.key === "Enter") {
                const finalTag = bufferRef.current.trim();
                bufferRef.current = "";
                if (finalTag) processScan(finalTag, false);
            } else if (e.key.length === 1) {
                bufferRef.current += e.key;
            }

            // Debounce for suffix-less scanners
            scanTimeoutRef.current = setTimeout(() => {
                const finalTag = bufferRef.current.trim();
                if (finalTag.length > 3) { // Lowered slightly to catch short 4-digit barcodes
                    bufferRef.current = "";
                    processScan(finalTag, false);
                }
            }, 60); // 60ms allows standard USB/Bluetooth barcode scanners to complete transmission
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        };
    }, [activeDetailId, currentUserId]);

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