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

import type { BranchRow } from '../../types/stock-transfer.types';

interface BranchComboboxProps {
  branches: BranchRow[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const getBranchLabel = (branch: BranchRow) => {
  return branch.branch_name || `Branch ${branch.id}`;
};

export function BranchCombobox({
  branches,
  value,
  onChange,
  placeholder = 'Select branch…',
  disabled = false,
}: BranchComboboxProps) {
  const selectedBranch = branches.find(b => b.id.toString() === value) || null;
  const initialLabel = selectedBranch ? getBranchLabel(selectedBranch) : '';
  const [search, setSearch] = React.useState(initialLabel);

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
      onValueChange={(val: BranchRow | null) => {
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
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
