"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Announcement } from "@/types/announcement";
import { AnnouncementModal } from "./announcement-modal";

export interface AcknowledgedMemosModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AcknowledgedMemosModal({
    open,
    onOpenChange
}: AcknowledgedMemosModalProps) {
    const [history, setHistory] = React.useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedAnnouncement, setSelectedAnnouncement] = React.useState<Announcement | null>(null);
    const [isDetailOpen, setIsDetailOpen] = React.useState(false);

    // Fetch acknowledgment history on open
    React.useEffect(() => {
        if (open) {
            setIsLoading(true);
            fetch("/api/announcements/acknowledged")
                .then((res) => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch history");
                })
                .then((data) => {
                    setHistory(data.announcements || []);
                })
                .catch((err) => {
                    console.error("Error loading acknowledged memos:", err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [open]);

    // Handle global smooth scrolling stop
    React.useEffect(() => {
        const globalWindow = typeof window !== "undefined" ? (window as unknown as { lenis?: { stop: () => void; start: () => void } }) : null;
        if (open && globalWindow && globalWindow.lenis) {
            globalWindow.lenis.stop();
            return () => {
                if (globalWindow.lenis) {
                    globalWindow.lenis.start();
                }
            };
        }
    }, [open]);

    // Filter list by search query
    const filteredHistory = history.filter((ann) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const memoNo = (ann.memo.memo_no || "").toLowerCase();
        const subject = (ann.memo.subject || "").toLowerCase();
        return memoNo.includes(query) || subject.includes(query);
    });

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        try {
            // Strip any trailing Z, millisecond decimals, or timezone offset suffix (+08:00) to get raw date/time
            const cleanDateStr = dateStr
                .replace(/Z$/, "")
                .replace(/\.\d+$/, "")
                .replace(/\+\d{2}:\d{2}$/, "")
                .replace(/T/, " ");
            
            // Format to ISO style for standard Date parsing as local time
            const formattedInput = cleanDateStr.replace(" ", "T");
            const date = new Date(formattedInput);
            return new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[850px] max-h-[85vh] flex flex-col p-4 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-950 dark:text-white shadow-2xl">
                    <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-cyan-5/10 dark:bg-cyan-500/10 flex items-center justify-center border border-cyan-200 dark:border-cyan-500/20">
                                <Icons.Megaphone className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                    Announcements
                                </DialogTitle>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    History of memos acknowledged by your account
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Search and Filters */}
                    <div className="shrink-0 mt-1 relative">
                        <Icons.Search className="absolute left-4 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by Memo No. or Subject..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 dark:focus:ring-cyan-500/40 focus:border-cyan-500 dark:focus:border-cyan-500/40 transition-all font-medium"
                        />
                    </div>

                    {/* Table Viewport */}
                    <div className="flex-1 overflow-y-auto mt-1.5 min-h-[300px] border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                                <Icons.Loader2 className="h-8 w-8 text-cyan-600 dark:text-cyan-400 animate-spin" />
                                <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    Loading history...
                                </span>
                            </div>
                        ) : filteredHistory.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900/30">
                                        <th className="px-6 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[25%]">
                                            Memo No.
                                        </th>
                                        <th className="px-6 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[45%]">
                                            Subject
                                        </th>
                                        <th className="px-6 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[30%] text-right whitespace-nowrap">
                                            Date Acknowledged
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.map((ann, idx) => (
                                        <tr
                                            key={ann.memo.id || idx}
                                            onClick={() => {
                                                setSelectedAnnouncement(ann);
                                                setIsDetailOpen(true);
                                            }}
                                            className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-100/30 dark:hover:bg-white/[0.02] active:bg-slate-100/50 dark:active:bg-white/[0.04] transition-all cursor-pointer group"
                                        >
                                            <td className="px-6 py-1.5 text-sm font-bold text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-300">
                                                {ann.memo.memo_no || "N/A"}
                                            </td>
                                            <td className="px-6 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {ann.memo.subject}
                                            </td>
                                            <td className="px-6 py-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">
                                                {formatDate(ann.acknowledged_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-4">
                                <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-white/5">
                                    <Icons.Inbox className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-400">
                                        No memos found
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-medium">
                                        {searchQuery ? "Try a different search query" : "You have not acknowledged any memos yet"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Inner Details Announcement Modal Overlay */}
            {selectedAnnouncement && (
                <AnnouncementModal
                    open={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    announcements={[selectedAnnouncement]}
                    mode="view-only"
                />
            )}
        </>
    );
}
