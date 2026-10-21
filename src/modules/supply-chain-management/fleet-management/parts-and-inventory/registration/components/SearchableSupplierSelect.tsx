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
import type { Supplier } from "../types";

export interface SearchableSupplierSelectProps {
  suppliers: Supplier[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSupplierSelect({
  suppliers,
  value,
  onValueChange,
  placeholder = "Select supplier...",
  disabled = false,
  className,
}: SearchableSupplierSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedSupplier = React.useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(value));
  }, [suppliers, value]);

  const selectedLabel = React.useMemo(() => {
    if (!selectedSupplier) return "";
    return selectedSupplier.supplier_shortcut
      ? `${selectedSupplier.supplier_name} (${selectedSupplier.supplier_shortcut})`
      : selectedSupplier.supplier_name;
  }, [selectedSupplier]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between overflow-hidden text-left font-normal bg-background h-9 text-xs",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0 shadow-lg rounded-md border bg-popover text-popover-foreground pointer-events-auto"
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
            placeholder="Search supplier by name or shortcut..."
            className="h-9 text-xs"
          />
          <CommandList
            className="max-h-[220px] overflow-y-auto p-1"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No suppliers found.
            </CommandEmpty>
            <CommandGroup>
              {suppliers.map((s) => {
                const searchStr = `${s.supplier_name} ${s.supplier_shortcut || ""} ${s.contact_person || ""}`;
                const label = s.supplier_shortcut
                  ? `${s.supplier_name} (${s.supplier_shortcut})`
                  : s.supplier_name;
                const isSelected = String(value) === String(s.id);

                return (
                  <CommandItem
                    key={s.id}
                    value={searchStr}
                    onSelect={() => {
                      onValueChange(String(s.id));
                      setOpen(false);
                    }}
                    className="rounded px-2.5 py-1.5 text-xs cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-medium">{label}</span>
                      {s.contact_person && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          Contact: {s.contact_person}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 text-primary shrink-0",
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
