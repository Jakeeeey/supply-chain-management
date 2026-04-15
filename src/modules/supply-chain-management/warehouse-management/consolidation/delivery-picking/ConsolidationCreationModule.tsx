"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Package, ClipboardList, ChevronRight, Tags, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";

// 🚀 Modularized Success Component
import ConsolidationCreationSuccess from "./components/ConsolidationCreationSuccess";
import { BranchSelector } from "./components/BranchSelector";

import {
    fetchDispatchPlans,
    fetchConsolidationPreview,
    generateConsolidationBatch,
    fetchActiveBranches
} from "./providers/fetchProvider";
import { BranchDto, ConsolidationPreviewItem, ConsolidatorDto } from "./types";

interface ConsolidationCreationModuleProps {
    onSuccess?: () => void;
    branchId?: number;
}

export default function ConsolidationCreationModule({
                                                        onSuccess,
                                                        branchId: initialBranchId
                                                    }: ConsolidationCreationModuleProps) {
    const [branches, setBranches] = useState<BranchDto[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);

    const [availablePdps, setAvailablePdps] = useState<unknown[]>([]);
    const [isLoadingPdps, setIsLoadingPdps] = useState(false);
    const [isBranchesLoading, setIsBranchesLoading] = useState(true);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [previewData, setPreviewData] = useState<ConsolidationPreviewItem[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [successBatch, setSuccessBatch] = useState<ConsolidatorDto | null>(null);

    // --- DATA FETCHING EFFECTS ---
    useEffect(() => {
        const loadBranches = async () => {
            setIsBranchesLoading(true);
            try {
                const data = await fetchActiveBranches();
                if (data && data.length > 0) setBranches(data);
            } finally {
                setIsBranchesLoading(false);
            }
        };
        loadBranches();
    }, []);

    useEffect(() => {
        if (initialBranchId) {
            setSelectedBranchId(initialBranchId);
        }
    }, [initialBranchId]);

    useEffect(() => {
        if (!selectedBranchId) {
            setAvailablePdps([]);
            return;
        }
        const loadPdps = async () => {
            setIsLoadingPdps(true);
            try {
                const data = await fetchDispatchPlans(selectedBranchId.toString());
                setAvailablePdps(data || []);
            } catch (error) {
                console.error("Failed to load PDPs", error);
            } finally {
                setIsLoadingPdps(false);
            }
        };
        loadPdps();
    }, [selectedBranchId]);

    useEffect(() => {
        if (selectedIds.length === 0) {
            setPreviewData([]);
            return;
        }
        const loadPreview = async () => {
            setIsLoadingPreview(true);
            try {
                const data = await fetchConsolidationPreview(selectedIds);
                setPreviewData(data || []);
            } catch (error) { console.error("Failed to load preview", error); }
            finally { setIsLoadingPreview(false); }
        };
        loadPreview();
    }, [selectedIds]);

    const groupedData = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, ConsolidationPreviewItem[]>>> = {};
        previewData.forEach(item => {
            const supplier = item.supplierShortcut || "GENERAL";
            const brand = item.brand || "UNBRANDED";
            const category = item.category || "UNCATEGORIZED";

            if (!groups[supplier]) groups[supplier] = {};
            if (!groups[supplier][brand]) groups[supplier][brand] = {};
            if (!groups[supplier][brand][category]) groups[supplier][brand][category] = [];

            groups[supplier][brand][category].push(item);
        });
        return groups;
    }, [previewData]);

    const handleGenerateBatch = async () => {
        if (selectedIds.length === 0) return;
        setIsSubmitting(true);
        try {
            const result = await generateConsolidationBatch(selectedIds);
            if (result) setSuccessBatch(result);
        } catch (error) { console.error("Submission Error:", error); }
        finally { setIsSubmitting(false); }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const hasShortage = previewData.some(item => (item.runningInventory || 0) < (item.totalAllocated || 0));

    if (successBatch) {
        return (
            <ConsolidationCreationSuccess
                batch={successBatch}
                onReset={() => {
                    setSuccessBatch(null);
                    setSelectedIds([]);
                    setPreviewData([]);
                }}
                onViewBatch={() => {
                    if (onSuccess) onSuccess();
                }}
            />
        );
    }

    return (
        <TooltipProvider>
            {/* Absolute positioning and strict flex boundaries to prevent overflow */}
            <div className="absolute inset-0 flex flex-col bg-background text-foreground p-4 md:p-6 gap-4 animate-in fade-in duration-300">

                {/* HEADER */}
                <header className="flex-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border border-border shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary p-2 sm:p-2.5 rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold uppercase text-xs sm:text-sm tracking-tight italic">Fulfillment Origin</h3>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                Locked to active branch context
                            </p>
                        </div>
                    </div>

                    <div className="w-full sm:w-[280px] shrink-0">
                        <BranchSelector
                            branches={branches}
                            selectedBranchId={selectedBranchId}
                            onBranchChange={(id) => {
                                setSelectedBranchId(id);
                                setSelectedIds([]);
                            }}
                            isLoading={isBranchesLoading}
                        />
                    </div>
                </header>

                {/* MAIN LAYOUT: Switches to column on small screens, flex-row on desktop */}
                <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-4 lg:pb-0">

                    {/* LEFT COLUMN: Pending Plans */}
                    <div className="flex flex-col w-full lg:w-[35%] xl:w-[30%] shrink-0 bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[400px] lg:min-h-0">
                        <div className="flex-none p-4 border-b bg-muted/20 flex items-center justify-between">
                            <h2 className="font-bold text-xs uppercase tracking-wider italic">Pending Plans</h2>
                            <Badge variant="outline" className="font-bold text-primary border-primary/20">{availablePdps.length}</Badge>
                        </div>

                        {/* Bulletproof ScrollArea container */}
                        <div className="flex-1 relative min-h-0">
                            <ScrollArea className="absolute inset-0 h-full">
                                <div className="p-3">
                                    {!selectedBranchId ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                            <Package className="h-10 w-10 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Branch</p>
                                        </div>
                                    ) : isLoadingPdps ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="text-[10px] font-black uppercase text-muted-foreground">Syncing...</span>
                                        </div>
                                    ) : availablePdps.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                            <ClipboardList className="h-10 w-10 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-center">No pending plans<br/>for this branch</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableBody>
                                                {availablePdps.map((item) => {
                                                    const pdp = item as Record<string, unknown>;
                                                    return (
                                                        <TableRow
                                                            key={String(pdp['dispatchId'])}
                                                            className={`cursor-pointer border-border hover:bg-muted/50 transition-colors ${selectedIds.includes(Number(pdp['dispatchId'])) ? "bg-accent/50 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}
                                                            onClick={() => toggleSelection(Number(pdp['dispatchId']))}
                                                        >
                                                            <TableCell className="w-10">
                                                                <Checkbox
                                                                    checked={selectedIds.includes(Number(pdp['dispatchId']))}
                                                                    onCheckedChange={() => toggleSelection(Number(pdp['dispatchId']))}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="py-3">
                                                                <div className="font-bold text-xs sm:text-sm">{String(pdp['dispatchNo'])}</div>
                                                                <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 line-clamp-1">
                                                                    📍 {(pdp['cluster'] as Record<string, unknown>)?.['clusterName'] as string} | 👤 {(pdp['driver'] as Record<string, unknown>)?.['firstName'] as string}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-[10px] sm:text-xs">
                                                                ₱{Number(pdp['totalAmount']).toLocaleString()}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Aggregation Preview */}
                    <div className="flex flex-col flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px] lg:min-h-0 relative">
                        <div className="flex-none p-4 border-b bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary" />
                                <h2 className="font-bold text-xs uppercase tracking-wider italic">Aggregation List</h2>
                            </div>
                            {hasShortage && (
                                <Badge variant="destructive" className="gap-1 animate-pulse font-black text-[9px] uppercase">
                                    <AlertTriangle className="w-3 h-3" /> Shortage
                                </Badge>
                            )}
                        </div>

                        {/* Bulletproof ScrollArea container */}
                        <div className="flex-1 relative min-h-0">
                            <ScrollArea className="absolute inset-0 h-full">
                                {isLoadingPreview ? (
                                    <div className="h-full flex flex-col items-center justify-center py-40">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase text-muted-foreground mt-4 tracking-widest">Aggregating SKUs...</p>
                                    </div>
                                ) : previewData.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 py-40 px-4 text-center">
                                        <ClipboardList className="h-16 w-16 mb-4" />
                                        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest">Select plans to preview</p>
                                    </div>
                                ) : (
                                    <div className="p-0 animate-in slide-in-from-bottom-4 duration-500">
                                        {Object.entries(groupedData).map(([supplier, brands]) => (
                                            <div key={supplier} className="border-b border-border/50">
                                                <div className="bg-muted/40 px-4 sm:px-6 py-2 flex items-center gap-2 sticky top-0 z-10 backdrop-blur-md border-b">
                                                    <Badge className="bg-primary hover:bg-primary font-black text-[9px] italic">{supplier}</Badge>
                                                </div>
                                                {Object.entries(brands).map(([brand, categories]) => (
                                                    <div key={brand} className="pl-2 sm:pl-4">
                                                        <div className="px-4 sm:px-6 py-2 flex items-center gap-2 bg-muted/10 border-b border-border/30">
                                                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter italic truncate">BRAND: {brand}</span>
                                                        </div>
                                                        {Object.entries(categories).map(([category, items]) => (
                                                            <div key={category} className="pl-2 sm:pl-4">
                                                                <div className="px-4 sm:px-6 py-2 flex items-center gap-2">
                                                                    <Tags className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                                                    <span className="text-[9px] font-bold uppercase text-muted-foreground/70 truncate">{category}</span>
                                                                </div>
                                                                <Table>
                                                                    <TableBody>
                                                                        {items.map((item) => {
                                                                            const isShortage = (item.runningInventory || 0) < (item.totalAllocated || 0);
                                                                            return (
                                                                                <TableRow key={item.productId} className={`border-border hover:bg-muted/30 transition-colors ${isShortage ? "bg-destructive/5" : ""}`}>
                                                                                    <TableCell className="pl-6 sm:pl-10 py-3 sm:py-4 w-[40%] sm:w-[50%]">
                                                                                        <div className="font-bold text-xs sm:text-sm line-clamp-2">{item.productName}</div>
                                                                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                                                            <Badge variant="outline" className="h-4 text-[8px] sm:text-[9px] font-black border-primary/20 text-primary uppercase bg-primary/5">
                                                                                                {item.brand || "NO BRAND"}
                                                                                            </Badge>
                                                                                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">ID: {item.productId}</span>
                                                                                            <Badge className="h-4 text-[8px] sm:text-[9px] font-bold px-1.5 bg-muted text-muted-foreground border-none">
                                                                                                {item.unit || "PC"}
                                                                                            </Badge>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <div className="font-black text-primary text-base sm:text-lg leading-none italic">{item.totalAllocated}</div>
                                                                                        <div className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase mt-1">Required</div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <div className="font-black text-foreground text-base sm:text-lg leading-none italic">{item.runningInventory || 0}</div>
                                                                                        <div className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase mt-1">In Bin</div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-center w-[80px] sm:w-[120px]">
                                                                                        {isShortage ? (
                                                                                            <Badge variant="destructive" className="font-black text-[8px] sm:text-[9px]">SHORT</Badge>
                                                                                        ) : (
                                                                                            <Badge className="bg-emerald-600 hover:bg-emerald-600 font-black text-[8px] sm:text-[9px]">READY</Badge>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* FOOTER */}
                        <footer className="flex-none p-4 border-t border-border bg-card z-10">
                            <Button
                                onClick={handleGenerateBatch}
                                disabled={selectedIds.length === 0 || isSubmitting}
                                className="w-full h-12 text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/10 transition-transform active:scale-[0.98] rounded-xl"
                            >
                                {isSubmitting ? <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Committing Batch...</> : "Generate Picking Batch"}
                            </Button>
                        </footer>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}