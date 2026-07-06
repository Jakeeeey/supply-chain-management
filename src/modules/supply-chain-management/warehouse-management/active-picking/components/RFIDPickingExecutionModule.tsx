"use client";

import React from "react";
import { ConsolidatorDto } from "../types";
import { useRFIDPicking } from "../hooks/useRFIDPicking";
import { Keyboard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Sub-components (shared)
import { ActivePickingHeader } from "./ActivePickingHeader";
import { ActivePickingGroupedList } from "./ActivePickingGroupedList";
import { ActivePickingLiveFeed } from "./ActivePickingLiveFeed";
import { ManualOverrideModal } from "./ManualOverrideModal";

interface RFIDPickingExecutionProps {
    batch: ConsolidatorDto;
    currentUserId: number;
    onClose: () => void;
    onBatchComplete: () => void;
}

export default function RFIDPickingExecutionModule({
    batch,
    currentUserId,
    onClose,
    onBatchComplete,
}: RFIDPickingExecutionProps) {

    const pickingState = useRFIDPicking({ batch, currentUserId });

    // Manual is only available for non-RFID items (unitOrder !== 3)
    const activeIsNonRFID = (pickingState.activeDetail?.unitOrder || 0) !== 3;

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in zoom-in-[0.98] duration-300">

            {/* Mode badge — visually distinguishes RFID module */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 shadow-sm">
                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">RFID Mode</span>
                </div>
            </div>

            <ActivePickingHeader
                batchNo={batch.consolidatorNo}
                branchName={batch.branchName}
                totalPicked={pickingState.totalPicked}
                totalItems={pickingState.totalItems}
                progressPercent={pickingState.progressPercent}
                isBatchComplete={pickingState.isBatchComplete}
                isScanning={pickingState.isScanning}
                onClose={onClose}
                onBatchComplete={onBatchComplete}
            />

            <div className="flex-1 min-h-0 flex overflow-hidden bg-muted/10">
                <ActivePickingGroupedList
                    cldtoNo={batch.consolidatorNo}
                    groupedDetails={pickingState.groupedDetails}
                    activeDetailId={pickingState.activeDetailId}
                    setActiveDetailId={pickingState.setActiveDetailId}
                    onOpenManualModal={() => pickingState.setIsManualModalOpen(true)}
                    onFinalizeBatch={onBatchComplete}
                    onAdjustQuantity={pickingState.handleAdjustQuantity}
                    hideManualForRFIDItems
                />
                <ActivePickingLiveFeed
                    scanLogs={pickingState.scanLogs}
                    activeDetailId={pickingState.activeDetailId}
                    isBatchComplete={pickingState.isBatchComplete}
                />
            </div>

            {/* FAB — only visible when a non-RFID item is selected */}
            <AnimatePresence>
                {pickingState.activeDetailId && !pickingState.isBatchComplete && activeIsNonRFID && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-24 right-6 md:bottom-28 md:right-8 lg:right-[calc(25%+2rem)] xl:right-[calc(25%+2rem)] z-[60]"
                    >
                        <Button
                            size="lg"
                            onClick={() => pickingState.setIsManualModalOpen(true)}
                            className="h-16 w-16 md:h-16 md:w-auto md:px-8 rounded-full ring-4 ring-background shadow-2xl shadow-blue-500/40 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
                        >
                            <Keyboard className="h-6 w-6 md:h-6 md:w-6" />
                            <span className="hidden md:inline font-black uppercase tracking-widest text-sm">
                                Manual Entry
                            </span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            <ManualOverrideModal
                isOpen={pickingState.isManualModalOpen}
                onClose={() => pickingState.setIsManualModalOpen(false)}
                onSubmit={pickingState.handleManualSubmit}
                manualQuantity={pickingState.manualQuantity}
                setManualQuantity={pickingState.setManualQuantity}
                isScanning={pickingState.isScanning}
                activeDetail={pickingState.activeDetail}
            />
        </div>
    );
}
