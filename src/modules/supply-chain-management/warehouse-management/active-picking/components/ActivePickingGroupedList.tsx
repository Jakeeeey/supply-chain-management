"use client";

import React, {useState, useMemo, useEffect} from "react";
import {
    CheckCircle2, ChevronRight, ChevronDown, Factory, Keyboard, ListTodo, ScanLine, Barcode,
    Send, Search, PackageX, Zap, FilterX
} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {motion} from "framer-motion";
import {ConsolidatorDetailsDto} from "../types";
import {usePickingList} from "../hooks/usePickingList";
import {ForceEndDialog} from "./ForceEndDialog";

interface Props {
    cldtoNo: string;
    groupedDetails: Record<string, Record<string, Record<string, ConsolidatorDetailsDto[]>>>;
    activeDetailId: number | null;
    setActiveDetailId: (id: number | null) => void;
    onOpenManualModal: () => void;
    onFinalizeBatch: () => void;
}

export function ActivePickingGroupedList({
                                             cldtoNo, groupedDetails, activeDetailId,
                                             setActiveDetailId, onOpenManualModal, onFinalizeBatch
                                         }: Props) {
    const {
        searchQuery,
        setSearchQuery,
        showRfidOnly,
        setShowRfidOnly,
        collapsedSections,
        toggleCollapse,
        isSearching,
        filteredGroupedDetails,
        isFilteredEmpty,
        clearFilters,
    } = usePickingList(groupedDetails);

    const [showForceEndDialog, setShowForceEndDialog] = useState(false);

    useEffect(() => {
        if (activeDetailId) {
            const element = document.getElementById(`pick-card-${activeDetailId}`);
            if (element) {
                element.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
        }
    }, [activeDetailId]);

    const allItems = useMemo(() => Object.values(groupedDetails).flatMap(b => Object.values(b).flatMap(c => Object.values(c).flat())), [groupedDetails]);
    const totalOrdered = useMemo(() => allItems.reduce((sum, item) => sum + (item.orderedQuantity || 0), 0), [allItems]);
    const totalPicked = useMemo(() => allItems.reduce((sum, item) => sum + (item.pickedQuantity || 0), 0), [allItems]);
    const isFullyDone = totalPicked >= totalOrdered && totalOrdered > 0;

    const handleEndSessionClick = () => {
        if (isFullyDone) {
            onFinalizeBatch();
        } else {
            setShowForceEndDialog(true);
        }
    };

    return (
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col border-r border-border/40 bg-muted/10 min-h-0 relative">

            {/* STICKY FILTERS HEADER */}
            <div className="shrink-0 p-3 bg-card border-b border-border/40 flex flex-col gap-3 shadow-sm z-20">
                <div className="flex justify-between items-center">
                    <h2 className="font-black uppercase text-xs tracking-widest text-muted-foreground flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-primary"/> Grouped Picks
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showRfidOnly ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowRfidOnly(!showRfidOnly)}
                            className={`text-[9px] font-black uppercase tracking-widest h-7 rounded-md transition-all ${showRfidOnly ? "bg-primary shadow-sm" : "text-muted-foreground"}`}
                        >
                            <Zap className={`mr-1 h-3 w-3 ${showRfidOnly ? "fill-current" : ""}`}/> RFID Only
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"/>
                        <Input
                            placeholder="Filter Name, Barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-muted/50 border-border/50 text-sm rounded-lg"
                        />
                    </div>
                    {isSearching && (
                        <Button variant="ghost"
                                className="h-10 w-10 rounded-lg text-muted-foreground hover:text-destructive"
                                onClick={clearFilters}>
                            <FilterX className="h-4 w-4"/>
                        </Button>
                    )}
                </div>
            </div>

            {/* 🚀 SCROLLABLE LIST (Swapped to native overflow-y-auto so sticky headers actually work!) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
                <div className="p-3 md:p-4 space-y-6 pb-6">
                    {isFilteredEmpty ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                            <PackageX className="h-12 w-12 mb-3 opacity-50"/>
                            <p className="font-black text-xs uppercase tracking-widest">No Items Found</p>
                        </div>
                    ) : (
                        Object.entries(filteredGroupedDetails).map(([supplier, brands]) => {
                            const supplierId = `sup-${supplier}`;
                            const isSupplierCollapsed = !isSearching && collapsedSections.has(supplierId);

                            return (
                                <div key={supplier}
                                     className="border border-border/50 rounded-xl shadow-sm bg-card relative overflow-hidden transition-all duration-300">

                                    {/* THIS NOW STICKS PERFECTLY WITHIN ITS PARENT */}
                                    <div
                                        className="sticky top-0 z-10 bg-card/95 backdrop-blur-md px-4 py-3 border-b border-border/50 flex items-center justify-between shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
                                        onClick={() => toggleCollapse(supplierId)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Factory className="w-4 h-4 text-primary opacity-80"/>
                                            <h3 className="font-black uppercase tracking-widest text-foreground text-sm">{supplier}</h3>
                                        </div>
                                        <ChevronDown
                                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isSupplierCollapsed ? '-rotate-90' : ''}`}/>
                                    </div>

                                    {!isSupplierCollapsed && (
                                        <div className="p-3 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                            {Object.entries(brands).map(([brand, categories]) => (
                                                <React.Fragment key={brand}>
                                                    {Object.entries(categories).map(([category, items]) => {
                                                        const catId = `cat-${supplier}-${brand}-${category}`;
                                                        const isCatCollapsed = !isSearching && collapsedSections.has(catId);

                                                        return (
                                                            <div key={category} className="space-y-3">
                                                                <div
                                                                    className="flex items-center justify-between text-muted-foreground/80 bg-muted/40 px-3 py-2 rounded-md border border-border/40 cursor-pointer hover:bg-muted/60 transition-colors"
                                                                    onClick={() => toggleCollapse(catId)}
                                                                >
                                                                    <div
                                                                        className="flex items-center gap-2 overflow-hidden">
                                                                        <ChevronRight
                                                                            className={`w-3 h-3 text-primary shrink-0 transition-transform duration-200 ${isCatCollapsed ? '' : 'rotate-90'}`}/>
                                                                        <span
                                                                            className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">
                                                                            {brand} <span
                                                                            className="text-muted-foreground/40 font-medium mx-1">|</span> {category}
                                                                        </span>
                                                                    </div>
                                                                    <span
                                                                        className="text-[9px] font-bold shrink-0 bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                                                                        {items.length} {items.length === 1 ? 'Item' : 'Items'}
                                                                    </span>
                                                                </div>

                                                                {!isCatCollapsed && (
                                                                    <div
                                                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in fade-in duration-200">
                                                                        {items.map((detail) => {
                                                                            const isComplete = (detail.pickedQuantity || 0) >= (detail.orderedQuantity || 0);
                                                                            const isActive = activeDetailId === detail.id;
                                                                            const isRFIDPreferred = (detail.unitOrder || 0) === 3;

                                                                            return (
                                                                                <div
                                                                                    key={detail.id}
                                                                                    id={`pick-card-${detail.id}`}
                                                                                    onClick={() => !isComplete && setActiveDetailId(detail.id || null)}
                                                                                    className={`relative flex flex-col p-3 rounded-xl border-2 transition-all cursor-pointer overflow-hidden group ${isComplete ? "bg-emerald-500/5 border-emerald-500/20 opacity-60 grayscale-[50%]" : isActive ? "bg-primary/5 border-primary shadow-md shadow-primary/10 z-10" : "bg-card border-border/60 hover:border-primary/30"
                                                                                    }`}
                                                                                >
                                                                                    {isActive && <div
                                                                                        className="absolute top-0 left-0 bottom-0 w-1 bg-primary"/>}

                                                                                    <div
                                                                                        className="flex-1 flex flex-col gap-1.5 mb-3">
                                                                                        <div
                                                                                            className="flex justify-between items-start gap-2">
                                                                                            <h3 className={`text-sm font-bold leading-tight line-clamp-2 ${isComplete ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                {detail.productName}
                                                                                            </h3>
                                                                                            <Badge variant="outline"
                                                                                                   className={`text-[8px] uppercase font-black px-1.5 py-0 shrink-0 ${isRFIDPreferred ? 'text-amber-500 border-amber-500/30' : 'text-blue-500 border-blue-500/30'}`}>
                                                                                                {isRFIDPreferred ? "RFID" : "BC"}
                                                                                            </Badge>
                                                                                        </div>

                                                                                        <div
                                                                                            className="flex items-center gap-1.5 flex-wrap">
                                                                                            <span
                                                                                                className="text-[10px] font-mono text-muted-foreground">ID:{detail.productId}</span>
                                                                                            <span
                                                                                                className="text-[10px] text-muted-foreground">({detail.unitName || 'PC'})</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div
                                                                                        className="flex items-center justify-between bg-background/60 p-2 rounded-lg border border-border/50">
                                                                                        <div
                                                                                            className="flex items-baseline gap-1">
                                                                                            <span
                                                                                                className={`text-xl font-black italic leading-none ${isComplete ? 'text-emerald-500' : 'text-foreground'}`}>
                                                                                                {detail.pickedQuantity || 0}
                                                                                            </span>
                                                                                            <span
                                                                                                className="text-xs font-bold text-muted-foreground/60">/ {detail.orderedQuantity}</span>
                                                                                        </div>

                                                                                        <div
                                                                                            className="flex items-center gap-1 shrink-0">
                                                                                            {isComplete ? (
                                                                                                <CheckCircle2
                                                                                                    className="h-6 w-6 text-emerald-500"/>
                                                                                            ) : isActive ? (
                                                                                                <>
                                                                                                    <Button
                                                                                                        variant="outline"
                                                                                                        size="icon"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            onOpenManualModal();
                                                                                                        }}
                                                                                                        className="h-7 w-7 rounded-md border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
                                                                                                        <Keyboard
                                                                                                            className="h-3 w-3"/>
                                                                                                    </Button>
                                                                                                    <div
                                                                                                        className={`h-7 w-7 rounded-md flex items-center justify-center ${isRFIDPreferred ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                                                        {isRFIDPreferred ?
                                                                                                            <ScanLine
                                                                                                                className="h-3 w-3"/> :
                                                                                                            <Barcode
                                                                                                                className="h-3 w-3"/>}
                                                                                                    </div>
                                                                                                </>
                                                                                            ) : (
                                                                                                <div
                                                                                                    className="h-7 w-7 rounded-md border border-dashed border-border/50"/>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* STICKY ACTION FOOTER */}
            <div
                className="shrink-0 bg-card border-t border-border/40 p-4 md:px-6 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.05)] z-40 relative">
                <div className="flex items-center justify-between gap-4 lg:gap-8 mx-auto">
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overall Progress</span>
                            <div className="flex items-baseline gap-1">
                                <span
                                    className="text-2xl font-black italic leading-none text-foreground">{totalPicked}</span>
                                <span
                                    className="text-sm font-bold text-muted-foreground leading-none">/ {totalOrdered}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <motion.div
                            className={`h-full ${isFullyDone ? 'bg-emerald-500' : 'bg-primary'}`}
                            initial={{width: 0}}
                            animate={{width: `${totalOrdered > 0 ? (totalPicked / totalOrdered) * 100 : 0}%`}}
                            transition={{ease: "circOut", duration: 0.8}}
                        />
                    </div>

                    <Button
                        onClick={handleEndSessionClick}
                        size="lg"
                        className={`h-12 px-6 md:px-8 rounded-xl font-black uppercase tracking-widest shadow-md shrink-0 transition-all ${isFullyDone ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white' : 'bg-destructive hover:bg-destructive/90 shadow-destructive/20 text-white'}`}
                    >
                        {isFullyDone ? 'Finish Batch' : 'Force End'} <Send className="ml-3 h-5 w-5"/>
                    </Button>
                </div>
            </div>

            <ForceEndDialog
                isOpen={showForceEndDialog}
                onClose={() => setShowForceEndDialog(false)}
                onConfirm={onFinalizeBatch}
                cldtoNo={cldtoNo}
            />
        </div>
    );
}