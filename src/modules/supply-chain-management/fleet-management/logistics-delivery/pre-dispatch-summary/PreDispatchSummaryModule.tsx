"use client";

import React from "react";
import { FileText, PackageX, ClipboardList, Clock, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { usePreDispatch } from "./hooks/usePreDispatch";
import { PreDispatchHeader } from "./components/PreDispatchHeader";
import { DriverDispatchCard } from "./components/DriverDispatchCard";

export default function PreDispatchSummaryModule() {
    const {
        loading,
        searchQuery,
        setSearchQuery,
        activeStatus,
        setActiveStatus,
        groupedData,
        availableDispatchNos
    } = usePreDispatch();

    if (loading) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground/50">
                <FileText className="h-12 w-12 mb-4 animate-pulse" />
                <p className="font-black uppercase tracking-widest text-sm">Loading Manifests...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">

            {/* 🚀 Header now takes groupedData so the button can generate the PDF */}

            <PreDispatchHeader
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeStatus={activeStatus}
                groupedData={groupedData}
                availableDispatchNos={availableDispatchNos} // 🚀 ADD THIS LINE
            />
            {/* --- Status Toggles --- */}
            <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border/40 shadow-sm w-fit mx-auto sm:mx-0">
                <Button
                    variant={activeStatus === "PENDING" ? "default" : "ghost"}
                    onClick={() => setActiveStatus("PENDING")}
                    className="rounded-xl px-6 font-black uppercase tracking-widest text-xs"
                >
                    <Clock className="w-4 h-4 mr-2" /> Pending Dispatches
                </Button>
                <Button
                    variant={activeStatus === "DELIVERED" ? "default" : "ghost"}
                    onClick={() => setActiveStatus("DELIVERED")}
                    className={`rounded-xl px-6 font-black uppercase tracking-widest text-xs ${activeStatus === 'DELIVERED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Delivered
                </Button>
            </div>

            {/* --- Content --- */}
            {availableDispatchNos.length === 0 ? (
                <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground/50 bg-card rounded-3xl border border-dashed border-border/60">
                    <PackageX className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-black uppercase tracking-widest text-sm">No {activeStatus} Data Found</p>
                </div>
            ) : (
                <Tabs defaultValue={availableDispatchNos[0]} className="w-full">
                    <TabsList className="bg-muted/50 p-1 rounded-2xl mb-4 sm:mb-6 inline-flex overflow-x-auto max-w-full">
                        {availableDispatchNos.map(dispatchNo => (
                            <TabsTrigger
                                key={dispatchNo}
                                value={dispatchNo}
                                className="rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs px-4 sm:px-6 py-2 sm:py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap"
                            >
                                <ClipboardList className="w-3.5 h-3.5 mr-1.5 sm:mr-2 text-primary" />
                                {dispatchNo}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {Object.entries(groupedData).map(([dispatchNo, drivers]) => (
                        <TabsContent key={dispatchNo} value={dispatchNo} className="space-y-4 sm:space-y-6">
                            {Object.entries(drivers).map(([driver, customers]) => (
                                <DriverDispatchCard key={driver} driver={driver} customers={customers} />
                            ))}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}