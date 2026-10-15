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

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  searchPlaceholder,
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
            "w-full justify-between h-9 px-3 text-sm font-normal bg-background hover:bg-accent/40",
            !value && "text-muted-foreground",
            triggerClassName
          )}
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[--radix-popover-trigger-width] min-w-[240px] p-0 shadow-lg rounded-md overflow-hidden bg-popover z-[100]",
          className
        )}
        align="start"
        sideOffset={4}
      >
        <Command className="w-full">
          <CommandInput
            placeholder={searchPlaceholder || `Search ${placeholder.toLowerCase()}...`}
            className="h-9 text-xs"
          />
          <CommandList
            className="max-h-[220px] overflow-y-auto p-1"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No results found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    className="text-xs cursor-pointer py-1.5 px-2 rounded-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5 text-primary",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
