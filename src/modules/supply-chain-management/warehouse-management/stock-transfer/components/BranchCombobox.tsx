'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import type { Branch } from '../types';
import { getBranchLabel } from '../hooks/useStockTransfer';

interface BranchComboboxProps {
  branches: Branch[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BranchCombobox({
  branches,
  value,
  onChange,
  placeholder = 'Select branch…',
  disabled = false,
}: BranchComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = branches.find((b) => b.id.toString() === value);
  const displayLabel = selected ? getBranchLabel(selected) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between text-sm bg-background border-border font-normal"
        >
          <span className={cn('truncate', !displayLabel && 'text-muted-foreground')}>
            {displayLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search branch…" className="h-9" />
          <CommandList>
            <CommandEmpty>No branch found.</CommandEmpty>
            <CommandGroup>
              {branches.map((b) => {
                const label = getBranchLabel(b);
                const id = b.id.toString();
                return (
                  <CommandItem
                    key={id}
                    value={label}          /* searched by label text */
                    onSelect={() => {
                      onChange(id === value ? '' : id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {label}
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
