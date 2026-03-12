import React from "react";
import { ArrowLeft, PackageCheck, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
    batchNo: string;
    branchName: string;
    totalPicked: number;
    totalItems: number;
    progressPercent: number;
    isBatchComplete: boolean;
    isScanning: boolean;
    onClose: () => void;
    onBatchComplete: () => void;
}

export function ActivePickingHeader({
                                        batchNo, branchName, totalPicked, totalItems, progressPercent,
                                        isBatchComplete, isScanning, onClose, onBatchComplete
                                    }: Props) {
    return (
        <>
            <header className="shrink-0 bg-card border-b border-border/40 p-4 shadow-sm flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onClose} className="h-14 w-14 rounded-2xl shadow-sm">
                        <ArrowLeft className="h-7 w-7" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
                                {batchNo}
                            </h1>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black uppercase text-xs md:text-sm py-1 animate-pulse">
                                Live Picking
                            </Badge>
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            Terminal: {branchName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <div className="text-4xl font-black leading-none text-primary">
                            {totalPicked} <span className="text-xl text-muted-foreground/50">/ {totalItems}</span>
                        </div>
                        <p className="text-[11px] font-black uppercase text-muted-foreground tracking-widest mt-1">Items Picked</p>
                    </div>
                    {isBatchComplete ? (
                        <Button onClick={onBatchComplete}
                                className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest px-8 rounded-xl shadow-xl shadow-emerald-500/20 animate-bounce transition-all">
                            <PackageCheck className="mr-3 h-6 w-6" /> Finish Batch
                        </Button>
                    ) : (
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center relative shadow-inner">
                            <ScanLine className="h-7 w-7 text-primary absolute" />
                            {isScanning && <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping" />}
                        </div>
                    )}
                </div>
            </header>
            <Progress value={progressPercent} className="h-2 rounded-none bg-muted shrink-0" />
        </>
    );
}