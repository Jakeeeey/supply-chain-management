"use client";

import * as React from "react";
import { useInboundOutboundKiosk } from "./hooks/useInboundOutboundKiosk";
import { KioskSearch } from "./components/KioskSearch";
import { KioskList } from "./components/KioskList";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, LayoutPanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InboundOutboundKioskModule() {
    const {
        filteredPlans,
        loading,
        error,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        reload,
    } = useInboundOutboundKiosk();

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-16 w-16 rounded-3xl bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-sm">
                    <RefreshCcw className="h-8 w-8 text-destructive animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-foreground">Sync Error</h3>
                    <p className="text-muted-foreground max-w-xs font-medium">{error}</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => void reload()}
                    className="rounded-xl h-12 px-8 font-bold border-border/60 hover:bg-muted transition-all"
                >
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Premium Header Container */}
            <div className="relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            {loading && <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground/60" />}
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Kiosk Dispatch
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Real-time monitoring and management of inbound & outbound dispatch flows with high-precision tracking.
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-card border border-border/60 shadow-sm rounded-xl px-4 py-4 w-24 transition-all hover:shadow-md hover:border-primary/30 group">
                        <span className="text-4xl font-black tracking-tighter text-primary transition-transform group-hover:scale-110 duration-300">
                            {filteredPlans.length}
                        </span>
                        <div className="flex flex-col items-center leading-none mt-1 opacity-60">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Active</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Plans</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <KioskSearch
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                />

                <div className="min-h-[500px]">
                    <KioskList plans={filteredPlans} loading={loading} onSuccess={reload} />
                </div>
            </div>
        </div >
    );
}
