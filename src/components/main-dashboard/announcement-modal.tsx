"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Announcement } from "@/types/announcement";

const formatReleasedAt = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).format(date);
    } catch {
        return dateStr;
    }
};

export interface AnnouncementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    announcements: Announcement[];
    mode?: "popup" | "view-only";
    onAcknowledge?: (memoIds: number[]) => Promise<void>;
}

export function AnnouncementModal({
    open,
    onOpenChange,
    announcements,
    mode = "popup",
    onAcknowledge
}: AnnouncementModalProps) {
    const [queue, setQueue] = React.useState<Announcement[]>([]);
    const [activeTabIndex, setActiveTabIndex] = React.useState(0);
    const [isCurrentChecked, setIsCurrentChecked] = React.useState(false);
    const [isAcknowledging, setIsAcknowledging] = React.useState(false);

    // Initialize/sync queue on open/prop changes
    React.useEffect(() => {
        const list = announcements || [];
        if (open) {
            if (mode === "popup") {
                // Sort by memo.id ascending (oldest first)
                const sorted = [...list].sort((a, b) => (a.memo.id || 0) - (b.memo.id || 0));
                setQueue(sorted);
            } else {
                setQueue(list);
            }
            setActiveTabIndex(0);
            setIsCurrentChecked(false);
        } else {
            setQueue([]);
            setIsCurrentChecked(false);
        }
    }, [open, announcements, mode]);

    const activeAnnouncement = mode === "popup" ? queue[0] : queue[activeTabIndex];

    // Get format and URL for the active attachment
    const attachment = activeAnnouncement?.attachments?.[0];
    const fileName = attachment?.file_name || "";
    const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
    const isWord = /\.(docx?|xlsx?|pptx?)$/i.test(fileName);

    let attachmentUrl = "";
    if (attachment) {
        const fileUrl = attachment.file_url;
        if (fileUrl) {
            const base = fileUrl.startsWith("http") ? fileUrl : `${activeAnnouncement.directusBaseUrl}/assets/${fileUrl}`;
            
            // Append #toolbar=0 to PDF and &wdToolbar=0 to Word viewer URLs to hide toolbar
            if (/\.pdf$/i.test(fileName)) {
                attachmentUrl = `${base}#toolbar=0`;
            } else if (isWord) {
                attachmentUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(base)}&wdToolbar=0`;
            } else {
                attachmentUrl = base;
            }
        }
    }

    // Turn off global Lenis smooth scrolling when modal is open to restore native modal scrolling
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

    if (queue.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={mode === "popup" ? () => {} : onOpenChange}>
            <DialogContent 
                showCloseButton={mode === "view-only"} 
                onInteractOutside={mode === "popup" ? (e) => e.preventDefault() : undefined}
                onEscapeKeyDown={mode === "popup" ? (e) => e.preventDefault() : undefined}
                className={cn(
                    "w-[96vw] h-[96vh] flex flex-col p-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl mx-auto",
                    (mode === "view-only" && queue.length >= 2) ? "sm:max-w-[96vw]" : "sm:max-w-[850px]"
                )}
            >
                <DialogHeader className="border-b border-slate-100 dark:border-white/5 pb-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 mb-0.5">
                        <Icons.Megaphone className="h-4 w-4 animate-bounce" />
                        <span className="text-[9px] font-black tracking-[0.35em] uppercase">OFFICIAL ANNOUNCEMENT</span>
                    </div>
                    <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none">
                        {activeAnnouncement?.memo?.subject || "New Announcement"}
                    </DialogTitle>
                </DialogHeader>

                {/* Content Container (Split-Pane Sidebar if 2+ announcements in view-only mode) */}
                <div className="flex-1 min-h-0 w-full flex flex-col md:flex-row gap-4">
                    {/* Sidebar Left Column */}
                    {mode === "view-only" && queue.length >= 2 && (
                        <div className="w-full md:w-1/3 flex flex-col gap-2 overflow-y-auto max-h-[30vh] md:max-h-full md:border-r border-slate-100 dark:border-white/5 md:pr-4 shrink-0">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 px-1">
                                Announcements ({queue.length})
                            </h4>
                            {queue.map((ann: Announcement, index: number) => {
                                const isCurrent = index === activeTabIndex;
                                return (
                                    <button
                                        key={ann.memo.id}
                                        onClick={() => setActiveTabIndex(index)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3",
                                            isCurrent 
                                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold" 
                                                : "bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs uppercase tracking-wide line-clamp-2 leading-snug">
                                                {ann.memo.subject || "Announcement"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-1">
                                                Memo ID: {ann.memo.memo_id || "N/A"}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-center mt-0.5">
                                            <Icons.Eye className="h-4 w-4 text-cyan-500" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Content Right Column */}
                    <div className="flex-1 min-h-0 h-full overflow-y-auto pr-1">
                        {activeAnnouncement?.memo?.issued_by_code && (
                            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 flex-wrap">
                                <Icons.UserCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span>Issued By: {activeAnnouncement.memo.issued_by_code}</span>
                                {activeAnnouncement.memo.released_at && (
                                    <>
                                        <span className="text-slate-200 dark:text-white/10 mx-0.5">|</span>
                                        <span>Issued At: {formatReleasedAt(activeAnnouncement.memo.released_at)}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 1. Memo Rich Text Body or Text Description */}
                        {activeAnnouncement?.memo?.body ? (
                            <div 
                                className={[
                                    "mb-4 p-5 rounded-xl border border-slate-200",
                                    "bg-white",
                                    "text-sm text-slate-800 leading-relaxed break-words",
                                    // Paragraphs
                                    "[&_p]:mb-4 [&_p:last-child]:mb-0",
                                    // Lists
                                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4",
                                    "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4",
                                    "[&_li]:mb-1",
                                    // Headings
                                    "[&_h1]:text-2xl [&_h1]:font-black [&_h1]:mb-3 [&_h1]:text-slate-900 dark:[&_h1]:text-white",
                                    "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-slate-900 dark:[&_h2]:text-white",
                                    "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100",
                                    // Strong / bold
                                    "[&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white",
                                    "[&_em]:italic dark:[&_em]:text-slate-300",
                                    // Horizontal rule
                                    "[&_hr]:border-slate-200 dark:[&_hr]:border-white/10 [&_hr]:my-4",
                                    // Blockquote
                                    "[&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic",
                                    "[&_blockquote]:border-slate-300 dark:[&_blockquote]:border-cyan-400/50",
                                    "[&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-300",
                                    // Code
                                    "[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono",
                                    "[&_code]:bg-slate-200 [&_code]:text-slate-800 dark:[&_code]:bg-slate-700 dark:[&_code]:text-cyan-300",
                                    "[&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3",
                                    "[&_pre]:bg-slate-200 dark:[&_pre]:bg-slate-900",
                                    // Tables
                                    "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm",
                                    "[&_th]:text-left [&_th]:font-bold [&_th]:px-3 [&_th]:py-2 [&_th]:border",
                                    "[&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:text-slate-700",
                                    "dark:[&_th]:border-white/10 dark:[&_th]:bg-slate-700 dark:[&_th]:text-slate-200",
                                    "[&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-slate-200 [&_td]:align-top",
                                    "dark:[&_td]:border-white/10 dark:[&_td]:text-slate-300",
                                    "[&_tr:nth-child(even)]:bg-slate-50 dark:[&_tr:nth-child(even)]:bg-slate-800/40",
                                    // Links
                                    "[&_a]:text-cyan-600 dark:[&_a]:text-cyan-400 [&_a]:underline [&_a]:underline-offset-2",
                                ].join(" ")}
                                dangerouslySetInnerHTML={{ 
                                    __html: activeAnnouncement.memo.body.replace(/&nbsp;/g, " ") 
                                }}
                            />
                        ) : activeAnnouncement?.memo?.description ? (
                            <div className="mb-4 p-5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {activeAnnouncement.memo.description}
                            </div>
                        ) : null}

                        {/* 2. Memo Attachment Preview */}
                        {attachmentUrl && (
                            <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950">
                                {isImage ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={attachmentUrl}
                                        className="w-full h-auto max-h-[650px] object-contain mx-auto"
                                        alt={fileName}
                                    />
                                ) : (
                                    <iframe
                                        src={attachmentUrl}
                                        className="w-full h-[650px] border-none"
                                        title="Announcement Attachment"
                                    />
                                )}
                            </div>
                        )}

                        {!activeAnnouncement?.memo?.body && !activeAnnouncement?.memo?.description && !attachmentUrl && (
                            <div className="h-full flex items-center justify-center p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                                <p className="text-sm text-slate-400">No content available for this announcement.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t border-slate-100 dark:border-white/5 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {mode === "popup" && activeAnnouncement ? (
                        <>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isCurrentChecked}
                                    onChange={(e) => setIsCurrentChecked(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500/20 focus:ring-2 focus:ring-offset-2 dark:bg-slate-800"
                                />
                                <span>I have read and understood this announcement</span>
                            </label>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <Button
                                    onClick={async () => {
                                        setIsAcknowledging(true);
                                        try {
                                            if (onAcknowledge) {
                                                await onAcknowledge([activeAnnouncement.memo.id]);
                                            }
                                            if (queue.length > 1) {
                                                setQueue((prev) => prev.slice(1));
                                                setIsCurrentChecked(false);
                                            } else {
                                                onOpenChange(false);
                                            }
                                        } catch (err) {
                                            console.error("Failed to acknowledge announcements:", err);
                                        } finally {
                                            setIsAcknowledging(false);
                                        }
                                    }}
                                    disabled={isAcknowledging || !isCurrentChecked}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 font-black uppercase tracking-widest text-xs h-10 px-6 rounded-xl transition-all w-full sm:w-auto"
                                >
                                    {isAcknowledging ? "Acknowledging..." : "Acknowledge & Close"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="hidden sm:block text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                View-Only Mode
                            </div>
                            <Button
                                onClick={() => onOpenChange(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-950 font-black uppercase tracking-widest text-xs h-10 px-6 rounded-xl transition-all w-full sm:w-auto"
                            >
                                Close
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
