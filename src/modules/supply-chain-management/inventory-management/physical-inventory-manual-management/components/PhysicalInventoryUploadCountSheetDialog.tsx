"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileCode,
    FileText,
    Image as ImageIcon,
    Loader2,
    RotateCcw,
    RotateCw,
    UploadCloud,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import type { PhysicalInventoryAttachmentRow } from "../types";
import {
    fetchPhysicalInventoryAttachments,
    uploadCountSheetFile,
    createPhysicalInventoryAttachment,
} from "../providers/fetchProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    physicalInventoryId: number | null;
    phNo?: string | null;
    canEdit: boolean;
    isCommitted?: boolean;
    currentUserId?: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLiteralDateTime(isoString?: string | null): string {
    if (!isoString) return "—";
    const clean = isoString.replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, "").split(".")[0];
    const [datePart, timePart] = clean.split(/[T ]/);
    if (!datePart || !timePart) return isoString;
    const [year, monthStr, dayStr] = datePart.split("-");
    const [hourStr, minStr] = timePart.split(":");
    const monthNum = parseInt(monthStr, 10);
    const dayNum = parseInt(dayStr, 10);
    const hourNum = parseInt(hourStr, 10);
    if (isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum)) return isoString;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[monthNum - 1] ?? monthStr;
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${monthName} ${dayNum}, ${year}, ${hour12}:${minStr} ${ampm}`;
}

function getAttachmentFileId(att: PhysicalInventoryAttachmentRow): string {
    return att.file_details?.id || att.directus_file_id || "";
}

function getAttachmentFilename(att: PhysicalInventoryAttachmentRow): string {
    return att.file_details?.filename_download || att.directus_file_id || "Attachment";
}

function getAttachmentMimeType(att: PhysicalInventoryAttachmentRow): string {
    return att.file_details?.type || "";
}

function getAttachmentFilesize(att: PhysicalInventoryAttachmentRow): string {
    const bytes = att.file_details?.filesize;
    if (!bytes) return "";
    return `(${(bytes / (1024 * 1024)).toFixed(2)} MB)`;
}

function getFileIcon(att: PhysicalInventoryAttachmentRow) {
    const filename = getAttachmentFilename(att).toLowerCase();
    const mime = getAttachmentMimeType(att);
    if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/.test(filename)) {
        return <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    if (mime === "application/pdf" || filename.endsWith(".pdf")) {
        return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
    }
    if (mime.includes("msword") || mime.includes("wordprocessingml") || /\.(doc|docx)$/.test(filename)) {
        return <FileCode className="h-4 w-4 text-sky-600 shrink-0" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function getStagedFileIcon(filename: string) {
    const lower = filename.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif)$/.test(lower)) return <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />;
    if (lower.endsWith(".pdf")) return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
    if (/\.(doc|docx)$/.test(lower)) return <FileCode className="h-4 w-4 text-sky-600 shrink-0" />;
    return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

// ─── Main Component: Master-Detail Split Pane ────────────────────────────────

export function PhysicalInventoryUploadCountSheetDialog({
    isOpen,
    onOpenChange,
    physicalInventoryId,
    phNo,
    canEdit,
    isCommitted = false,
    currentUserId,
}: Props) {
    const [attachments, setAttachments] = React.useState<PhysicalInventoryAttachmentRow[]>([]);
    const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
    const [stagedFiles, setStagedFiles] = React.useState<
        Array<{ file: File; id: string; error?: string }>
    >([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);

    // Canvas viewer state (for the active selected file)
    const [scale, setScale] = React.useState(1);
    const [rotation, setRotation] = React.useState(0);
    const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
    const [isCanvasDragging, setIsCanvasDragging] = React.useState(false);
    const dragStartRef = React.useRef({ x: 0, y: 0 });
    const translateStartRef = React.useRef({ x: 0, y: 0 });
    const canvasContainerRef = React.useRef<HTMLDivElement>(null);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const resetCanvas = React.useCallback(() => {
        setScale(1);
        setRotation(0);
        setTranslate({ x: 0, y: 0 });
    }, []);

    // ── Load attachments ──────────────────────────────────────────────────────
    const loadAttachments = React.useCallback(async () => {
        if (!physicalInventoryId) return;
        setIsLoading(true);
        try {
            const data = await fetchPhysicalInventoryAttachments(physicalInventoryId);
            setAttachments(data);
            setSelectedIndex((prev) => (prev >= data.length ? Math.max(0, data.length - 1) : prev));
        } catch (error) {
            console.error("Failed to load attachments:", error);
            toast.error("Failed to load attachments.");
        } finally {
            setIsLoading(false);
        }
    }, [physicalInventoryId]);

    React.useEffect(() => {
        if (isOpen && physicalInventoryId) {
            void loadAttachments();
            resetCanvas();
        } else if (!isOpen) {
            setAttachments([]);
            setStagedFiles([]);
            setSelectedIndex(0);
            resetCanvas();
        }
    }, [isOpen, physicalInventoryId, loadAttachments, resetCanvas]);

    // When switching active attachment, reset the canvas
    const handleSelectAttachment = React.useCallback(
        (index: number) => {
            if (index === selectedIndex) return;
            setSelectedIndex(index);
            resetCanvas();
        },
        [selectedIndex, resetCanvas],
    );

    // ── Scroll-wheel zoom for images ──────────────────────────────────────────
    const selectedAttachment = attachments[selectedIndex] ?? null;
    const fileId = selectedAttachment ? getAttachmentFileId(selectedAttachment) : "";
    const filename = selectedAttachment ? getAttachmentFilename(selectedAttachment) : "";
    const mimeType = selectedAttachment ? getAttachmentMimeType(selectedAttachment) : "";
    const directusUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    const fileUrl = fileId ? `${directusUrl}/assets/${fileId}` : "";

    const filenameLower = filename.toLowerCase();
    const isImage =
        mimeType.startsWith("image/") ||
        (!mimeType && /\.(jpg|jpeg|png|webp|gif)$/.test(filenameLower));
    const isPdf =
        mimeType === "application/pdf" ||
        (!mimeType && filenameLower.endsWith(".pdf"));
    const isDoc =
        mimeType.includes("msword") ||
        mimeType.includes("wordprocessingml") ||
        (!mimeType && /\.(doc|docx)$/.test(filenameLower));

    React.useEffect(() => {
        const el = canvasContainerRef.current;
        if (!el || !isOpen || !isImage) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            setScale((prev) => {
                const next = Math.min(4, Math.max(0.1, parseFloat((prev + delta).toFixed(2))));
                if (next <= 1) setTranslate({ x: 0, y: 0 });
                return next;
            });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [isOpen, isImage]);

    // ── Keyboard Prev / Next ──────────────────────────────────────────────────
    React.useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "ArrowLeft" && selectedIndex > 0) {
                handleSelectAttachment(selectedIndex - 1);
            }
            if (e.key === "ArrowRight" && selectedIndex < attachments.length - 1) {
                handleSelectAttachment(selectedIndex + 1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, selectedIndex, attachments.length, handleSelectAttachment]);

    // ── Pan handling for image ────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isImage) return;
        e.preventDefault();
        setIsCanvasDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        translateStartRef.current = { ...translate };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isCanvasDragging) return;
        setTranslate({
            x: translateStartRef.current.x + (e.clientX - dragStartRef.current.x),
            y: translateStartRef.current.y + (e.clientY - dragStartRef.current.y),
        });
    };

    const handleMouseUp = () => setIsCanvasDragging(false);

    // ── Zoom controls ─────────────────────────────────────────────────────────
    const handleZoomIn = () => setScale((prev) => Math.min(4, parseFloat((prev + 0.25).toFixed(2))));
    const handleZoomOut = () =>
        setScale((prev) => {
            const next = Math.max(0.1, parseFloat((prev - 0.25).toFixed(2)));
            if (next <= 1) setTranslate({ x: 0, y: 0 });
            return next;
        });
    const handleZoomPreset = (val: number) => {
        setScale(val);
        if (val <= 1) setTranslate({ x: 0, y: 0 });
    };

    // ── Rotate controls ───────────────────────────────────────────────────────
    const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
    const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

    // ── File upload / staging ─────────────────────────────────────────────────
    const handleStageFiles = (fileList: File[]) => {
        if (fileList.length === 0) return;
        const newStaged: Array<{ file: File; id: string; error?: string }> = [];
        for (const file of fileList) {
            const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
            let errorMsg: string | undefined;
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                errorMsg = `Format not allowed (${ext}).`;
            } else if (file.size > MAX_FILE_SIZE) {
                errorMsg = `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 10MB.`;
            }
            newStaged.push({
                file,
                id: `${file.name}-${file.lastModified}-${Math.random()}`,
                error: errorMsg,
            });
        }
        setStagedFiles((prev) => [...prev, ...newStaged]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleUploadStaged = async () => {
        if (!physicalInventoryId || stagedFiles.length === 0) return;
        const validFiles = stagedFiles.filter((item) => !item.error);
        if (validFiles.length === 0) {
            toast.error("Please remove invalid files before proceeding.");
            return;
        }
        setIsUploading(true);
        let successCount = 0;
        const remaining: Array<{ file: File; id: string; error?: string }> = [];
        for (const item of stagedFiles) {
            if (item.error) {
                remaining.push(item);
                continue;
            }
            try {
                const uploaded = await uploadCountSheetFile(item.file);
                if (uploaded?.id) {
                    await createPhysicalInventoryAttachment({
                        physical_inventory_id: physicalInventoryId,
                        directus_file_id: uploaded.id,
                        created_by: currentUserId ?? 1,
                    });
                    successCount++;
                } else {
                    remaining.push({ ...item, error: "Upload failed." });
                }
            } catch (err) {
                remaining.push({
                    ...item,
                    error: err instanceof Error ? err.message : "Upload failed.",
                });
            }
        }
        setStagedFiles(remaining);
        setIsUploading(false);
        if (successCount > 0) {
            toast.success(`Successfully uploaded ${successCount} file(s).`);
            void loadAttachments();
        }
    };

    const isReadOnly = !canEdit || Boolean(isCommitted);
    const isPresetScale = (ZOOM_PRESETS as readonly number[]).includes(scale);
    const zoomPercent = `${Math.round(scale * 100)}%`;
    const pdfIsTransposed = rotation === 90 || rotation === 270;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent
                    showCloseButton={false}
                    className={cn(
                        "!max-w-[96vw] !w-[96vw] sm:!max-w-[96vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden shadow-2xl rounded-2xl border bg-background"
                    )}
                >
                    {/* ── Modal Header ───────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
                                <UploadCloud className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-base font-semibold leading-tight truncate">
                                    {isReadOnly ? "Count Sheet Documents" : "Upload & Review Count Sheets"}
                                    {phNo ? ` — ${phNo}` : ""}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground truncate">
                                    {isReadOnly
                                        ? "Select an attachment on the left to inspect, zoom, rotate, or download."
                                        : "Manage tally sheets, photos, or documents. Click an item to preview."}
                                </DialogDescription>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => onOpenChange(false)}
                            title="Close modal"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* ── Main Split View Body ───────────────────────────────── */}
                    <div className="flex-1 flex overflow-hidden min-h-0 bg-background">
                        {/* ── LEFT PANE: Attachment List & Upload Zone (320px - 380px) ── */}
                        <div className="w-[320px] sm:w-[360px] xl:w-[400px] border-r flex flex-col shrink-0 bg-muted/20">
                            {/* Upload Area (Edit mode only) */}
                            {!isReadOnly && (
                                <div className="p-3 border-b bg-background space-y-2">
                                    <Card
                                        className={cn(
                                            "flex flex-col items-center justify-center border-2 border-dashed p-3.5 text-center transition-colors cursor-pointer rounded-xl",
                                            isDragging
                                                ? "border-teal-500 bg-teal-500/10"
                                                : "border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 hover:border-teal-500/50"
                                        )}
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            if (e.dataTransfer.files?.length) {
                                                handleStageFiles(Array.from(e.dataTransfer.files));
                                            }
                                        }}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.length) {
                                                    handleStageFiles(Array.from(e.target.files));
                                                }
                                            }}
                                            disabled={isUploading}
                                        />
                                        <UploadCloud className="h-6 w-6 text-teal-600 dark:text-teal-400 mb-1" />
                                        <p className="text-xs font-semibold">Click or drop new files here</p>
                                        <p className="text-[10px] text-muted-foreground">Images, PDF, Word (Max 10MB)</p>
                                    </Card>

                                    {/* Staged files quick upload bar */}
                                    {stagedFiles.length > 0 && (
                                        <div className="rounded-lg border bg-background p-2 space-y-1.5 shadow-sm">
                                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                                <span>Ready to upload ({stagedFiles.length})</span>
                                                <div className="flex gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-1.5 text-[10px]"
                                                        onClick={() => setStagedFiles([])}
                                                        disabled={isUploading}
                                                    >
                                                        Clear
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-6 px-2 text-[10px] bg-teal-600 hover:bg-teal-700 text-white gap-1"
                                                        onClick={handleUploadStaged}
                                                        disabled={isUploading}
                                                    >
                                                        {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                                        Upload
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="max-h-[90px] overflow-y-auto space-y-1 pr-1">
                                                {stagedFiles.map((sf) => (
                                                    <div
                                                        key={sf.id}
                                                        className="flex items-center justify-between gap-1 text-[11px] py-0.5 px-1.5 rounded bg-muted/40"
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            {getStagedFileIcon(sf.file.name)}
                                                            <span className="truncate">{sf.file.name}</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                                                            onClick={() => setStagedFiles((prev) => prev.filter((p) => p.id !== sf.id))}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section Header */}
                            <div className="px-4 py-2.5 border-b bg-muted/40 flex items-center justify-between shrink-0">
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    Attachments ({attachments.length})
                                </span>
                                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                            </div>

                            {/* List of Attachments */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                                {attachments.length === 0 && !isLoading && (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        No count sheets attached yet.
                                    </div>
                                )}

                                {attachments.map((att, idx) => {
                                    const isSelected = idx === selectedIndex;
                                    const attFilename = getAttachmentFilename(att);
                                    const formattedDate = formatLiteralDateTime(att.created_at);
                                    const sizeStr = getAttachmentFilesize(att);
                                    const uploaderName =
                                        typeof att.created_by === "object" && att.created_by
                                            ? [att.created_by.user_fname, att.created_by.user_lname].filter(Boolean).join(" ") || "User"
                                            : "User";

                                    return (
                                        <div
                                            key={att.id}
                                            onClick={() => handleSelectAttachment(idx)}
                                            className={cn(
                                                "group flex items-start gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                                                isSelected
                                                    ? "bg-teal-500/10 border-teal-500/50 shadow-sm ring-1 ring-teal-500/30"
                                                    : "bg-card hover:bg-muted/50 border-border/70"
                                            )}
                                        >
                                            <div className="mt-0.5">{getFileIcon(att)}</div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p
                                                        className={cn(
                                                            "text-xs font-medium truncate",
                                                            isSelected ? "text-teal-900 dark:text-teal-200 font-semibold" : "text-foreground"
                                                        )}
                                                        title={attFilename}
                                                    >
                                                        {attFilename}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                                    <span className="truncate">{uploaderName}</span>
                                                    <span>•</span>
                                                    <span className="shrink-0">{sizeStr}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground/80 mt-0.5">{formattedDate}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── RIGHT PANE: Interactive Canvas Viewer ───────────── */}
                        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative overflow-hidden">
                            {selectedAttachment ? (
                                <>
                                    {/* Canvas Toolbar */}
                                    <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0 text-zinc-100 z-10">
                                        {/* Prev / Next Attachment Navigation */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                onClick={() => handleSelectAttachment(selectedIndex - 1)}
                                                disabled={selectedIndex <= 0}
                                                title="Previous (←)"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="text-xs font-mono text-zinc-400 px-1">
                                                {selectedIndex + 1} / {attachments.length}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                onClick={() => handleSelectAttachment(selectedIndex + 1)}
                                                disabled={selectedIndex >= attachments.length - 1}
                                                title="Next (→)"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>

                                            <div className="w-px h-4 bg-zinc-700 mx-1.5" />

                                            <span className="text-xs font-medium text-zinc-200 truncate max-w-[200px] sm:max-w-[320px]" title={filename}>
                                                {filename}
                                            </span>
                                        </div>

                                        {/* Right Toolbar Controls (Zoom / Rotate / Download) */}
                                        <div className="flex items-center gap-1">
                                            {/* Zoom Controls (Images & PDFs) */}
                                            {(isImage || isPdf) && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                        onClick={handleZoomOut}
                                                        title="Zoom Out (-)"
                                                    >
                                                        <ZoomOut className="h-4 w-4" />
                                                    </Button>

                                                    <select
                                                        value={isPresetScale ? String(scale) : "custom"}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            if (!isNaN(val) && val > 0) handleZoomPreset(val);
                                                        }}
                                                        className="h-7 w-[68px] rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0 text-xs text-zinc-200 cursor-pointer focus:outline-none"
                                                        title="Zoom level"
                                                    >
                                                        {ZOOM_PRESETS.map((p) => (
                                                            <option key={p} value={String(p)}>
                                                                {Math.round(p * 100)}%
                                                            </option>
                                                        ))}
                                                        {!isPresetScale && <option value="custom">{zoomPercent}</option>}
                                                    </select>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                        onClick={handleZoomIn}
                                                        title="Zoom In (+)"
                                                    >
                                                        <ZoomIn className="h-4 w-4" />
                                                    </Button>

                                                    <div className="w-px h-4 bg-zinc-700 mx-1" />
                                                </>
                                            )}

                                            {/* Rotate Controls */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                onClick={handleRotateLeft}
                                                title="Rotate Left 90°"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                onClick={handleRotateRight}
                                                title="Rotate Right 90°"
                                            >
                                                <RotateCw className="h-4 w-4" />
                                            </Button>

                                            <div className="w-px h-4 bg-zinc-700 mx-1" />

                                            {/* Reset button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                onClick={resetCanvas}
                                                title="Reset zoom & rotation"
                                            >
                                                Reset
                                            </Button>

                                            {/* Download button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                                asChild
                                                title="Download original file"
                                            >
                                                <a href={fileUrl} download={filename || undefined}>
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Canvas Viewport */}
                                    <div
                                        ref={canvasContainerRef}
                                        className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center select-none"
                                    >
                                        {/* Image Display */}
                                        {isImage && (
                                            <div
                                                className="w-full h-full flex items-center justify-center overflow-hidden"
                                                style={{
                                                    cursor: isCanvasDragging ? "grabbing" : scale > 1 ? "grab" : "default",
                                                }}
                                                onMouseDown={handleMouseDown}
                                                onMouseMove={handleMouseMove}
                                                onMouseUp={handleMouseUp}
                                                onMouseLeave={handleMouseUp}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={fileUrl}
                                                    alt={filename}
                                                    draggable={false}
                                                    style={{
                                                        maxWidth: "92%",
                                                        maxHeight: "92%",
                                                        objectFit: "contain",
                                                        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                                        transformOrigin: "center center",
                                                        transition: isCanvasDragging ? "none" : "transform 0.15s ease-out",
                                                        pointerEvents: "none",
                                                        userSelect: "none",
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* PDF Display */}
                                        {isPdf && (
                                            <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                                <iframe
                                                    src={fileUrl}
                                                    title={filename}
                                                    style={{
                                                        width: pdfIsTransposed ? "85vh" : "100%",
                                                        height: pdfIsTransposed ? "85vw" : "100%",
                                                        border: "none",
                                                        transform: `rotate(${rotation}deg) scale(${scale})`,
                                                        transformOrigin: "center center",
                                                        transition: "transform 0.15s ease-out",
                                                        backgroundColor: "white",
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Non-previewable (Word, etc.) */}
                                        {!isImage && !isPdf && (
                                            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                                                <FileCode className="h-14 w-14 text-sky-400 opacity-80" />
                                                <p className="text-zinc-300 text-sm max-w-sm">
                                                    {isDoc
                                                        ? "Word documents (.doc/.docx) cannot be previewed directly in the browser canvas."
                                                        : "Preview is not available for this file format."}
                                                </p>
                                                <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer mt-2">
                                                    <a href={fileUrl} download={filename || undefined}>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Download {filename}
                                                    </a>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
                                    <Eye className="h-8 w-8 opacity-40" />
                                    <p className="text-sm">Select an attachment from the left to view</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
