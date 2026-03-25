"use client";

import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { PhysicalInventoryManualManagementModule } from "@/modules/supply-chain-management/inventory-management/physical-inventory-manual-management";
import {
    PhysicalInventoryListModule,
    type PhysicalInventoryListRow,
} from "@/modules/supply-chain-management/inventory-management/physical-inventory-list";

export default function PhysicalInventoryManualWorkspaceClient({ currentUser }: { currentUser?: { id: number; name: string } | null }) {
    const [selectedHeaderId, setSelectedHeaderId] = React.useState<number | null>(null);
    const [activeKey, setActiveKey] = React.useState<string>("new-0");
    const [isListCollapsed, setIsListCollapsed] = React.useState(false);

    React.useEffect(() => {
        if (typeof window === "undefined") return;

        const media = window.matchMedia("(max-width: 1279px)");
        const apply = () => {
            setIsListCollapsed(media.matches);
        };

        apply();
        media.addEventListener("change", apply);

        return () => {
            media.removeEventListener("change", apply);
        };
    }, []);

    const handleOpenRecord = React.useCallback((row: PhysicalInventoryListRow) => {
        setSelectedHeaderId(row.id);
        setActiveKey(`record-${row.id}`);
        setIsListCollapsed(true);
    }, []);

    const handleCreateNew = React.useCallback(() => {
        setSelectedHeaderId(null);
        setActiveKey(`new-${Date.now()}`);
        setIsListCollapsed(true);
    }, []);

    const handleRecordChange = React.useCallback((header: any) => {
        if (header.id && header.id !== selectedHeaderId) {
            setSelectedHeaderId(header.id);
        }
    }, [selectedHeaderId]);

    const activeHeaderId = React.useMemo(() => {
        if (activeKey.startsWith("record-")) {
            return Number(activeKey.split("-")[1]);
        }
        return null;
    }, [activeKey]);

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-background px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="min-w-0 text-sm text-muted-foreground">
                    {isListCollapsed
                        ? "PI list is hidden for a wider work area."
                        : "Open a record from the list or hide it for a wider work area (Manual Count)."}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer self-start sm:self-auto"
                    onClick={() => setIsListCollapsed((prev) => !prev)}
                >
                    {isListCollapsed ? (
                        <>
                            <PanelLeftOpen className="mr-2 h-4 w-4" />
                            Show List
                        </>
                    ) : (
                        <>
                            <PanelLeftClose className="mr-2 h-4 w-4" />
                            Hide List
                        </>
                    )}
                </Button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-4">
                <AnimatePresence initial={false}>
                    {!isListCollapsed && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="w-full pb-4 lg:w-[360px] lg:pb-0 xl:w-[380px] 2xl:w-[420px]">
                                <PhysicalInventoryListModule
                                    selectedHeaderId={selectedHeaderId}
                                    onOpenRecord={handleOpenRecord}
                                    onCreateNew={handleCreateNew}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="min-w-0 flex-1">
                    <PhysicalInventoryManualManagementModule
                        key={activeKey}
                        initialHeaderId={activeHeaderId}
                        onRecordChange={handleRecordChange}
                        currentUser={currentUser}
                    />
                </div>
            </div>
        </div>
    );
}
