import React, { useMemo } from "react";
import { Activity, History } from "lucide-react";
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

export function ActivePickingLiveFeed({ scanLogs }: Props) {
    const memoizedScanLogs = useMemo(() => {
        return scanLogs.map(log => (
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
        ));
    }, [scanLogs]);

    return (
        <div className="hidden md:flex w-1/3 lg:w-1/4 flex-col bg-card relative min-h-0">
            {/* 🚀 STICKY FEED HEADER */}
            <div className="shrink-0 p-4 bg-card border-b border-border/40 flex justify-between items-center shadow-sm z-20">
                <h2 className="font-black uppercase text-sm tracking-widest text-muted-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500 animate-pulse" /> Live Scan Feed
                </h2>
            </div>

            {/* 📜 SCROLLABLE LOGS */}
            <ScrollArea className="flex-1 min-h-0 bg-muted/5">
                <div className="p-4 space-y-3">
                    {scanLogs.length === 0 ? (
                        <div className="text-center py-20 opacity-40">
                            <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Scanner is active</p>
                            <p className="text-[10px] font-bold text-muted-foreground mt-1">Waiting for tags...</p>
                        </div>
                    ) : (
                        memoizedScanLogs
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}