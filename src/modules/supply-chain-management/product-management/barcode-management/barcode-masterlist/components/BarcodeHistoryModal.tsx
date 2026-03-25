"use client";

import React, { useState, useEffect } from "react";
import BarcodeComponent from "react-barcode";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    History,
    User,
    Calendar,
    Tag,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { BarcodeHistoryEntry } from "../types";

interface BarcodeHistoryModalProps {
    open: boolean;
    onClose: () => void;
}

const ITEMS_PER_PAGE = 10;

export function BarcodeHistoryModal({ open, onClose }: BarcodeHistoryModalProps) {
    const [entries, setEntries] = useState<BarcodeHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!open) return;
        setCurrentPage(1);

        const fetchHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    "/api/scm/product-management/barcode-management/barcode-masterlist?scope=history"
                );
                if (!res.ok) throw new Error("Failed to fetch history");
                const json = await res.json();
                setEntries(json.data || []);
            } catch (err: unknown) {
                console.error("History fetch error:", err);
                const message = err instanceof Error ? err.message : "Failed to load history.";
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [open]);

    // --- Pagination ---
    const totalItems = entries.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const paginatedEntries = entries.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        // Stored as PHT (UTC+8) without offset suffix — append it so JS Date knows the timezone
        const withOffset = dateStr.includes("+") || dateStr.endsWith("Z") ? dateStr : `${dateStr}+08:00`;
        const d = new Date(withOffset);
        return d.toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getUserName = (entry: BarcodeHistoryEntry) => {
        if (!entry.updated_by) return "System";
        const { first_name, last_name } = entry.updated_by;
        return [first_name, last_name].filter(Boolean).join(" ") || "Unknown User";
    };

    const getBarcodeFormat = (entry: BarcodeHistoryEntry) => {
        if (entry.barcode_type_id?.name?.toUpperCase().includes("EAN")) return "EAN13";
        return "CODE128";
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                <div className="px-6 pt-6 pb-3 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Barcode History
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Edit history and audit trail for bundle barcode linking.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-[200px]" />
                                        <Skeleton className="h-3 w-[300px]" />
                                    </div>
                                    <Skeleton className="h-12 w-[100px]" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                            <p className="text-sm text-muted-foreground">No barcode history found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Table Header */}
                            <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_1.3fr_0.7fr] gap-3 px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b">
                                <span>User</span>
                                <span>Date</span>
                                <span>Action</span>
                                <span>Type</span>
                                <span>Barcode</span>
                                <span>SKU Code</span>
                            </div>

                            {/* Table Rows */}
                            {paginatedEntries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_1.3fr_0.7fr] gap-3 items-center px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                                >
                                    {/* User */}
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <User className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span className="text-xs font-medium truncate">
                                            {getUserName(entry)}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-xs text-muted-foreground truncate">
                                            {formatDate(entry.updated_at)}
                                        </span>
                                    </div>

                                    {/* Action */}
                                    <div>
                                        <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
                                            <Tag className="h-3 w-3 mr-1" />
                                            Barcode Linked
                                        </Badge>
                                    </div>

                                    {/* Inventory Type */}
                                    <div>
                                        <Badge
                                            variant={entry.record_type === "Bundle" ? "default" : "outline"}
                                            className="text-[10px] font-medium px-2 py-0.5"
                                        >
                                            {entry.record_type}
                                        </Badge>
                                    </div>

                                    {/* Barcode Preview + Type */}
                                    <div className="flex flex-col items-center gap-0.5">
                                        {entry.barcode_value ? (
                                            <>
                                                <BarcodeComponent
                                                    value={entry.barcode_value}
                                                    format={getBarcodeFormat(entry)}
                                                    width={1}
                                                    height={28}
                                                    fontSize={9}
                                                    margin={0}
                                                    displayValue={true}
                                                />
                                                <span className="text-[10px] text-muted-foreground">
                                                    {entry.barcode_type_id?.name || "-"}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">-</span>
                                        )}
                                    </div>

                                    {/* SKU Code */}
                                    <div>
                                        <span className="font-mono text-xs font-semibold text-foreground">
                                            {entry.sku_code || "-"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                <div className="border-t px-6 py-3 flex items-center justify-between bg-muted/30 shrink-0">
                    <span className="text-xs text-muted-foreground">
                        Showing {paginatedEntries.length} of {totalItems} {totalItems === 1 ? "entry" : "entries"}
                    </span>

                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>

                        <span className="text-xs font-medium px-2">
                            Page {currentPage} of {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
