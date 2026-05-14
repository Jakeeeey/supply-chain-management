"use client";

import * as React from "react";
import { useInbound } from "./hooks/useInbound";
import { InboundList } from "./components/InboundList";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InboundModule() {
    const { filteredPlans, loading, search, setSearch, reload } = useInbound();

    return (
        <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20 px-6 md:px-10 lg:px-16">
            {/* Header section */}
            <div className="relative">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                <Truck className="h-5 w-5 text-rose-600" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-600/60">Fleet Operations</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-foreground leading-[0.9]">
                            Inbound <span className="text-rose-600">Manual</span>
                        </h1>
                        <p className="text-lg text-muted-foreground font-medium max-w-xl">
                            Process trip arrivals manually. Record customer feedback, verify delivery status, and complete the inbound journey.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center justify-center bg-card/40 border border-border/40 shadow-xl rounded-[2rem] px-8 py-6 min-w-[120px] backdrop-blur-md transition-all hover:border-rose-500/30 group">
                            <span className="text-5xl font-black tracking-tighter text-rose-600 transition-transform group-hover:scale-110 duration-500">
                                {filteredPlans.length}
                            </span>
                            <div className="flex flex-col items-center leading-none mt-2 opacity-40">
                                <span className="text-[10px] text-foreground uppercase font-black tracking-widest">En Route</span>
                                <span className="text-[10px] text-foreground uppercase font-black tracking-widest">Trips</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters section */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-rose-500 transition-colors" />
                    <Input 
                        placeholder="Search by DP number, driver, or vehicle plate..." 
                        className="pl-14 h-16 rounded-[1.25rem] border-border/40 bg-card/40 backdrop-blur-sm text-lg font-bold transition-all focus:ring-rose-500/20 focus:border-rose-500/40"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-16 w-16 rounded-[1.25rem] border-border/40 bg-card/40 backdrop-blur-sm hover:bg-rose-500/5 hover:border-rose-500/30 text-muted-foreground transition-all active:scale-95"
                    onClick={() => reload()}
                    disabled={loading}
                >
                    <RefreshCcw className={`h-6 w-6 ${loading ? 'animate-spin text-rose-600' : ''}`} />
                </Button>
            </div>

            {/* List section */}
            <div className="min-h-[500px]">
                <InboundList 
                    plans={filteredPlans} 
                    loading={loading} 
                    onSuccess={reload} 
                />
            </div>
        </div>
    );
}
