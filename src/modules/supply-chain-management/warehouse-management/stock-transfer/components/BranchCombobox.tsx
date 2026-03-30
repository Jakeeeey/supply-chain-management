'use client';

import * as React from 'react';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';

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
  // Find the current selected branch object
  const selectedBranch = branches.find(b => b.id.toString() === value) || null;
  const initialLabel = selectedBranch ? getBranchLabel(selectedBranch) : '';
  const [search, setSearch] = React.useState(initialLabel);

  // Keep search in sync with value when not interacting
  React.useEffect(() => {
    if (selectedBranch) {
      setSearch(getBranchLabel(selectedBranch));
    } else {
      setSearch('');
    }
  }, [value, branches, selectedBranch]);

  return (
    <Combobox
      value={selectedBranch}
      onValueChange={(val: Branch | null) => {
        const newId = val ? val.id.toString() : '';
        onChange(newId);
        if (val) setSearch(getBranchLabel(val));
      }}
    >
      <ComboboxInput
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={(e) => {
          (e.target as HTMLInputElement).select();
        }}
        disabled={disabled}
        showTrigger
      />
      <ComboboxContent>
        <ComboboxList>
          {branches.length === 0 && <ComboboxEmpty>No branches available.</ComboboxEmpty>}
          {branches
            .filter(b => {
              const label = getBranchLabel(b);
              // If search matches the current selection exactly, show all (to avoid being stuck with 1 result on click)
              if (selectedBranch && search.toLowerCase() === getBranchLabel(selectedBranch).toLowerCase()) {
                return true;
              }
              return label.toLowerCase().includes(search.toLowerCase());
            })
            .map((b) => (
              <ComboboxItem key={b.id} value={b}>
                {getBranchLabel(b)}
              </ComboboxItem>
            ))}
          {branches.length > 0 && branches.filter(b => getBranchLabel(b).toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <ComboboxEmpty>No matches found.</ComboboxEmpty>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

