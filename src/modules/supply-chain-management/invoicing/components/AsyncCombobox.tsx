"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";

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

interface AsyncComboboxProps {
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
    fetchOptions: (search?: string) => Promise<ComboboxOption[]>;
}

export function AsyncCombobox({
    value,
    onValueChange,
    placeholder = "Select option...",
    emptyMessage = "No option found.",
    className,
    disabled,
    fetchOptions
}: AsyncComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState<ComboboxOption[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [debouncedSearch] = useDebounce(search, 300);

    // Initial load and dependency on search query change
    React.useEffect(() => {
        let isMounted = true;
        
        const loadOptions = async () => {
            setLoading(true);
            try {
                const results = await fetchOptions(debouncedSearch);
                if (isMounted) {
                    setOptions(results);
                }
            } catch (error) {
                console.error("Failed to load options", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (open) {
            loadOptions();
        }

        return () => {
            isMounted = false;
        };
    }, [debouncedSearch, fetchOptions, open]);

    // Initial fetch when closed just to populate something or find selected label
    React.useEffect(() => {
        let isMounted = true;
        if (!open && options.length === 0) {
             const loadInitial = async () => {
                 setLoading(true);
                 try {
                     const results = await fetchOptions("");
                     if (isMounted) setOptions(results);
                 } catch (e) {} finally {
                     if (isMounted) setLoading(false);
                 }
             };
             loadInitial();
        }
        return () => { isMounted = false; };
    }, [open, options.length, fetchOptions]);

    const selectedLabel = React.useMemo(() => {
        return options.find((option) => option.value === value)?.label;
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
                        {loading && !selectedLabel ? "Loading..." : (selectedLabel || placeholder)}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput 
                        placeholder={`Search ${placeholder.toLowerCase()}...`} 
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        {loading ? (
                             <div className="py-6 text-center text-sm flex items-center justify-center">
                                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                 Loading...
                             </div>
                        ) : (
                            <>
                                <CommandEmpty>{emptyMessage}</CommandEmpty>
                                <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() => {
                                            onValueChange(option.value === value ? "" : option.value);
                                            setOpen(false);
                                            setSearch(""); // Reset search on select
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option.label}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
