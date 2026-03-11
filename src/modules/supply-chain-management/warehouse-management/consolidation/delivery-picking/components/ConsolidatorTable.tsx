"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import {
    Package,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Clock,
    PlayCircle,
    CheckCircle2,
    ShieldCheck,
    AlertCircle,
    Hash
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsolidatorDto } from "../types";

export const getStatusBadge = (status: string) => {
    const base = "font-black text-[10px] uppercase tracking-widest px-2 py-0.5 border-none shadow-sm";
    switch (status) {
        case 'Pending':
            return <Badge className={`${base} bg-amber-500/10 text-amber-600`}><Clock className="w-3 h-3 mr-1.5 stroke-[3px]"/> Pending</Badge>;
        case 'Picking':
            return <Badge className={`${base} bg-blue-500/10 text-blue-600`}><PlayCircle className="w-3 h-3 mr-1.5 stroke-[3px]"/> Picking</Badge>;
        case 'Picked':
            return <Badge className={`${base} bg-emerald-500/10 text-emerald-600`}><CheckCircle2 className="w-3 h-3 mr-1.5 stroke-[3px]"/> Picked</Badge>;
        case 'Audited':
            return <Badge className={`${base} bg-purple-500/10 text-purple-600`}><ShieldCheck className="w-3 h-3 mr-1.5 stroke-[3px]"/> Audited</Badge>;
        default:
            return <Badge variant="secondary" className={base}>{status}</Badge>;
    }
};

interface ConsolidatorTableProps {
    data: ConsolidatorDto[];
    onRowClick: (consolidator: ConsolidatorDto) => void;
    pagination: {
        currentPage: number;
        totalPages: number;
        totalElements: number;
        onPageChange: (page: number) => void;
    };
    loading: boolean;
    error?: string | number | null;
}

export function ConsolidatorTable({ data, onRowClick, pagination, loading, error }: ConsolidatorTableProps) {
    // 🛡️ CRITICAL FIX: Cast to Number and fallback to 0 to prevent NaN crash
    const currentPage = Number(pagination.currentPage) || 0;
    const totalPages = Number(pagination.totalPages) || 0;
    const totalElements = Number(pagination.totalElements) || 0;
    const { onPageChange } = pagination;

    return (
        <div className="flex flex-col h-full bg-card/30 rounded-xl border border-border/40 overflow-hidden shadow-2xl">
            <div className="flex-1 overflow-auto custom-scrollbar">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-xl border-b border-border/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="font-black uppercase tracking-tighter text-[11px] h-14 text-muted-foreground/70">
                                <div className="flex items-center gap-2 px-2">
                                    <Hash className="w-3 h-3" /> Batch No.
                                </div>
                            </TableHead>
                            <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Progress</TableHead>
                            <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Timestamp</TableHead>
                            <TableHead className="text-center font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Volume</TableHead>
                            <TableHead className="text-center font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Links</TableHead>
                            <TableHead className="text-right pr-6 font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Options</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-32 bg-background/20">
                                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/40" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Syncing with Vertex SCM...</p>
                                </TableCell>
                            </TableRow>
                        ) : error === 401 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-32 bg-destructive/5">
                                    <div className="relative inline-block mb-4">
                                        <AlertCircle className="h-12 w-12 mx-auto text-destructive animate-pulse" />
                                        <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
                                    </div>
                                    <p className="text-lg font-black tracking-tighter uppercase text-destructive">Terminal Access Expired</p>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Re-authentication required (401)</p>
                                    <Button
                                        variant="outline"
                                        className="mt-6 border-destructive/20 text-destructive hover:bg-destructive/10 font-black uppercase text-[10px]"
                                        onClick={() => window.location.reload()}
                                    >
                                        Reconnect Terminal
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-32 bg-background/10">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">Zero Results Found</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer border-border/30 hover:bg-primary/[0.02] transition-all group"
                                    onClick={() => onRowClick(row)}
                                >
                                    <TableCell className="py-4 px-4">
                                        <span className="font-mono font-black text-sm tracking-tight text-foreground/90 bg-muted/50 px-2 py-1 rounded">
                                            {row.consolidatorNo}
                                        </span>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                                    <TableCell className="text-muted-foreground text-[11px] font-bold uppercase tracking-tight">
                                        {row.createdAt ? format(parseISO(row.createdAt), "MMM dd • HH:mm") : "---"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-sm font-black text-foreground/80">{row.details?.length || 0}</span>
                                        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">SKUs</p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-sm font-black text-foreground/80">{row.dispatches?.length || 0}</span>
                                        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Plans</p>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/0 group-hover:bg-primary group-hover:text-primary-foreground rounded-full transition-all">
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 🚀 PAGINATION FOOTER */}
            <div className="flex items-center justify-between px-8 py-5 border-t border-border/50 bg-muted/30 backdrop-blur-md">
                <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.1em]">SCM Data Stream</p>
                    <p className="text-xs font-bold text-muted-foreground">
                        Page <span className="text-foreground font-black">{currentPage + 1}</span> of <span className="text-foreground font-black">{Math.max(1, totalPages)}</span>
                        <span className="mx-2 opacity-20">|</span>
                        <span className="text-[10px] uppercase tracking-tighter font-black opacity-60">{totalElements} Total Entries</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0 || loading || totalPages === 0}
                        className="h-10 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-background border border-transparent hover:border-border/50 transition-all"
                    >
                        <ChevronLeft className="h-3 w-3 mr-2" /> Previous
                    </Button>
                    <div className="h-4 w-[1px] bg-border/50" />
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1 || loading || totalPages === 0}
                        className="h-10 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-background border border-transparent hover:border-border/50 transition-all"
                    >
                        Next <ChevronRight className="h-3 w-3 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
}