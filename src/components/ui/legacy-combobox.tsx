"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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
import { ComboboxOption } from "@/components/ui/combobox";

interface LegacyComboboxProps {
    options: ComboboxOption[] | any[];
    value?: string;
    onValueChange: any; // Accept Dispatch<SetStateAction<string>> or (val: string|null)=>void
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
    renderItem?: (option: any) => React.ReactNode;
}

export function LegacyCombobox({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    emptyMessage = "No option found.",
    className,
    disabled,
    renderItem
}: LegacyComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const selectedOption = React.useMemo(() => {
        return options.find((option) => String(option.value) === String(value));
    }, [options, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", className)}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput 
                        placeholder={`Search ${placeholder.toLowerCase()}...`} 
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                        {options.map((option) => (
                            <CommandItem
                                key={String(option.value)}
                                value={option.label || String(option.value)}
                                onSelect={() => {
                                    onValueChange(String(option.value) === String(value) ? "" : String(option.value));
                                    setOpen(false);
                                    setSearch(""); 
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        String(value) === String(option.value) ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {renderItem ? renderItem(option) : option.label}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
