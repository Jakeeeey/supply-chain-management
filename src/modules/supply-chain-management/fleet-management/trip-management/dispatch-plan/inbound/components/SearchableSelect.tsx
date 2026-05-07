"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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

export interface SearchableSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    disabled = false,
    className,
    triggerClassName,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedLabel = React.useMemo(() => {
        return options.find((opt) => opt.value === value)?.label;
    }, [options, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between h-12 rounded-xl border-muted-foreground/20 bg-muted/5 font-bold transition-all hover:bg-muted/10",
                        !value && "text-muted-foreground/60",
                        triggerClassName
                    )}
                    disabled={disabled}
                >
                    <span className="truncate">{selectedLabel || placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-background" 
                align="start"
                sideOffset={4}
            >
                <Command className="border-none" loop>
                    <CommandInput 
                        placeholder={`Search ${placeholder.toLowerCase()}...`} 
                        className="border-none focus:ring-0 h-11 font-bold text-sm bg-transparent"
                    />
                    <CommandList 
                        className="max-h-[300px] overflow-y-auto p-1"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <CommandEmpty className="py-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground/40">
                            No results found.
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={opt.label}
                                    onSelect={() => {
                                        onValueChange(opt.value);
                                        setOpen(false);
                                    }}
                                    className="rounded-lg py-2.5 px-3 font-semibold text-sm cursor-pointer aria-selected:bg-emerald-500/10 aria-selected:text-emerald-600 transition-colors"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-emerald-500",
                                            value === opt.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
