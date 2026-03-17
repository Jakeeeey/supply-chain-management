"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { PhysicalInventoryManagementModule } from "@/modules/supply-chain-management/inventory-management/physical-inventory-management/PhysicalInventoryManagementModule";
import {
    PhysicalInventoryListModule,
    type PhysicalInventoryListRow,
} from "@/modules/supply-chain-management/inventory-management/physical-inventory-list";

export default function PhysicalInventoryWorkspaceClient() {
    const [selectedHeaderId, setSelectedHeaderId] = React.useState<number | null>(null);
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
        setIsListCollapsed(true);
    }, []);

    const handleCreateNew = React.useCallback(() => {
        setSelectedHeaderId(null);
        setIsListCollapsed(true);
    }, []);

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-background px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="min-w-0 text-sm text-muted-foreground">
                    {isListCollapsed
                        ? "PI list is hidden for a wider work area."
                        : "Open a record from the list or hide it for a wider work area."}
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

            {isListCollapsed ? (
                <div className="min-w-0">
                    <PhysicalInventoryManagementModule
                        key={selectedHeaderId ?? "new"}
                        initialHeaderId={selectedHeaderId}
                    />
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
                    <div className="min-w-0">
                        <PhysicalInventoryListModule
                            selectedHeaderId={selectedHeaderId}
                            onOpenRecord={handleOpenRecord}
                            onCreateNew={handleCreateNew}
                        />
                    </div>

                    <div className="min-w-0">
                        <PhysicalInventoryManagementModule
                            key={selectedHeaderId ?? "new"}
                            initialHeaderId={selectedHeaderId}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}