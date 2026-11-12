"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContentInDialog,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface VehicleSearchableSelectOption {
  id: number | string;
  name: string;
}

interface VehicleSearchableSelectProps {
  options: VehicleSearchableSelectOption[];
  value: number | string | null | undefined;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function VehicleSearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  hasError = false,
}: VehicleSearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(() => {
    if (value === null || value === undefined || value === "") return null;
    return options.find((opt) => String(opt.id) === String(value)) || null;
  }, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-9 px-3 text-left font-normal text-xs md:text-sm shadow-xs",
            !selectedOption && "text-muted-foreground",
            hasError && "ring-1 ring-destructive border-destructive",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContentInDialog
        className="w-[--radix-popover-trigger-width] p-0 z-[9999]"
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
            className="max-h-60 overflow-y-auto overscroll-contain p-1 touch-auto pointer-events-auto"
            onWheel={(e) => {
              // Stop wheel event from propagating to the dialog or body
              e.stopPropagation();
            }}
          >
            <CommandEmpty className="py-2.5 text-center text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selectedOption
                  ? String(selectedOption.id) === String(opt.id)
                  : false;
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.name}
                    onSelect={() => {
                      onValueChange(Number(opt.id));
                      setOpen(false);
                    }}
                    className="text-xs flex items-center justify-between cursor-pointer py-1.5 px-2"
                  >
                    <span className="truncate">{opt.name}</span>
                    <Check
                      className={cn(
                        "ml-2 h-3.5 w-3.5 shrink-0 text-primary",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContentInDialog>
    </Popover>
  );
}
