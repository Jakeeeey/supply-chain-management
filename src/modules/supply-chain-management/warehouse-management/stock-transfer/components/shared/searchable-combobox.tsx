"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";

export type SearchableComboboxOption = {
  value: string;
  label: string;
};

interface SearchableComboboxProps {
  options: SearchableComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Search...",
  emptyMessage = "No results found.",
  className,
}: SearchableComboboxProps) {
  // Separate query state for client-side filtering.
  const [filterQuery, setFilterQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Label of the currently selected option (shown as placeholder when closed)
  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value]
  );

  // Reset filter when dropdown closes so next open shows full list
  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) setFilterQuery("");
  }, []);

  // Client-side filtered options
  const filteredOptions = React.useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, filterQuery]);

  return (
    // @base-ui Combobox — Positioner portal, no Radix FocusScope, no infinite loop
    <Combobox
      value={value}
      onValueChange={(val) => {
        const next = val === value ? "" : (val ?? "");
        onValueChange(next);
      }}
      onOpenChange={handleOpenChange}
    >
      <div className={cn("relative", className)}>
        <ComboboxInput
          placeholder={placeholder}
          showTrigger
          showClear={!!value}
          value={isOpen ? filterQuery : selectedLabel}
          // Use native onChange to update our state while overriding standard Base UI input value
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFilterQuery(e.target.value)
          }
          className={cn(
            "h-9 w-full",
            value ? "text-foreground" : "text-muted-foreground"
          )}
        />
      </div>

      <ComboboxContent className="z-50 min-w-[180px]">
        <ComboboxList>
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <ComboboxItem
                key={option.value}
                value={option.value}
                className="flex items-center gap-2"
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </ComboboxItem>
            ))
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}