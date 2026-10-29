"use client";

import { cn } from "@/lib/utils";

import * as React from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    UploadCloud,
    FileText,
    Image as ImageIcon,
    FileCode,
    Trash2,
    Loader2,
    Eye,
    X,
    Check,
    AlertCircle,
} from "lucide-react";
import type { PhysicalInventoryAttachmentRow } from "../types";
import {
    fetchPhysicalInventoryAttachments,
    uploadCountSheetFile,
    createPhysicalInventoryAttachment,
    deletePhysicalInventoryAttachment,
} from "../providers/fetchProvider";

type Props = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    physicalInventoryId: number | null;
    phNo?: string | null;
    canEdit: boolean;
    isCommitted?: boolean;
    currentUserId?: number | null;
};

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatLiteralDateTime(isoString?: string | null): string {
    if (!isoString) return "—";

    // Extract the literal wall-clock date and time parts from the timestamp string (ignoring trailing 'Z' offset)
    const clean = isoString.replace("Z", "").split(".")[0];
    const [datePart, timePart] = clean.split(/[T ]/);
    if (!datePart || !timePart) return isoString;

    const [year, monthStr, dayStr] = datePart.split("-");
    const [hourStr, minStr] = timePart.split(":");

    const monthNum = parseInt(monthStr, 10);
    const dayNum = parseInt(dayStr, 10);
    const hourNum = parseInt(hourStr, 10);

    if (isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum)) return isoString;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[monthNum - 1] || monthStr;

    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;

    return `${monthName} ${dayNum}, ${year}, ${hour12}:${minStr} ${ampm}`;
}

function getFileIcon(filenameOrType?: string) {
    if (!filenameOrType) return <FileText className="h-5 w-5 text-muted-foreground" />;
    const lower = filenameOrType.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (lower.match(/\.pdf$/i)) {
        return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (lower.match(/\.(doc|docx)$/i)) {
        return <FileCode className="h-5 w-5 text-sky-600" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground" />;
}

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
    const [stagedFiles, setStagedFiles] = React.useState<Array<{ file: File; id: string; error?: string }>>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = React.useState<number | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const loadAttachments = React.useCallback(async () => {
        if (!physicalInventoryId) return;
        setIsLoading(true);
        try {
            const data = await fetchPhysicalInventoryAttachments(physicalInventoryId);
            setAttachments(data);
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
        } else if (!isOpen) {
            setAttachments([]);
            setStagedFiles([]);
        }
    }, [isOpen, physicalInventoryId, loadAttachments]);

    const handleStageFiles = (fileList: File[]) => {
        if (fileList.length === 0) return;

        const newStaged: Array<{ file: File; id: string; error?: string }> = [];

        for (const file of fileList) {
            const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
            let errorMsg: string | undefined = undefined;

            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                errorMsg = `Format not allowed (${ext}). Allowed: Images, PDF, Word.`;
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

    const handleRemoveStaged = (idToRemove: string) => {
        setStagedFiles((prev) => prev.filter((item) => item.id !== idToRemove));
    };

    const handleUploadStaged = async () => {
        if (!physicalInventoryId || stagedFiles.length === 0) return;

        const validFiles = stagedFiles.filter((item) => !item.error);
        if (validFiles.length === 0) {
            toast.error("Please remove or fix invalid files before proceeding.");
            return;
        }

        setIsUploading(true);
        let successCount = 0;
        const remainingStaged: Array<{ file: File; id: string; error?: string }> = [];

        for (const item of stagedFiles) {
            if (item.error) {
                remainingStaged.push(item);
                continue;
            }

            try {
                const uploaded = await uploadCountSheetFile(item.file);
                if (uploaded?.id) {
                    await createPhysicalInventoryAttachment({
                        physical_inventory_id: physicalInventoryId,
                        directus_file_id: uploaded.id,
                        created_by: currentUserId || 1,
                    });
                    successCount++;
                } else {
                    remainingStaged.push({ ...item, error: "Upload failed to return file ID." });
                }
            } catch (err) {
                console.error("Upload error for file:", item.file.name, err);
                remainingStaged.push({
                    ...item,
                    error: err instanceof Error ? err.message : "Upload failed.",
                });
            }
        }

        setStagedFiles(remainingStaged);
        setIsUploading(false);

        if (successCount > 0) {
            toast.success(`Successfully uploaded ${successCount} file(s).`);
            void loadAttachments();
        }
        if (remainingStaged.length > 0 && remainingStaged.some((r) => r.error)) {
            toast.error(`Some files could not be uploaded. Check the list.`);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        handleStageFiles(Array.from(files));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isUploading) return;
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleStageFiles(Array.from(files));
        }
    };

    const handleDelete = async () => {
        if (!attachmentToDelete || isReadOnly) return;
        setIsDeleting(true);
        try {
            await deletePhysicalInventoryAttachment(attachmentToDelete);
            toast.success("Attachment deleted successfully.");
            setAttachmentToDelete(null);
            void loadAttachments();
        } catch (error) {
            console.error("Failed to delete attachment:", error);
            toast.error("Failed to delete attachment.");
        } finally {
            setIsDeleting(false);
        }
    };

    const isReadOnly = !canEdit || Boolean(isCommitted);

    const directusUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl sm:max-w-4xl xl:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            <UploadCloud className="h-5 w-5 text-primary" />
                            Upload Count Sheet {phNo ? `- ${phNo}` : ""}
                        </DialogTitle>
                        <DialogDescription>
                            Upload manual count tally sheets, photos, or documents (Images, PDF, Word up to 10 MB each).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {!isReadOnly && (
                            <>
                                <Card
                                    className={cn(
                                        "flex flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
                                        isDragging
                                            ? "border-primary bg-primary/10"
                                            : "border-muted-foreground/30 bg-muted/10 hover:bg-muted/20 hover:border-muted-foreground/50"
                                    )}
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragEnter={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        disabled={isUploading}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                        <p className="text-sm font-medium">
                                            Click or drag files here to select
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Supports multiple files: Images (JPG, PNG, WEBP), PDF, Word (.doc, .docx). Max 10MB each.
                                        </p>
                                    </div>
                                </Card>

                                {stagedFiles.length > 0 && (
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-foreground">
                                                Selected Files ({stagedFiles.length})
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                Click &quot;Done&quot; to upload selected file(s)
                                            </span>
                                        </div>

                                        <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                                            {stagedFiles.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-xs bg-background",
                                                        item.error && "border-destructive/50 bg-destructive/5 text-destructive"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {item.error ? (
                                                            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                                                        ) : (
                                                            getFileIcon(item.file.name)
                                                        )}
                                                        <span className="truncate font-medium">
                                                            {item.file.name}
                                                        </span>
                                                        <span className="shrink-0 text-[10px] text-muted-foreground">
                                                            ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {item.error && (
                                                            <span className="text-[11px] text-destructive font-medium">
                                                                {item.error}
                                                            </span>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveStaged(item.id);
                                                            }}
                                                            disabled={isUploading}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end gap-2 pt-1 border-t">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs cursor-pointer"
                                                onClick={() => setStagedFiles([])}
                                                disabled={isUploading}
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-8 text-xs cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                onClick={handleUploadStaged}
                                                disabled={isUploading || stagedFiles.length === 0}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="h-3.5 w-3.5" />
                                                )}
                                                {isUploading ? "Uploading..." : "Done"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">
                                    Attachments ({attachments.length})
                                </h4>
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>

                            {attachments.length === 0 && !isLoading ? (
                                <div className="flex min-h-[140px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                                    No count sheets uploaded yet.
                                </div>
                            ) : (
                                <div className="max-h-[260px] overflow-y-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File</TableHead>
                                                <TableHead>Uploaded By</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {attachments.map((att) => {
                                                const uploaderName =
                                                    typeof att.created_by === "object" && att.created_by
                                                        ? [att.created_by.user_fname, att.created_by.user_lname]
                                                              .filter(Boolean)
                                                              .join(" ") || "User"
                                                        : "User";

                                                const fileUrl = `${directusUrl}/assets/${att.directus_file_id}`;
                                                const formattedDate = formatLiteralDateTime(att.created_at);

                                                return (
                                                    <TableRow key={att.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {getFileIcon(att.directus_file_id)}
                                                                <span className="max-w-[200px] truncate text-xs sm:max-w-[260px]">
                                                                    {att.directus_file_id}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {uploaderName}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {formattedDate}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    asChild
                                                                >
                                                                    <a
                                                                        href={fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        title="View / Download"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                                {!isReadOnly && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                        onClick={() => setAttachmentToDelete(att.id)}
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={attachmentToDelete !== null}
                onOpenChange={(open) => !open && setAttachmentToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this count sheet attachment? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

