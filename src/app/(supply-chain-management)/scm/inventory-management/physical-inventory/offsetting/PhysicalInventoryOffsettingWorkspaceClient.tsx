"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { PhysicalInventoryOffsettingModule } from "@/modules/supply-chain-management/inventory-management/physical-inventory-offsetting";
import {
    PhysicalInventoryListModule,
    type PhysicalInventoryListRow,
} from "@/modules/supply-chain-management/inventory-management/physical-inventory-list";

export default function PhysicalInventoryOffsettingWorkspaceClient() {
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

            {isListCollapsed ? (
                <div className="min-w-0">
                    {selectedHeaderId ? (
                        <PhysicalInventoryOffsettingModule
                            key={selectedHeaderId}
                            phId={selectedHeaderId}
                        />
                    ) : (
                        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border bg-background">
                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    No Physical Inventory selected
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Click “Show List” and open a record to start offsetting.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
                    <div className="min-w-0">
                        <PhysicalInventoryListModule
                            selectedHeaderId={selectedHeaderId}
                            onOpenRecord={handleOpenRecord}
                        />
                    </div>

                    <div className="min-w-0">
                        {selectedHeaderId ? (
                            <PhysicalInventoryOffsettingModule
                                key={selectedHeaderId}
                                phId={selectedHeaderId}
                            />
                        ) : (
                            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border bg-background">
                                <div className="text-center">
                                    <p className="text-sm font-medium">
                                        Select a Physical Inventory record
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Choose a record from the list to open the offsetting module.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}