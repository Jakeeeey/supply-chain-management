import React from "react";
import { Activity, History, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScanLog {
    id: string;
    tag: string;
    time: string;
    status: "success" | "error";
    message: string;
}

interface Props {
    scanLogs: ScanLog[];
    activeDetailId: number | null;
    isBatchComplete: boolean;
}

export function ActivePickingLiveFeed({ scanLogs, activeDetailId, isBatchComplete }: Props) {
    return (
        <div className="hidden md:flex w-1/3 lg:w-1/4 flex-col bg-card relative min-h-0">
            <div className="shrink-0 p-4 bg-card border-b border-border/40 flex justify-between items-center shadow-sm z-20">
                <h2 className="font-black uppercase text-sm tracking-widest text-muted-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" /> Live Feed
                </h2>
            </div>

            {!activeDetailId && !isBatchComplete && (
                <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 border-l border-border/40">
                    <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mb-6 border-4 border-primary/20 shadow-xl shadow-primary/5">
                        <ScanLine className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                    <h3 className="font-black text-2xl uppercase tracking-tighter mb-3">Awaiting Target</h3>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                        Select an item from the list<br />to activate the scanner.
                    </p>
                </div>
            )}

            <ScrollArea className="flex-1 min-h-0 bg-muted/5">
                <div className="p-4 space-y-3">
                    {scanLogs.length === 0 ? (
                        <div className="text-center py-16 opacity-30">
                            <History className="h-10 w-10 mx-auto mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest">No tags scanned</p>
                        </div>
                    ) : (
                        scanLogs.map(log => (
                            <div key={log.id} className="bg-card border border-border/60 rounded-xl p-3 shadow-sm animate-in slide-in-from-right-4 zoom-in-95">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-mono text-muted-foreground font-bold">{log.time}</span>
                                    {log.status === 'success'
                                        ? <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 uppercase font-black px-2 py-0.5">Success</Badge>
                                        : <Badge variant="destructive" className="text-[10px] uppercase font-black px-2 py-0.5">Error</Badge>
                                    }
                                </div>
                                <div className="font-mono text-xs font-bold break-all mb-1.5 text-foreground/90 bg-muted/50 p-1.5 rounded-md border border-border/50">
                                    {log.tag}
                                </div>
                                <div className={`text-[10px] font-bold uppercase tracking-widest leading-tight ${log.status === 'success' ? 'text-muted-foreground' : 'text-destructive'}`}>
                                    {log.message}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}