"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, ScanLine, Tag, Wifi, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface RfidScannerProps {
  onTagsChange?: (tags: string[]) => void;
  onTagScanned?: (tag: string) => Promise<void>;
  onTagRemoved?: (tag: string) => Promise<void>;
  disabled?: boolean;
  initialTags?: string[];
}

export function RfidScanner({ onTagsChange, onTagScanned, onTagRemoved, disabled, initialTags = [] }: RfidScannerProps) {
  const [currentInput, setCurrentInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialTags);
  const [checking, setChecking] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  
  useEffect(() => {
    if (initialTags.length > 0 && tags.length === 0) {
      setTags(initialTags);
    }
  }, [initialTags, tags.length]);

  // UI states for animations
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus trap
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleContainerClick = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const tagsRef = useRef<string[]>([]);

  // Keep ref in sync with tags (especially for clears/removes)
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isRemoving) return;
    
    if (e.key === "Enter") {
      e.preventDefault();
      
      let rawTag = currentInput.trim().toUpperCase();
      setCurrentInput(""); // immediately clear to prevent rapid-fire artifacts
      
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

      // --- RFID Validation: Allow alphanumeric characters of length 16 to 32 ---
      if (rawTag.length < 16 || rawTag.length > 32 || !/^[A-Z0-9]+$/.test(rawTag)) {
        toast.error("Invalid RFID Tag", {
          description: `RFID tag must be between 16 and 32 alphanumeric characters. (Scanned length: ${rawTag.length})`,
        });
        return;
      }

      // Synchronous duplicate check using Ref
      if (tagsRef.current.includes(rawTag)) {
        toast.error("RFID already scanned in this session");
        return;
      }

      // Optimistically add to Ref to prevent immediate subsequent duplicates while checking
      tagsRef.current = [...tagsRef.current, rawTag];

      setChecking(true);
      try {
        const res = await fetch(`/api/scm/inventory-management/rfid-tagging/check-rfid?rfid=${encodeURIComponent(rawTag)}`);
        const data = await res.json();

        if (!res.ok || data.ok === false) {
          // Remove from ref since the check failed
          tagsRef.current = tagsRef.current.filter(t => t !== rawTag);
          toast.error("Process Failed", {
            description: data.message || "Failed to check RFID availability.",
            duration: 5000,
          });
          return;
        }

        if (data.exists) {
          // Remove from ref since it was invalid
          tagsRef.current = tagsRef.current.filter(t => t !== rawTag);
          toast.error("Process Blocked", {
            description: data.message || `RFID tag ${rawTag} is already in use.`,
            duration: 5000,
          });
        } else {
          // Auto-save logic if provided
          if (onTagScanned) {
            try {
              await onTagScanned(rawTag);
            } catch (saveErr) {
              tagsRef.current = tagsRef.current.filter(t => t !== rawTag);
              toast.error("Failed to Save Tag", {
                description: saveErr instanceof Error ? saveErr.message : "Error saving to database.",
                duration: 5000,
              });
              return; // Do not add to UI state
            }
          }

          setTags((prev) => {
            if (prev.includes(rawTag)) return prev;
            const newTags = [...prev, rawTag];
            setTimeout(() => onTagsChange?.(newTags), 0);
            return newTags;
          });
          setLastScanned(rawTag);
          setIsSuccess(true);
          setTimeout(() => setIsSuccess(false), 800);
        }
      } catch {
        // Remove from ref since we failed to check
        tagsRef.current = tagsRef.current.filter(t => t !== rawTag);
        toast.error("Failed to check RFID availability");
      } finally {
        setChecking(false);
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (disabled || isRemoving) return;
    
    setIsRemoving(tagToRemove);
    try {
      if (onTagRemoved) {
        await onTagRemoved(tagToRemove);
      }
      const newTags = tags.filter(t => t !== tagToRemove);
      setTags(newTags);
      onTagsChange?.(newTags);
    } catch (err) {
      toast.error("Failed to remove tag", {
        description: err instanceof Error ? err.message : "Error removing from database."
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const handleClearAll = async () => {
    if (disabled || isRemoving) return;
    
    // If auto-save is enabled, clearing all might be dangerous or require a batch delete.
    // We can block it or let the parent handle it if they want.
    if (onTagRemoved) {
      toast.info("Please remove tags individually when auto-save is active.");
      return;
    }
    
    setTags([]);
    onTagsChange?.([]);
    toast.success("All scanned tags cleared");
  };

  return (
    <div 
      className={`p-4 flex-1 overflow-y-auto min-h-0 ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-text'}`} 
      onClick={handleContainerClick}
    >
      {/* Hidden Input for Scanner Events */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        value={currentInput}
        onChange={(e) => setCurrentInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left Column - Visual state */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <div className={`flex flex-col items-center justify-center py-6 sm:py-10 px-4 border-2 border-dashed rounded-3xl transition-all duration-300 space-y-4 shadow-sm h-full ${
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
                {checking ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : isSuccess ? (
                  <ScanLine className="h-4 w-4 text-white animate-pulse" />
                ) : (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  isSuccess ? "text-white" : "text-primary"
                }`}>
                  {checking ? "Checking Database..." : isSuccess ? "Processing Scan..." : "Waiting for RFID scan..."}
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
              {tags.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
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
            <ScrollArea className="h-[250px] md:h-[300px] w-full p-4">
              {tags.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center opacity-40">
                  <Tag className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No tags scanned yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tags.map((tag, idx) => (
                    <div 
                      key={idx} 
                      className="bg-background border border-border p-2.5 rounded-lg flex items-center justify-between shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
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
                        onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                        className="transition-all shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
