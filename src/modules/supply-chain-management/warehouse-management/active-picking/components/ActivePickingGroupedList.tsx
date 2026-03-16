"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    CheckCircle2, ChevronRight, Factory, Keyboard, ListTodo, ScanLine, Tags, Barcode, Send, Search, PackageX, AlertOctagon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { ConsolidatorDetailsDto } from "../types";

interface Props {
    cldtoNo: string; // 🚀 ADDED: Pass the current CLDTO number from the parent to validate against
    groupedDetails: Record<string, Record<string, Record<string, ConsolidatorDetailsDto[]>>>;
    activeDetailId: number | null;
    setActiveDetailId: (id: number | null) => void;
    onOpenManualModal: () => void;
    onFinalizeBatch: () => void;
}

export function ActivePickingGroupedList({
                                             cldtoNo,
                                             groupedDetails,
                                             activeDetailId,
                                             setActiveDetailId,
                                             onOpenManualModal,
                                             onFinalizeBatch
                                         }: Props) {
    const [searchQuery, setSearchQuery] = useState("");

    // Force End Confirmation State
    const [showForceEndDialog, setShowForceEndDialog] = useState(false);
    const [cldtoInput, setCldtoInput] = useState("");
    const [hasError, setHasError] = useState(false);

    // Auto-scroll to the active card when a blind scan occurs
    useEffect(() => {
        if (activeDetailId) {
            const element = document.getElementById(`pick-card-${activeDetailId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeDetailId]);

    const allItems = useMemo(() => Object.values(groupedDetails).flatMap(b => Object.values(b).flatMap(c => Object.values(c).flat())), [groupedDetails]);
    const totalOrdered = useMemo(() => allItems.reduce((sum, item) => sum + (item.orderedQuantity || 0), 0), [allItems]);
    const totalPicked = useMemo(() => allItems.reduce((sum, item) => sum + (item.pickedQuantity || 0), 0), [allItems]);
    const isFullyDone = totalPicked >= totalOrdered && totalOrdered > 0;

    const filteredGroupedDetails = useMemo(() => {
        if (!searchQuery.trim()) return groupedDetails;

        const lowerQuery = searchQuery.toLowerCase();
        const result: typeof groupedDetails = {};

        Object.entries(groupedDetails).forEach(([supplier, brands]) => {
            const filteredBrands: Record<string, Record<string, ConsolidatorDetailsDto[]>> = {};

            Object.entries(brands).forEach(([brand, categories]) => {
                const filteredCategories: Record<string, ConsolidatorDetailsDto[]> = {};

                Object.entries(categories).forEach(([category, items]) => {
                    const filteredItems = items.filter(item =>
                        item.productName?.toLowerCase().includes(lowerQuery) ||
                        item.barcode?.toLowerCase().includes(lowerQuery) ||
                        item.productId?.toString().includes(lowerQuery)
                    );

                    if (filteredItems.length > 0) {
                        filteredCategories[category] = filteredItems;
                    }
                });

                if (Object.keys(filteredCategories).length > 0) {
                    filteredBrands[brand] = filteredCategories;
                }
            });

            if (Object.keys(filteredBrands).length > 0) {
                result[supplier] = filteredBrands;
            }
        });

        return result;
    }, [groupedDetails, searchQuery]);

    const isFilteredEmpty = Object.keys(filteredGroupedDetails).length === 0;

    // Handle end session logic
    const handleEndSessionClick = () => {
        if (isFullyDone) {
            onFinalizeBatch();
        } else {
            setCldtoInput("");
            setHasError(false);
            setShowForceEndDialog(true);
        }
    };

    const handleConfirmForceEnd = () => {
        // Case insensitive match to prevent frustrating user errors
        if (cldtoInput.trim().toLowerCase() === cldtoNo.trim().toLowerCase()) {
            setShowForceEndDialog(false);
            onFinalizeBatch();
        } else {
            setHasError(true);
        }
    };

    return (
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col border-r border-border/40 bg-muted/10 min-h-0 relative">
            <div className="shrink-0 p-4 bg-card border-b border-border/40 flex flex-col gap-4 shadow-sm z-20">
                <div className="flex justify-between items-center">
                    <h2 className="font-black uppercase text-sm tracking-widest text-muted-foreground flex items-center gap-2">
                        <ListTodo className="h-5 w-5 text-primary"/> Grouped Pick Cards
                    </h2>
                    <Button
                        variant="ghost" size="sm" onClick={handleEndSessionClick}
                        className="text-xs font-black uppercase tracking-tighter hover:bg-primary/10 hover:text-primary transition-all md:hidden"
                    >
                        End Session
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50"/>
                    <Input
                        placeholder="Filter by Product Name, Barcode, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 bg-muted/50 border-border/50 font-medium placeholder:font-normal focus-visible:ring-primary/20 rounded-xl"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0" type="always">
                <div className="p-4 md:p-6 space-y-8 pb-40">
                    {isFilteredEmpty ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                            <PackageX className="h-16 w-16 mb-4 opacity-50"/>
                            <p className="font-black uppercase tracking-widest">No Items Found</p>
                        </div>
                    ) : (
                        Object.entries(filteredGroupedDetails).map(([supplier, brands]) => (
                            <div key={supplier} className="border border-border/50 rounded-2xl shadow-sm bg-card relative">
                                <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md px-5 py-4 border-b border-border/50 flex items-center gap-3 rounded-t-2xl shadow-sm">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Factory className="w-5 h-5 text-primary"/>
                                    </div>
                                    <h3 className="font-black uppercase tracking-widest text-foreground text-base">
                                        {supplier}
                                    </h3>
                                </div>

                                <div className="p-3 md:p-5 space-y-8">
                                    {Object.entries(brands).map(([brand, categories]) => (
                                        <div key={brand} className="space-y-5">
                                            <div className="flex items-center gap-2 text-muted-foreground/80 bg-muted/30 px-3 py-2 rounded-lg border border-border/40">
                                                <ChevronRight className="w-4 h-4 text-primary"/>
                                                <span className="text-sm font-black uppercase tracking-[0.2em] text-foreground">{brand}</span>
                                            </div>

                                            <div className="space-y-6 pl-2 md:pl-6">
                                                {Object.entries(categories).map(([category, items]) => (
                                                    <div key={category} className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <Tags className="w-4 h-4 text-muted-foreground/50"/>
                                                            <span className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-widest">{category}</span>
                                                        </div>

                                                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                                            {items.map((detail) => {
                                                                const isComplete = (detail.pickedQuantity || 0) >= (detail.orderedQuantity || 0);
                                                                const isActive = activeDetailId === detail.id;
                                                                const isRFIDRequired = (detail.unitOrder || 0) === 3;

                                                                return (
                                                                    <div
                                                                        key={detail.id}
                                                                        id={`pick-card-${detail.id}`}
                                                                        onClick={() => !isComplete && setActiveDetailId(detail.id || null)}
                                                                        className={`
                                                                            relative flex flex-col p-5 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group min-h-[220px]
                                                                            ${isComplete
                                                                            ? "bg-emerald-500/5 border-emerald-500/20 opacity-70 grayscale-[30%]"
                                                                            : isActive
                                                                                ? "bg-primary/5 border-primary shadow-xl shadow-primary/10 scale-[1.02] z-10"
                                                                                : "bg-card border-border/60 hover:border-primary/40 hover:shadow-md"
                                                                        }
                                                                        `}
                                                                    >
                                                                        {isActive && (
                                                                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]"/>
                                                                        )}

                                                                        <div className="flex-1 flex flex-col gap-3">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 rounded-md">
                                                                                    ID: {detail.productId}
                                                                                </Badge>

                                                                                {detail.barcode ? (
                                                                                    <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-background border-border/50 text-muted-foreground">
                                                                                        BC: {detail.barcode}
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="destructive" className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border-destructive/20">
                                                                                        NO BARCODE
                                                                                    </Badge>
                                                                                )}
                                                                            </div>

                                                                            <h3 className={`text-lg font-bold leading-tight ${isComplete ? 'line-through decoration-emerald-500/50 text-muted-foreground' : 'text-foreground'}`}>
                                                                                {detail.productName}
                                                                                <span className="text-muted-foreground/60 font-medium ml-2 text-base whitespace-nowrap">
                                                                                    ({detail.unitName || 'PC'})
                                                                                </span>
                                                                            </h3>

                                                                            <div className="mt-auto pt-2">
                                                                                <Badge variant="outline" className={`text-[9px] uppercase font-black px-2 py-0.5 ${isRFIDRequired ? 'text-primary border-primary/40 bg-primary/5' : 'text-blue-500 border-blue-500/40 bg-blue-500/5'}`}>
                                                                                    {isRFIDRequired ? "RFID Required" : "Barcode / Pack"}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-4 flex items-center justify-between bg-background/50 p-3 rounded-xl border border-border/50 shadow-sm">
                                                                            <div className="flex items-center gap-4">
                                                                                <div>
                                                                                    <div className={`text-2xl font-black italic leading-none ${isComplete ? 'text-emerald-500' : 'text-foreground'}`}>
                                                                                        {detail.pickedQuantity || 0}
                                                                                    </div>
                                                                                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Scanned</div>
                                                                                </div>
                                                                                <div className="h-8 w-px bg-border/60"/>
                                                                                <div>
                                                                                    <div className="text-xl font-black italic text-muted-foreground/40 leading-none">
                                                                                        {detail.orderedQuantity}
                                                                                    </div>
                                                                                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Required</div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center justify-center gap-2 shrink-0">
                                                                                {isComplete ? (
                                                                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 drop-shadow-sm"/>
                                                                                ) : isActive ? (
                                                                                    <>
                                                                                        {!isRFIDRequired && (
                                                                                            <Button
                                                                                                variant="outline" size="icon"
                                                                                                onClick={(e) => { e.stopPropagation(); onOpenManualModal(); }}
                                                                                                className="h-9 w-9 rounded-full border-dashed border-blue-500/50 text-blue-500 hover:bg-blue-500/10 shrink-0"
                                                                                            >
                                                                                                <Keyboard className="h-4 w-4"/>
                                                                                            </Button>
                                                                                        )}
                                                                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center animate-pulse shadow-inner shrink-0 ${isRFIDRequired ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-500'}`}>
                                                                                            {isRFIDRequired ? <ScanLine className="h-4 w-4"/> : <Barcode className="h-4 w-4"/>}
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="h-9 w-9 rounded-full border-2 border-dashed border-border/50 group-hover:border-primary/30 transition-colors shrink-0"/>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] z-50 pointer-events-none">
                <motion.div
                    initial={{y: 100, opacity: 0}} animate={{y: 0, opacity: 1}}
                    className="bg-card/95 border-2 border-primary/20 rounded-3xl p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-center justify-between gap-6 pointer-events-auto"
                >
                    <div className="pl-2 shrink-0">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black italic">{totalPicked}</span>
                            <span className="text-sm font-bold text-muted-foreground">/ {totalOrdered}</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Global Progress</p>
                    </div>

                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <motion.div
                            className={`h-full ${isFullyDone ? 'bg-emerald-500' : 'bg-primary'}`}
                            initial={{width: 0}}
                            animate={{width: `${totalOrdered > 0 ? (totalPicked / totalOrdered) * 100 : 0}%`}}
                            transition={{ease: "circOut", duration: 0.8}}
                        />
                    </div>

                    <Button
                        onClick={handleEndSessionClick}
                        className={`h-14 px-6 md:px-8 rounded-2xl font-black uppercase italic tracking-tighter text-base md:text-lg shadow-lg group shrink-0 ${
                            isFullyDone ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'
                        }`}
                    >
                        {isFullyDone ? 'Finish' : 'Force End'}
                        <Send className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform"/>
                    </Button>
                </motion.div>
            </div>

            {/* Force End Confirmation Dialog */}
            <Dialog open={showForceEndDialog} onOpenChange={setShowForceEndDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive font-black uppercase tracking-widest">
                            <AlertOctagon className="h-5 w-5" />
                            Incomplete Batch
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-2">
                            You have not finished scanning all items. To forcefully end this batch, please type the CLDTO Number <strong className="text-foreground border-b border-dashed border-foreground pb-0.5">{cldtoNo}</strong> below to confirm.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2 py-4">
                        <Input
                            placeholder="Enter CLDTO No."
                            value={cldtoInput}
                            onChange={(e) => {
                                setCldtoInput(e.target.value);
                                if (hasError) setHasError(false);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmForceEnd()}
                            className={`h-12 text-center font-mono font-bold text-lg tracking-widest uppercase ${
                                hasError ? "border-destructive focus-visible:ring-destructive/20 bg-destructive/5" : ""
                            }`}
                        />
                        {hasError && (
                            <p className="text-[11px] font-bold text-destructive text-center uppercase tracking-widest">
                                Incorrect CLDTO Number. Please try again.
                            </p>
                        )}
                    </div>

                    <DialogFooter className="sm:justify-between flex-row gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowForceEndDialog(false)}
                            className="font-bold uppercase tracking-widest text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmForceEnd}
                            disabled={!cldtoInput.trim()}
                            className="font-black uppercase tracking-widest text-xs"
                        >
                            Confirm Force End
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}