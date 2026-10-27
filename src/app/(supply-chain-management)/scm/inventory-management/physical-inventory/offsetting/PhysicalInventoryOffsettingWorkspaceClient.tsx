"use client";

import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { PhysicalInventoryOffsettingModule } from "@/modules/supply-chain-management/inventory-management/physical-inventory-offsetting";
import {
    PhysicalInventoryListModule,
    type PhysicalInventoryListRow,
} from "@/modules/supply-chain-management/inventory-management/physical-inventory-list";

type Props = {
    currentUser?: { id: number; name: string };
};

export default function PhysicalInventoryOffsettingWorkspaceClient({ currentUser }: Props) {
    const searchParams = useSearchParams();
    const urlPhId = searchParams.get("id");

    const [selectedHeaderId, setSelectedHeaderId] = React.useState<number | null>(null);
    const [isListCollapsed, setIsListCollapsed] = React.useState(false);

    React.useEffect(() => {
        if (urlPhId) {
            const parsed = parseInt(urlPhId, 10);
            if (!isNaN(parsed)) {
                setSelectedHeaderId(parsed);
                setIsListCollapsed(true);
            }
        }
    }, [urlPhId]);

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
        setIsListCollapsed(true);
    }, []);

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 rounded-2xl border bg-background px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="min-w-0 text-xs text-muted-foreground">
                    {isListCollapsed
                        ? selectedHeaderId
                            ? "PI list is hidden for a wider reconciliation work area."
                            : "PI list is hidden. Open the list to select a Physical Inventory for offsetting."
                        : "Select a Physical Inventory from the list to open its offsetting workspace."}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer self-start sm:self-auto"
                    onClick={() => setIsListCollapsed((prev) => !prev)}
                >
                    {isListCollapsed ? (
                        <>
                            <PanelLeftOpen className="mr-2 h-3.5 w-3.5" />
                            Show List
                        </>
                    ) : (
                        <>
                            <PanelLeftClose className="mr-2 h-3.5 w-3.5" />
                            Hide List
                        </>
                    )}
                </Button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-3">
                <AnimatePresence initial={false}>
                    {!isListCollapsed && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="w-full pb-3 lg:w-[340px] lg:pb-0 xl:w-[360px] 2xl:w-[400px]">
                                <PhysicalInventoryListModule
                                    selectedHeaderId={selectedHeaderId}
                                    onOpenRecord={handleOpenRecord}
                                    hideCreateButton={true}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="min-w-0 flex-1">
                    {selectedHeaderId ? (
                        <PhysicalInventoryOffsettingModule
                            key={selectedHeaderId}
                            phId={selectedHeaderId}
                            currentUser={currentUser}
                        />
                    ) : (
                        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border bg-background">
                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    No Physical Inventory selected
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {isListCollapsed
                                        ? "Click “Show List” and open a record to start offsetting."
                                        : "Choose a record from the list to open the offsetting module."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}