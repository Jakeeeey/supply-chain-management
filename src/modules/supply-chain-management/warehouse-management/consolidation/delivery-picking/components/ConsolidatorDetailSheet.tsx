"use client";

import React, {useState, useMemo} from "react";
import {format, parseISO} from "date-fns";
import {
    Box, Truck, Search, Printer,
    CheckCircle, Barcode, Tag, Building2,
    Clock, Layers, User, Play, ShieldCheck, Loader2
} from "lucide-react";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Badge} from "@/components/ui/badge";
import {Progress} from "@/components/ui/progress";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

import {ConsolidatorDto, ConsolidatorDetailsDto} from "../types";
import {getStatusBadge} from "./ConsolidatorTable";
import {StartPickingDialog} from "./StartPickingDialog";
import { generatePickerPDF } from "./PickerManifestPrint";

interface ConsolidatorDetailSheetProps {
    consolidator: ConsolidatorDto | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate?: () => void;
}

interface MiniStatProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    className?: string;
}

interface SKUCardProps {
    detail: ConsolidatorDetailsDto;
}

export function ConsolidatorDetailSheet({consolidator, isOpen, onClose, onStatusUpdate}: ConsolidatorDetailSheetProps) {
    const [skuSearch, setSkuSearch] = useState("");
    const [isStartPickingOpen, setIsStartPickingOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const uniqueClusters = useMemo(() => {
        const clusters = consolidator?.dispatches?.map(d => d.clusterName).filter(Boolean) || [];
        return [...new Set(clusters)].length;
    }, [consolidator?.dispatches]);

    const groupedDetails = useMemo(() => {
        if (!consolidator?.details) return {};
        const filtered = consolidator.details.filter(d =>
            d.productName?.toLowerCase().includes(skuSearch.toLowerCase()) ||
            d.productId.toString().includes(skuSearch) ||
            d.barcode?.includes(skuSearch)
        );
        return filtered.reduce((acc, item) => {
            const supplier = item.supplierName || "Direct / No Supplier";
            const category = item.categoryName || "Uncategorized";
            if (!acc[supplier]) acc[supplier] = {};
            if (!acc[supplier][category]) acc[supplier][category] = [];
            acc[supplier][category].push(item);
            return acc;
        }, {} as Record<string, Record<string, ConsolidatorDetailsDto[]>>);
    }, [consolidator, skuSearch]);

    if (!consolidator) return null;

    const totalPicked = consolidator.details?.reduce((acc, curr) => acc + curr.pickedQuantity, 0) || 0;
    const totalOrdered = consolidator.details?.reduce((acc, curr) => acc + curr.orderedQuantity, 0) || 0;
    const batchProgress = totalOrdered > 0 ? (totalPicked / totalOrdered) * 100 : 0;

    const fetchAndPrintManifest = async () => {
        setIsPrinting(true);
        try {
            const manifestRes = await fetch(`/api/scm/warehouse-management/consolidation/delivery-picking/manifest/${consolidator.consolidatorNo}`);
            if (manifestRes.ok) {
                const data = await manifestRes.json();
                generatePickerPDF(data, consolidator.consolidatorNo);
            }
        } catch (err) {
            console.error("VOS: PDF Generation Failed", err);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleConfirmPicking = async (checkerId: number) => {
        return new Promise<void>(async (resolve, reject) => {
            setIsSyncing(true);
            try {
                const res = await fetch(`/api/scm/warehouse-management/consolidation/delivery-picking/start`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({consolidatorNo: consolidator.consolidatorNo, checkerId})
                });

                if (!res.ok) throw new Error("Failed to initialize picking.");

                const manifestRes = await fetch(`/api/scm/warehouse-management/consolidation/delivery-picking/manifest/${consolidator.consolidatorNo}`);
                const data = await manifestRes.json();

                generatePickerPDF(data, consolidator.consolidatorNo);

                setIsStartPickingOpen(false);
                onStatusUpdate?.();
                setIsSyncing(false);
                resolve();
            } catch (err) {
                setIsSyncing(false);
                reject(err);
            }
        });
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col bg-background rounded-l-[2rem]">
                    <div className="p-5 lg:p-6 bg-muted/10 border-b border-border/50 shrink-0">
                        <SheetHeader className="space-y-3 text-left">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5">Vertex Terminal</Badge>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-muted-foreground/20">
                                            <Building2 className="h-2.5 w-2.5 mr-1"/>
                                            {consolidator.branchName}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                            <Clock className="h-3 w-3"/> {format(parseISO(consolidator.createdAt), "MMM dd, HH:mm")}
                                        </span>
                                    </div>
                                    <SheetTitle className="text-3xl font-black font-mono tracking-tighter italic leading-none text-foreground uppercase">
                                        {consolidator.consolidatorNo}
                                    </SheetTitle>
                                </div>
                                <div className="scale-110 origin-top-right transition-all duration-300">
                                    {getStatusBadge(consolidator.status)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <MiniStat label="Items" value={consolidator.details?.length || 0} icon={<Box className="text-blue-500"/>}/>
                                <MiniStat label="Routes" value={consolidator.dispatches?.length || 0} icon={<Truck className="text-purple-500"/>}/>
                                <MiniStat label="Clusters" value={uniqueClusters} icon={<Tag className="text-orange-500"/>}/>
                                <MiniStat label="Done" value={`${batchProgress.toFixed(0)}%`} icon={<CheckCircle className="text-emerald-500"/>}/>
                            </div>
                        </SheetHeader>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-background/50">
                        <Tabs defaultValue="picking" className="flex-1 flex flex-col min-h-0 w-full">
                            <div className="px-5 py-3 border-b border-border/40 shrink-0 bg-card/30 backdrop-blur-md flex items-center justify-between gap-4">
                                <TabsList className="bg-muted/30 p-1 h-9 rounded-xl border border-border/20">
                                    <TabsTrigger value="picking" className="text-[10px] font-black uppercase tracking-widest px-4">Picking List</TabsTrigger>
                                    <TabsTrigger value="dispatches" className="text-[10px] font-black uppercase tracking-widest px-4">Fleet Status</TabsTrigger>
                                </TabsList>
                                <div className="relative flex-1 max-w-[180px]">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50"/>
                                    <Input placeholder="Filter SKU..." className="h-8 pl-8 text-[11px] font-bold bg-muted/20 border-none rounded-lg" value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} />
                                </div>
                            </div>

                            <ScrollArea className="flex-1 h-0">
                                <TabsContent value="picking" className="m-0 p-5 space-y-6">
                                    {Object.entries(groupedDetails).map(([supplier, categories]) => (
                                        <div key={supplier} className="space-y-4">
                                            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 flex items-center gap-2 border-b border-border/20">
                                                <div className="p-1 bg-primary/10 rounded-md"><Building2 className="h-3.5 w-3.5 text-primary"/></div>
                                                <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-foreground/80">{supplier}</h3>
                                            </div>
                                            {Object.entries(categories).map(([category, items]) => (
                                                <div key={category} className="pl-4 border-l-2 border-primary/10 space-y-2">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                                        <Layers className="h-2.5 w-2.5"/> {category}
                                                    </span>
                                                    {items.map((detail, idx) => (
                                                        <SKUCard key={detail.id || idx} detail={detail}/>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </TabsContent>
                                <TabsContent value="dispatches" className="m-0 p-5 space-y-4">
                                    {consolidator.dispatches?.map((disp, idx) => (
                                        <DispatchCard key={disp.id || idx} disp={disp}/>
                                    ))}
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </div>

                    <div className="p-6 border-t border-border/50 bg-card/50 flex items-center gap-3 shrink-0 z-30">
                        <Button variant="outline" className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl" onClick={fetchAndPrintManifest} disabled={isPrinting || consolidator.status === "Pending"}>
                            {isPrinting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Printer className="h-4 w-4 mr-2"/>}
                            {isPrinting ? "Generating..." : "Print Summary"}
                        </Button>

                        {consolidator.status === "Pending" ? (
                            <Button onClick={() => setIsStartPickingOpen(true)} disabled={isSyncing} className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl bg-primary">
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Play className="h-3.5 w-3.5 mr-2 fill-current"/>}
                                Initialize Picking
                            </Button>
                        ) : (
                            <Button disabled className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl bg-emerald-500/10 text-emerald-500 border-none">
                                <ShieldCheck className="h-4 w-4 mr-2"/>
                                {consolidator.status === "Picked" ? "Verify Batch" : "Picking Active"}
                            </Button>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <StartPickingDialog isOpen={isStartPickingOpen} onClose={() => setIsStartPickingOpen(false)} onConfirm={handleConfirmPicking} batchNo={consolidator.consolidatorNo} />
        </>
    );
}

function MiniStat({label, value, icon, className}: MiniStatProps) {
    return (
        <div className={`flex items-center gap-1.5 bg-background/50 border border-border/40 rounded-lg px-2.5 py-1.5 shadow-sm ${className}`}>
            <div className="h-3.5 w-3.5 flex items-center justify-center">{icon}</div>
            <span className="font-black text-xs">{value}</span>
            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">{label}</span>
        </div>
    );
}

function SKUCard({detail}: SKUCardProps) {
    const pickProgress = detail.orderedQuantity > 0 ? (detail.pickedQuantity / detail.orderedQuantity) * 100 : 0;
    const isShortage = detail.pickedQuantity < detail.orderedQuantity && detail.pickedQuantity > 0;

    return (
        <div className={`relative border border-border/40 rounded-xl px-4 py-3 bg-card/40 flex items-center justify-between gap-4 overflow-hidden group ${isShortage ? 'bg-amber-500/5 border-amber-500/30' : ''}`}>
            {isShortage && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"/>}
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-[11px] text-foreground/90 truncate uppercase tracking-tight">{detail.productName}</h4>
                <div className="flex items-center gap-3 mt-1 font-mono text-[9px] text-muted-foreground/60 font-bold uppercase tracking-tighter">
                    <span className="bg-muted/50 px-1.5 py-0.5 rounded">ID: {detail.productId}</span>
                    {detail.barcode && <span className="flex items-center gap-1"><Barcode className="h-2.5 w-2.5"/> {detail.barcode}</span>}
                </div>
            </div>
            <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end gap-1 font-mono">
                    <span className={`text-sm font-black ${pickProgress >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{detail.pickedQuantity}</span>
                    <span className="text-muted-foreground text-[10px] font-bold">/ {detail.orderedQuantity}</span>
                </div>
                <p className="text-[8px] text-muted-foreground/50 font-black uppercase tracking-widest mt-0.5">{detail.unitName}</p>
            </div>
            <Progress value={pickProgress} className={`absolute bottom-0 left-0 w-full h-[3px] rounded-none bg-transparent ${pickProgress >= 100 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-500'}`}/>
        </div>
    );
}

function DispatchCard({disp}: { disp: any }) {
    return (
        <div className="group relative border border-border/40 rounded-2xl p-4 bg-card/30 backdrop-blur-sm shadow-sm hover:border-primary/40 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><Truck className="h-4 w-4 text-primary"/></div>
                    <span className="font-mono font-black text-sm tracking-tighter uppercase">{disp.dispatchNo}</span>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-md">
                    {disp.status || "PENDING"}
                </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/40">
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-[0.2em]">Personnel</span>
                    <span className="text-[11px] font-black uppercase tracking-tight truncate">{disp.driverName || "Pending Assign"}</span>
                </div>
                <div className="flex flex-col gap-1 border-l border-border/40 pl-4">
                    <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-[0.2em]">Route Cluster</span>
                    <span className="text-[11px] font-black uppercase tracking-tighter text-blue-600/80">{disp.clusterName || "Global"}</span>
                </div>
            </div>
        </div>
    );

}