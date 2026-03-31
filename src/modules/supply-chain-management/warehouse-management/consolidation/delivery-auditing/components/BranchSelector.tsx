"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown, Building2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Branch {
    id: number;
    branchName: string;
    branchCode: string;
    city?: string;
}

interface BranchSelectorProps {
    branches: Branch[];
    selectedBranchId: number | undefined;
    onBranchChange: (id: number) => void;
    isLoading?: boolean;
}

export function BranchSelector({
                                   branches,
                                   selectedBranchId,
                                   onBranchChange,
                                   isLoading
                               }: BranchSelectorProps) {
    const [open, setOpen] = useState(false);

    const selectedBranch = branches.find((b) => b.id === selectedBranchId);

    return (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={isLoading || branches.length === 0}
                        className="w-[260px] h-11 justify-between bg-card/40 border-border/40 backdrop-blur-md rounded-xl shadow-inner hover:bg-card/60 px-3 group"
                    >
                        <div className="flex items-center gap-3 truncate">
                            <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex flex-col items-start truncate">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1">
                                    Branch Selection
                                </span>
                                <span className="font-bold text-sm truncate">
                                    {selectedBranch ? selectedBranch.branchName : "Select Branch..."}
                                </span>
                            </div>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[260px] p-0 bg-card/95 backdrop-blur-2xl border-border/40 rounded-2xl shadow-2xl">
                    <Command
                        className="bg-transparent rounded-2xl overflow-hidden"
                        // 🚀 THE FIX: Stops Radix from eating the mouse wheel events!
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <CommandInput
                            placeholder="Search facility..."
                            className="h-11 placeholder:text-[10px] placeholder:uppercase placeholder:font-bold placeholder:tracking-widest"
                        />

                        <CommandList className="max-h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                            <CommandEmpty className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                No facility found.
                            </CommandEmpty>
                            <CommandGroup>
                                {branches.map((branch) => (
                                    <CommandItem
                                        key={branch.id}
                                        value={`${branch.branchName} ${branch.branchCode}`}
                                        onSelect={() => {
                                            onBranchChange(branch.id);
                                            setOpen(false);
                                        }}
                                        className="rounded-lg py-3 px-4 mb-1 last:mb-0 cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black uppercase tracking-tighter">
                                                    {branch.branchName}
                                                </span>
                                                <Badge variant="outline" className="text-[8px] h-4 px-1 border-primary/20 text-primary font-mono uppercase">
                                                    {branch.branchCode}
                                                </Badge>
                                            </div>
                                            {branch.city && (
                                                <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold uppercase opacity-60">
                                                    <MapPin className="w-2 h-2" />
                                                    {branch.city}
                                                </div>
                                            )}
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4 text-primary",
                                                selectedBranchId === branch.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}