//src/modules/supply-chain-management/traceability-compliance/product-tracing/components/SearchableSelect.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Option = {
    value: number;
    label: string;
    description?: string;
};

type Props = {
    label: string;
    placeholder: string;
    emptyText: string;
    value: number | null;
    options: Option[];
    disabled?: boolean;
    searchPlaceholder?: string;
    onChange: (value: number | null) => void;
    className?: string;
};

export function SearchableSelect({
    label,
    placeholder,
    emptyText,
    value,
    options,
    disabled,
    searchPlaceholder = "Search...",
    onChange,
    className
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

    const selected = React.useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    const filteredOptions = React.useMemo(() => {
        if (!searchTerm) return options;
        const lowSearch = searchTerm.toLowerCase();
        return options.filter(opt => 
            (opt.label || "").toLowerCase().includes(lowSearch) || 
            (opt.description || "").toLowerCase().includes(lowSearch)
        );
    }, [options, searchTerm]);

    // Reset search when opening
    React.useEffect(() => {
        if (open) setSearchTerm("");
    }, [open]);

    return (
        <div className={cn("space-y-2", className)}>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">{label}</Label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className="w-full justify-between cursor-pointer font-normal h-10 rounded-xl px-4 border-muted-foreground/20"
                    >
                        <span className="truncate">
                            {selected ? selected.label : placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0 shadow-2xl rounded-2xl border border-muted-foreground/10 overflow-hidden bg-background"
                >
                    <div className="flex items-center gap-2 border-b px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">
                        <Search className="h-3.5 w-3.5" />
                        Search {label.toLowerCase()}
                    </div>

                    <div className="p-2">
                        <Input 
                            placeholder={searchPlaceholder} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 rounded-lg border-muted-foreground/10 focus-visible:ring-primary/20"
                            autoFocus
                        />
                    </div>

                    <ScrollArea className="h-[300px]">
                        <div className="p-1 space-y-0.5">
                            {filteredOptions.length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">
                                    {emptyText}
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-left transition-colors",
                                            value === option.value 
                                                ? "bg-primary/10 text-primary" 
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        <div className="flex items-center w-full">
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0",
                                                    value === option.value
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                            <span className="truncate font-semibold text-sm">{option.label}</span>
                                        </div>
                                        {option.description && (
                                            <span className="text-[10px] text-muted-foreground ml-6 font-medium uppercase tracking-tight opacity-70">
                                                {option.description}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
    );
}
