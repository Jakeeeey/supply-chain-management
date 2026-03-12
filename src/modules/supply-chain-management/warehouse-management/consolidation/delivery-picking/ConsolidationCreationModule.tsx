"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Package, MapPin, ClipboardList, ChevronRight, Tags, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";

// 🚀 Modularized Success Component
import ConsolidationCreationSuccess from "./components/ConsolidationCreationSuccess";

import {
    fetchDispatchPlans,
    fetchConsolidationPreview,
    generateConsolidationBatch,
    fetchActiveBranches
} from "./providers/fetchProvider";

/**
 * 🛠️ PROPS INTERFACE FIX
 * branchId is now passed from the parent DeliveryPickingModule
 */
interface ConsolidationCreationModuleProps {
    onSuccess?: () => void;
    branchId?: number; // 🚀 Added to match parent call
}

export default function ConsolidationCreationModule({
                                                        onSuccess,
                                                        branchId: initialBranchId // 🚀 Destructure branchId from parent
                                                    }: ConsolidationCreationModuleProps) {
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [availablePdps, setAvailablePdps] = useState<any[]>([]);
    const [isLoadingPdps, setIsLoadingPdps] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [successBatch, setSuccessBatch] = useState<any | null>(null);

    // 🚀 SYNC INITIAL BRANCH
    // If the parent already has a branch selected, lock the wizard to it.
    useEffect(() => {
        if (initialBranchId) {
            setSelectedBranch(initialBranchId.toString());
        }
    }, [initialBranchId]);

    useEffect(() => {
        const loadBranches = async () => {
            const data = await fetchActiveBranches();
            if (data && data.length > 0) setBranches(data);
        };
        loadBranches();
    }, []);

    useEffect(() => {
        if (!selectedBranch) {
            setAvailablePdps([]);
            return;
        }
        const loadPdps = async () => {
            setIsLoadingPdps(true);
            try {
                // Now uses the branchId parameter we enabled in the fetchProvider
                const data = await fetchDispatchPlans(selectedBranch);
                setAvailablePdps(data || []);
            } catch (error) {
                console.error("Failed to load PDPs", error);
            } finally {
                setIsLoadingPdps(false);
            }
        };
        loadPdps();
    }, [selectedBranch]);

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
        const groups: any = {};
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
            // Note: Batch generation endpoint should likely also receive branchId
            // but for now we follow the existing API signature.
            const result = await generateConsolidationBatch(selectedIds);
            if (result) {
                setSuccessBatch(result);
            }
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
            <div className="flex flex-col h-full bg-background text-foreground p-4 space-y-4 overflow-hidden animate-in fade-in duration-300">
                <header className="flex-none flex items-center justify-between bg-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary p-2.5 rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold uppercase text-sm tracking-tight italic">Fulfillment Origin</h3>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Locked to active branch context</p>
                        </div>
                    </div>

                    <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedIds([]); }}>
                        <SelectTrigger className="w-[280px] font-bold border-border/40 bg-background h-11 rounded-xl shadow-inner italic">
                            <SelectValue placeholder="Choose Facility..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40 bg-card/95 backdrop-blur-xl">
                            {branches.map(b => (
                                <SelectItem key={b.id} value={b.id.toString()} className="font-bold text-[10px] uppercase tracking-widest">
                                    {b.branchName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </header>

                <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                    <div className="col-span-4 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                            <h2 className="font-bold text-xs uppercase tracking-wider italic">Pending Plans</h2>
                            <Badge variant="outline" className="font-bold text-primary border-primary/20">{availablePdps.length}</Badge>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <ScrollArea className="h-full">
                                <div className="p-4 space-y-2">
                                    {!selectedBranch ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                            <Package className="h-10 w-10 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Branch</p>
                                        </div>
                                    ) : isLoadingPdps ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="text-[10px] font-black uppercase text-muted-foreground">Syncing...</span>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableBody>
                                                {availablePdps.map(pdp => (
                                                    <TableRow
                                                        key={pdp.dispatchId}
                                                        className={`cursor-pointer border-border hover:bg-muted/50 transition-colors ${selectedIds.includes(pdp.dispatchId) ? "bg-accent/50 border-l-2 border-l-primary" : ""}`}
                                                        onClick={() => toggleSelection(pdp.dispatchId)}
                                                    >
                                                        <TableCell className="w-10">
                                                            <Checkbox
                                                                checked={selectedIds.includes(pdp.dispatchId)}
                                                                onCheckedChange={() => toggleSelection(pdp.dispatchId)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="font-bold text-sm">{pdp.dispatchNo}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-1">
                                                                📍 {pdp.cluster?.clusterName} | 👤 {pdp.driver?.firstName}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-xs">
                                                            ₱{pdp.totalAmount?.toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <div className="col-span-8 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden relative">
                        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
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
                        <div className="flex-1 overflow-hidden relative">
                            <ScrollArea className="h-full">
                                {isLoadingPreview ? (
                                    <div className="h-full flex flex-col items-center justify-center py-40">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase text-muted-foreground mt-4 tracking-widest">Aggregating SKUs...</p>
                                    </div>
                                ) : previewData.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 py-40">
                                        <ClipboardList className="h-16 w-16 mb-4" />
                                        <p className="text-sm font-bold uppercase tracking-widest">Select plans to preview</p>
                                    </div>
                                ) : (
                                    <div className="p-0 animate-in slide-in-from-bottom-4 duration-500">
                                        {Object.entries(groupedData).map(([supplier, brands]: any) => (
                                            <div key={supplier} className="border-b border-border/50">
                                                <div className="bg-muted/40 px-6 py-2 flex items-center gap-2 sticky top-0 z-10 backdrop-blur-md border-b">
                                                    <Badge className="bg-primary hover:bg-primary font-black text-[9px] italic">{supplier}</Badge>
                                                </div>
                                                {Object.entries(brands).map(([brand, categories]: any) => (
                                                    <div key={brand} className="pl-4">
                                                        <div className="px-6 py-2 flex items-center gap-2 bg-muted/10 border-b border-border/30">
                                                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter italic">BRAND: {brand}</span>
                                                        </div>
                                                        {Object.entries(categories).map(([category, items]: any) => (
                                                            <div key={category} className="pl-4">
                                                                <div className="px-6 py-2 flex items-center gap-2">
                                                                    <Tags className="w-3 h-3 text-muted-foreground/50" />
                                                                    <span className="text-[9px] font-bold uppercase text-muted-foreground/70">{category}</span>
                                                                </div>
                                                                <Table>
                                                                    <TableBody>
                                                                        {items.map((item: any) => {
                                                                            const isShortage = (item.runningInventory || 0) < (item.totalAllocated || 0);
                                                                            return (
                                                                                <TableRow key={item.productId} className={`border-border hover:bg-muted/30 transition-colors ${isShortage ? "bg-destructive/5" : ""}`}>
                                                                                    <TableCell className="pl-10 py-4 w-[50%]">
                                                                                        <div className="font-bold text-sm">{item.productName}</div>
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <Badge variant="outline" className="h-4 text-[9px] font-black border-primary/20 text-primary uppercase bg-primary/5">
                                                                                                {item.brand || "NO BRAND"}
                                                                                            </Badge>
                                                                                            <span className="text-[10px] text-muted-foreground font-mono">ID: {item.productId}</span>
                                                                                            <Badge className="h-4 text-[9px] font-bold px-1.5 bg-muted text-muted-foreground border-none">
                                                                                                {item.unit || "PC"}
                                                                                            </Badge>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <div className="font-black text-primary text-lg leading-none italic">{item.totalAllocated}</div>
                                                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Required</div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <div className="font-black text-foreground text-lg leading-none italic">{item.runningInventory || 0}</div>
                                                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase mt-1">In Bin</div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-center w-[120px]">
                                                                                        {isShortage ? (
                                                                                            <Badge variant="destructive" className="font-black text-[9px]">SHORT</Badge>
                                                                                        ) : (
                                                                                            <Badge className="bg-emerald-600 hover:bg-emerald-600 font-black text-[9px]">READY</Badge>
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
                        <footer className="p-4 border-t border-border bg-card">
                            <Button
                                onClick={handleGenerateBatch}
                                disabled={selectedIds.length === 0 || isSubmitting}
                                className="w-full h-12 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/10 transition-transform active:scale-[0.98] rounded-xl"
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