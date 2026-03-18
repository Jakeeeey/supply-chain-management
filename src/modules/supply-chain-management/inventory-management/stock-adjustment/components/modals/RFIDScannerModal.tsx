
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Smartphone, ScanLine, Tag, Wifi, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RFIDScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onSave: (tags: string[]) => void;
  initialTags?: string[];
  type: "IN" | "OUT";
}

export function RFIDScannerModal({
  open,
  onOpenChange,
  productName,
  onSave,
  initialTags = [],
  type,
}: RFIDScannerModalProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [currentInput, setCurrentInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTags(initialTags);
      // Focus input when modal opens with a very short delay
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open, initialTags]);

  const handleAddTag = (tag: string) => {
    let rawTag = tag.trim();
    if (!rawTag) return;

    // --- Pattern Detection for Concatenated Scans ---
    // If the string appears to be the same ID repeated (e.g., IDID or IDIDID), extract only one ID.
    // We check for repeats of lengths from 8 up to half the string length.
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

    if (tags.includes(rawTag)) {
      toast.error("RFID tag already added");
      return;
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl overflow-hidden p-0 bg-white">
        <div className="bg-blue-600 p-6 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <ScanLine className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                RFID Batch Scanner
              </DialogTitle>
            </div>
            <p className="text-blue-100 text-sm font-medium">
              Scanning for: <span className="text-white font-bold">{productName}</span>
            </p>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-8" onClick={handleContainerClick}>
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

          {/* Ready to Scan Visual State */}
          <div className={`flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-3xl transition-all duration-300 space-y-4 animate-in fade-in zoom-in duration-500 ${
            isSuccess ? "border-green-500 bg-green-50 shadow-lg shadow-green-100 scale-[1.02]" : "border-blue-100 bg-blue-50/30"
          }`}>
            <div className="relative">
              <div className={`absolute inset-0 rounded-full animate-ping scale-150 duration-2000 ${isSuccess ? "bg-green-400/20" : "bg-blue-400/20"}`} />
              <div className={`relative p-6 rounded-full shadow-xl transition-all duration-300 ${
                isSuccess ? "bg-green-600 shadow-green-200" : "bg-blue-600 shadow-blue-200"
              }`}>
                {isSuccess ? (
                  <Tag className="h-10 w-10 text-white animate-bounce" />
                ) : (
                  <Wifi className="h-10 w-10 text-white animate-pulse" />
                )}
              </div>
            </div>
            <div className="text-center space-y-1">
              <h3 className={`text-xl font-black tracking-tight transition-colors duration-300 ${
                isSuccess ? "text-green-900" : "text-blue-900"
              }`}>
                {isSuccess ? "Captured!" : "Ready to Scan"}
              </h3>
              <p className={`text-sm font-bold transition-colors duration-300 ${
                isSuccess ? "text-green-600" : "text-blue-600/70"
              }`}>
                {isSuccess ? `Tag ${lastScanned?.substring(0, 8)}... added` : "Position your physical RFID scanner and start scanning"}
              </p>
            </div>
            <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300 shadow-sm ${
              isSuccess ? "bg-green-600 border-green-600" : "bg-white border-blue-100"
            }`}>
                {isSuccess ? (
                  <ScanLine className="h-4 w-4 text-white animate-pulse" />
                ) : (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                )}
                <span className={`text-xs font-black uppercase tracking-widest ${
                  isSuccess ? "text-white" : "text-blue-700"
                }`}>
                  {isSuccess ? "Processing Scan..." : "Waiting for RFID scan..."}
                </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                Scan History
              </h3>
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 font-black rounded-lg">
                {tags.length} TAGS CAPTURED
              </Badge>
            </div>
            <div className="border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                <ScrollArea className="h-[250px] w-full p-4">
                  {tags.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 py-12">
                      <Tag className="h-10 w-10 mb-2" />
                      <p className="text-sm font-medium">No tags scanned yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, idx) => {
                        const isPermanent = initialTagsSet.has(tag);
                        return (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="bg-white border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200 max-w-[calc(100%-4px)] overflow-hidden shrink-0"
                          >
                            <span className="font-mono text-xs leading-tight truncate min-w-0 flex-1">{tag}</span>
                            <button 
                              onClick={() => handleRemoveTag(idx)}
                              disabled={isPermanent}
                              title={isPermanent ? "Saved tags cannot be removed" : "Remove tag"}
                              className={`transition-colors shrink-0 p-0.5 ${
                                isPermanent ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-red-500"
                              }`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 font-bold text-slate-600 hover:bg-white hover:text-slate-900 rounded-xl"
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={tags.length === 0}
            className="flex-1 h-11 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 rounded-xl"
          >
            Confirm {tags.length} Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
