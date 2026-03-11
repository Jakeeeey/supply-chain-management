"use client";

import React from "react";
import {ConsolidatorDto} from "../types";
import {useActivePicking} from "../hooks/useActivePicking";

// Sub-components
import {ActivePickingHeader} from "./ActivePickingHeader";
import {ActivePickingGroupedList} from "./ActivePickingGroupedList";
import {ActivePickingLiveFeed} from "./ActivePickingLiveFeed";
import {ManualOverrideModal} from "./ManualOverrideModal";

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
    const pickingState = useActivePicking({batch, currentUserId});

    return (
        <div
            className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
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
                    groupedDetails={pickingState.groupedDetails}
                    activeDetailId={pickingState.activeDetailId}
                    setActiveDetailId={pickingState.setActiveDetailId}
                    onOpenManualModal={() => pickingState.setIsManualModalOpen(true)}
                    // 🚀 THE FIX: Pass the completion handler to the list component
                    onFinalizeBatch={onBatchComplete}
                />

                <ActivePickingLiveFeed
                    scanLogs={pickingState.scanLogs}
                    activeDetailId={pickingState.activeDetailId}
                    isBatchComplete={pickingState.isBatchComplete}
                />
            </div>

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