"use client";

import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { MockLedgerModule } from "@/modules/supply-chain-management/inventory-management/physical-inventory-mock-ledger";
import {
    MockLedgerListModule,
    type MockLedgerListRow,
} from "@/modules/supply-chain-management/inventory-management/mock-ledger-list";
import type { MockLedgerHeaderRow } from "@/modules/supply-chain-management/inventory-management/physical-inventory-mock-ledger/types";

export default function MockLedgerWorkspaceClient({ currentUser }: { currentUser?: { id: number; name: string } | null }) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const idParam = searchParams.get("id");
    const initialId = idParam ? parseInt(idParam, 10) : null;

    const [selectedHeaderId, setSelectedHeaderId] = React.useState<number | null>(initialId);
    const [activeKey, setActiveKey] = React.useState<string>(() => initialId ? `record-${initialId}` : `new-${Date.now()}`);
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

    const handleOpenRecord = React.useCallback((row: MockLedgerListRow) => {
        setSelectedHeaderId(row.id);
        setActiveKey(`record-${row.id}`);
        setIsListCollapsed(true);
        router.replace(`?id=${row.id}`);
    }, [router]);

    const handleCreateNew = React.useCallback(() => {
        setSelectedHeaderId(null);
        setActiveKey(`new-${Date.now()}`);
        setIsListCollapsed(true);
        router.replace(`?`);
    }, [router]);

    const handleRecordChange = React.useCallback((header: MockLedgerHeaderRow) => {
        if (header.id && header.id !== selectedHeaderId) {
            setSelectedHeaderId(header.id);
            router.replace(`?id=${header.id}`);
        }
    }, [selectedHeaderId, router]);

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
                        ? "ML list is hidden for a wider work area."
                        : "Open a record from the list or hide it for a wider work area (Mock Ledger)."}
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
                                <MockLedgerListModule
                                    selectedHeaderId={selectedHeaderId}
                                    onOpenRecord={handleOpenRecord}
                                    onCreateNew={handleCreateNew}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="min-w-0 flex-1">
                    <MockLedgerModule
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
