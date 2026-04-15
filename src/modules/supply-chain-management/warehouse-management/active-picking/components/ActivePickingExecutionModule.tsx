"use client";

import React from "react";
import { ConsolidatorDto } from "../types";
import { useActivePicking } from "../hooks/useActivePicking";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Sub-components
import { ActivePickingHeader } from "./ActivePickingHeader";
import { ActivePickingGroupedList } from "./ActivePickingGroupedList";
import { ActivePickingLiveFeed } from "./ActivePickingLiveFeed";
import { ManualOverrideModal } from "./ManualOverrideModal";

interface ActivePickingExecutionProps {
    batch: ConsolidatorDto;
    currentUserId: number;
    onClose: () => void;
    onBatchComplete: () => void;
}

export default function ActivePickingExecution({
                                                   batch,
                                                   currentUserId,
                                                   onClose,
                                                   onBatchComplete
                                               }: ActivePickingExecutionProps) {

    // 🚀 ALL logic is now isolated in this single, clean hook
    const pickingState = useActivePicking({ batch, currentUserId });

    return (
        // 🚀 Sleeker, native-app style entrance animation
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in zoom-in-[0.98] duration-300">
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
                />
                <ActivePickingLiveFeed
                    scanLogs={pickingState.scanLogs}
                    activeDetailId={pickingState.activeDetailId}
                    isBatchComplete={pickingState.isBatchComplete}
                />
            </div>

            {/* 🚀 MODERNIZED ENTERPRISE FLOATING ACTION BUTTON */}
            <AnimatePresence>
                {pickingState.activeDetailId && !pickingState.isBatchComplete && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        // 🚀 Perfectly anchors to the split-screen boundary on desktop, hovers above sticky footer on mobile
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