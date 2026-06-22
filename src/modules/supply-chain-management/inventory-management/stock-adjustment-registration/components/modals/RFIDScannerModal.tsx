
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ScanLine, Tag, Wifi, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RFIDScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onSave: (tags: string[]) => void;
  initialTags?: string[];
  type: "IN" | "OUT";
  branchId?: number;
  validateRFID?: (rfid: string, branchId?: number) => Promise<{ exists: boolean; location?: string }>;
}

export function RFIDScannerModal({
  open,
  onOpenChange,
  productName,
  onSave,
  initialTags = [],
  type,
  branchId,
  validateRFID,
}: RFIDScannerModalProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTags(initialTags);
    }
  }

  const [currentInput, setCurrentInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Focus input when modal opens with a very short delay
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const handleAddTag = async (tag: string) => {
    let rawTag = tag.trim().toUpperCase();
    if (!rawTag) return;

    // --- Pattern Detection for Concatenated Scans ---
    if (rawTag.length >= 16) {
      for (let len = 8; len <= rawTag.length / 2; len++) {
        if (rawTag.length % len === 0) {
          const chunk = rawTag.substring(0, len);
          const expected = chunk.repeat(rawTag.length / len);
          if (rawTag === expected) {
            rawTag = chunk;
            break;
          }
        }
      }
    }

    // --- RFID Validation: Must be exactly 24 alphanumeric characters ---
    if (rawTag.length !== 24 || !/^[A-Z0-9]{24}$/.test(rawTag)) {
      toast.error("Invalid RFID Tag", {
        description: `RFID tag must be exactly 24 alphanumeric characters.`,
      });
      return;
    }

    if (tags.includes(rawTag)) {
      toast.error("RFID tag already added in this session");
      return;
    }

    // --- Backend Validation for EXISTING tags during Stock In ---
    if (type === "IN" && validateRFID) {
      setIsValidating(true);
      try {
        const { exists, location } = await validateRFID(rawTag, branchId);
        if (exists) {
          toast.error("Process Blocked", {
            description: `RFID tag ${rawTag} already exists (${location || "Unknown Location"}).`,
            duration: 5000,
          });
          setCurrentInput("");
          return;
        }
      } catch (err) {
        console.error("RFID Validation failed:", err);
      } finally {
        setIsValidating(false);
      }
    }

    setTags((prev) => [...prev, rawTag]);
    setLastScanned(rawTag);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 800);
    setCurrentInput("");
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const initialTagsSet = React.useMemo(() => new Set(initialTags), [initialTags]);

  const handleRemoveTag = (index: number) => {
    const tagToRemove = tags[index];
    if (initialTagsSet.has(tagToRemove)) {
      toast.error("Existing tags cannot be removed");
      return;
    }
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setTags(initialTags);
    toast.success("All newly scanned tags cleared");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isValidating) return; // Block input while validating
    if (e.key === "Enter") {
      e.preventDefault();
      const val = currentInput;
      // Clear immediately to prevent rapid-fire concatenation in the input field
      setCurrentInput(""); 
      handleAddTag(val);
    }
  };

  const handleSave = () => {
    onSave(tags);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] md:max-w-[850px] border-none shadow-2xl overflow-hidden p-0 bg-card max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="bg-primary p-4 sm:p-6 text-primary-foreground shadow-inner shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 dark:bg-black/20 p-2 rounded-lg backdrop-blur-md">
                <ScanLine className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white/95">
                RFID Batch Scanner
              </DialogTitle>
            </div>
            <p className="text-white/80 text-sm font-medium">
              Scanning for: <span className="text-white font-bold underline decoration-white/30 underline-offset-4">{productName}</span>
            </p>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto min-h-0" onClick={handleContainerClick}>
          {/* Hidden Input for Scanner Events */}
          <input
            ref={inputRef}
            type="text"
            className="absolute opacity-0 pointer-events-none"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Left Column - Visual state */}
            <div className="md:col-span-5 flex flex-col justify-center">
              <div className={`flex flex-col items-center justify-center py-6 sm:py-10 px-4 border-2 border-dashed rounded-3xl transition-all duration-300 space-y-4 animate-in fade-in zoom-in duration-500 shadow-sm h-full ${
                isSuccess 
                  ? "border-green-500/50 bg-green-500/5 dark:bg-green-500/10 scale-[1.02]" 
                  : "border-primary/20 bg-primary/5 dark:bg-primary/5"
              }`}>
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full animate-ping scale-150 duration-2000 ${isSuccess ? "bg-green-500/20" : "bg-primary/20"}`} />
                  <div className={`relative p-4 sm:p-6 rounded-full shadow-xl transition-all duration-300 ${
                    isSuccess ? "bg-green-500 shadow-green-500/20" : "bg-primary shadow-primary/20"
                  }`}>
                    {isSuccess ? (
                      <Tag className="h-8 w-8 sm:h-12 sm:w-12 text-white animate-bounce" />
                    ) : (
                      <Wifi className="h-8 w-8 sm:h-12 sm:w-12 text-white animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className={`text-lg sm:text-2xl font-black tracking-tight transition-colors duration-300 ${
                    isSuccess ? "text-green-600 dark:text-green-400" : "text-primary dark:text-primary/70"
                  }`}>
                    {isSuccess ? "Captured!" : "Ready to Scan"}
                  </h3>
                  <p className={`text-xs font-bold transition-colors duration-300 ${
                    isSuccess ? "text-green-600/80 dark:text-green-400/80" : "text-primary/70 dark:text-primary/60"
                  }`}>
                    {isSuccess ? `Tag ${lastScanned?.substring(0, 8)}... added` : "Position physical RFID scanner and scan"}
                  </p>
                </div>
                <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300 shadow-sm ${
                  isSuccess ? "bg-green-500 border-green-400 dark:border-green-600" : "bg-background border-primary/20"
                }`}>
                    {isSuccess ? (
                      <ScanLine className="h-4 w-4 text-white animate-pulse" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      isSuccess ? "text-white" : "text-primary"
                    }`}>
                      {isSuccess ? "Processing Scan..." : "Waiting for RFID scan..."}
                    </span>
                </div>
              </div>
            </div>

            {/* Right Column - Scan History */}
            <div className="md:col-span-7 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
                    Scan History
                  </h3>
                  {tags.length > initialTags.length && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="h-7 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear All
                    </Button>
                  )}
                </div>
                <Badge variant="outline" className="bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary/70 border-primary/20 dark:border-primary/30 px-3 py-1 font-black rounded-lg">
                  {tags.length} TAGS CAPTURED
                </Badge>
              </div>

              <div className="border border-border rounded-xl bg-muted/10 overflow-hidden flex-1 flex flex-col">
                <ScrollArea className="h-[250px] md:h-[350px] w-full p-4">
                  {tags.length === 0 ? (
                    <div className="h-[200px] flex flex-col items-center justify-center opacity-40">
                      <Tag className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">No tags scanned yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {tags.map((tag, idx) => {
                        const isPermanent = initialTagsSet.has(tag);
                        return (
                          <div 
                            key={idx} 
                            className="bg-background border border-border p-2.5 rounded-lg flex items-center justify-between shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 duration-350"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[10px] font-black text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded font-mono">
                                {(idx + 1).toString().padStart(2, "0")}
                              </span>
                              <span className="font-mono text-sm font-bold tracking-wider text-foreground truncate select-all">
                                {tag}
                              </span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleRemoveTag(idx)}
                              disabled={isPermanent}
                              title={isPermanent ? "Saved tags cannot be removed" : "Remove tag"}
                              className={`transition-all shrink-0 p-1.5 rounded-md ${
                                isPermanent 
                                  ? "text-muted-foreground/25 cursor-not-allowed" 
                                  : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-muted/10 p-4 sm:p-6 border-t border-border flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 font-bold text-muted-foreground hover:bg-card hover:text-foreground rounded-xl transition-all"
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={tags.length === 0}
            className="flex-1 h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/10 rounded-xl transition-all"
          >
            Confirm {tags.length} Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
