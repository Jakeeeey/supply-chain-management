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

export interface ComboboxOption {
  value: string;
  label: string;
}

interface FleetDashboardComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (val: string) => void;
  prefix?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  popoverWidth?: string;
}

export function FleetDashboardCombobox({
  options,
  value,
  onValueChange,
  prefix,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className,
  popoverWidth = "w-[240px]",
}: FleetDashboardComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value.toLowerCase() === value.toLowerCase());
  }, [options, value]);

  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between text-xs font-normal bg-background px-3 truncate",
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            {prefix && (
              <span className="text-muted-foreground font-medium shrink-0">
                {prefix}
              </span>
            )}
            <span className="truncate">{displayLabel}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 shadow-md rounded-md border bg-popover text-popover-foreground pointer-events-auto", popoverWidth)}
        align="start"
        sideOffset={4}
      >
        <Command
          filter={(itemValue, search) => {
            if (itemValue.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9 text-xs"
          />
          <CommandList
            className="max-h-[220px] overflow-y-auto p-1"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              No results found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = opt.value.toLowerCase() === value.toLowerCase();
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    className="rounded px-2.5 py-1.5 text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate flex-1">{opt.label}</span>
                    <Check
                      className={cn(
                        "ml-2 h-3.5 w-3.5 text-primary shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
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

