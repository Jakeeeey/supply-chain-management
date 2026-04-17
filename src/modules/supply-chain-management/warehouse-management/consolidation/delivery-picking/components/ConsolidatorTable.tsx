"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import {
    Package, ArrowRight, ChevronLeft, ChevronRight, Clock,
    PlayCircle, CheckCircle2, ShieldCheck, AlertCircle, Hash, Loader2
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsolidatorDto } from "../types";

export const getStatusBadge = (status: string) => {
    const base = "font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-1.5 sm:px-2 py-0.5 border-none shadow-sm flex items-center w-fit";
    switch (status) {
        case 'Pending':
            return <Badge className={`${base} bg-amber-500/10 text-amber-600`}><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 stroke-[3px]"/> Pending</Badge>;
        case 'Picking':
            return <Badge className={`${base} bg-blue-500/10 text-blue-600`}><PlayCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 stroke-[3px]"/> Picking</Badge>;
        case 'Picked':
            return <Badge className={`${base} bg-emerald-500/10 text-emerald-600`}><CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 stroke-[3px]"/> Picked</Badge>;
        case 'Audited':
            return <Badge className={`${base} bg-purple-500/10 text-purple-600`}><ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 stroke-[3px]"/> Audited</Badge>;
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
    const currentPage = Number(pagination.currentPage) || 0;
    const totalPages = Number(pagination.totalPages) || 0;
    const totalElements = Number(pagination.totalElements) || 0;
    const { onPageChange } = pagination;

    return (
        <div className="flex flex-col h-full bg-card/30 rounded-xl border border-border/40 overflow-hidden shadow-2xl">
            {/* 🚀 FIX: Horizontal scroll wrapper for extreme small screens */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                <Table className="min-w-[600px] md:min-w-full">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-xl border-b border-border/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="font-black uppercase tracking-tighter text-[10px] sm:text-[11px] h-12 sm:h-14 text-muted-foreground/70">
                                <div className="flex items-center gap-1.5 sm:gap-2 px-2">
                                    <Hash className="w-3 h-3"/> Batch No.
                                </div>
                            </TableHead>
                            <TableHead className="font-black uppercase tracking-tighter text-[10px] sm:text-[11px] text-muted-foreground/70">Progress</TableHead>

                            {/* 🚀 FIX: Hide Timestamp on Mobile */}
                            <TableHead className="hidden md:table-cell font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Timestamp</TableHead>

                            <TableHead className="text-center font-black uppercase tracking-tighter text-[10px] sm:text-[11px] text-muted-foreground/70">Volume</TableHead>

                            {/* 🚀 FIX: Hide Links on Mobile */}
                            <TableHead className="hidden sm:table-cell text-center font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Links</TableHead>

                            <TableHead className="text-right pr-4 sm:pr-6 font-black uppercase tracking-tighter text-[10px] sm:text-[11px] text-muted-foreground/70">Options</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 sm:py-32 bg-background/20">
                                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin mx-auto text-primary/40"/>
                                    <p className="mt-4 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Syncing with Vertex SCM...</p>
                                </TableCell>
                            </TableRow>
                        ) : error === 401 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 sm:py-32 bg-destructive/5">
                                    <div className="relative inline-block mb-3 sm:mb-4">
                                        <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-destructive animate-pulse"/>
                                        <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full"/>
                                    </div>
                                    <p className="text-base sm:text-lg font-black tracking-tighter uppercase text-destructive">Terminal Access Expired</p>
                                    <p className="text-[9px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Re-authentication required (401)</p>
                                    <Button
                                        variant="outline"
                                        className="mt-4 sm:mt-6 border-destructive/20 text-destructive hover:bg-destructive/10 font-black uppercase text-[9px] sm:text-[10px]"
                                        onClick={() => window.location.reload()}
                                    >
                                        Reconnect Terminal
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 sm:py-32 bg-background/10">
                                    <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/20 mb-3 sm:mb-4"/>
                                    <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground/40">Zero Results Found</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer border-border/30 hover:bg-primary/[0.02] transition-all group"
                                    onClick={() => onRowClick(row)}
                                >
                                    <TableCell className="py-3 sm:py-4 px-2 sm:px-4">
                                        <span className="font-mono font-black text-xs sm:text-sm tracking-tight text-foreground/90 bg-muted/50 px-1.5 sm:px-2 py-1 rounded">
                                            {row.consolidatorNo}
                                        </span>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(row.status)}</TableCell>

                                    {/* 🚀 FIX: Hide Timestamp on Mobile */}
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">
                                        {row.createdAt ? format(parseISO(row.createdAt), "MMM dd • HH:mm") : "---"}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <span className="text-xs sm:text-sm font-black text-foreground/80">{row.details?.length || 0}</span>
                                        <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">SKUs</p>
                                    </TableCell>

                                    {/* 🚀 FIX: Hide Links on Mobile */}
                                    <TableCell className="hidden sm:table-cell text-center">
                                        <span className="text-xs sm:text-sm font-black text-foreground/80">{row.dispatches?.length || 0}</span>
                                        <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Plans</p>
                                    </TableCell>

                                    <TableCell className="text-right pr-4 sm:pr-6">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 bg-muted/0 group-hover:bg-primary group-hover:text-primary-foreground rounded-full transition-all">
                                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 🚀 FIX: Responsive Pagination Footer (Stacks on Mobile) */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-5 gap-4 border-t border-border/50 bg-muted/30 backdrop-blur-md">
                <div className="flex flex-col gap-0.5 text-center sm:text-left">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.1em]">SCM Data Stream</p>
                    <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">
                        Page <span className="text-foreground font-black">{currentPage + 1}</span> of <span className="text-foreground font-black">{Math.max(1, totalPages)}</span>
                        <span className="mx-2 opacity-20">|</span>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-tighter font-black opacity-60">{totalElements} Total Entries</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0 || loading || totalPages === 0}
                        className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-background border border-transparent hover:border-border/50 transition-all"
                    >
                        <ChevronLeft className="h-3 w-3 mr-1.5 sm:mr-2"/> Prev
                    </Button>
                    <div className="h-4 w-[1px] bg-border/50 hidden sm:block"/>
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1 || loading || totalPages === 0}
                        className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-background border border-transparent hover:border-border/50 transition-all"
                    >
                        Next <ChevronRight className="h-3 w-3 ml-1.5 sm:ml-2"/>
                    </Button>
                </div>
            </div>
        </div>
    );
}