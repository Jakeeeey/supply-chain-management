"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface KioskSearchProps {
    search: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusChange: (value: string) => void;
}

export function KioskSearch({
    search,
    onSearchChange,
    statusFilter,
    onStatusChange,
}: KioskSearchProps) {
    return (
        <div className="flex flex-col gap-6 bg-background/60 backdrop-blur-xl p-4 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md dark:bg-card/40">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="relative flex-1 group">
                    <Input
                        placeholder="Search by PDP No. or Driver..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-11 bg-background/50 border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl dark:bg-muted/20"
                    />
                </div>

                <div className="flex items-center">
                    <Tabs
                        value={statusFilter}
                        onValueChange={onStatusChange}
                        className="w-full lg:w-auto"
                    >
                        <TabsList className="bg-muted/50 dark:bg-muted/10 p-1 h-11 rounded-xl w-full lg:w-auto flex overflow-x-auto no-scrollbar" variant="line">
                            <TabsTrigger value="All Statuses" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                                All Statuses
                            </TabsTrigger>
                            <TabsTrigger value="For Dispatch" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                                For Dispatch
                            </TabsTrigger>
                            <TabsTrigger value="For Inbound" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                                For Inbound
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
