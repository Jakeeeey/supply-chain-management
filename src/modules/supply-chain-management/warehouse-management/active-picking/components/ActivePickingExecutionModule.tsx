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
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative">
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

            <div className="flex-1 min-h-0 flex overflow-hidden">
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

            {/* 🚀 MASSIVE FLOATING ACTION BUTTON FOR MANUAL ENTRY */}
            <AnimatePresence>
                {pickingState.activeDetailId && !pickingState.isBatchComplete && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 40 }}
                        transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                        // Positioned bottom-right. Adjust 'bottom-24' if it overlaps your global progress footer!
                        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[60]"
                    >
                        <Button
                            size="lg"
                            onClick={() => pickingState.setIsManualModalOpen(true)}
                            className="h-16 w-16 md:h-16 md:w-auto md:px-8 rounded-full shadow-[0_10px_40px_-10px_rgba(59,130,246,0.7)] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3 active:scale-90 transition-transform"
                        >
                            <Keyboard className="h-7 w-7 md:h-6 md:w-6" />
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