"use client";

import { useEffect, useState } from "react";
import { Branch } from "../types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchSelectorProps {
  onSelect: (branchId: number | null) => void;
  disabled?: boolean;
}

export function BranchSelector({ onSelect, disabled }: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch("/api/scm/inventory-management/rfid-tagging/branches");
        if (res.ok) {
          const data = await res.json();
          setBranches(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, []);

  const handleSelect = (branchId: number) => {
    setValue(branchId === value ? null : branchId);
    onSelect(branchId === value ? null : branchId);
    setOpen(false);
  };

  const selectedBranch = branches.find((b) => {
    const id = b.id ?? b.branch_id;
    return id === value;
  });

  const selectedName = selectedBranch?.branch_name ?? "Select a branch...";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="branch-select">Select Branch</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading || disabled}
            className="w-[300px] justify-between font-normal overflow-hidden"
          >
            <span className="truncate">
              {loading ? "Loading branches..." : selectedName}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command
            filter={(val, search) => {
              const branch = branches.find((b) => {
                const id = b.id ?? b.branch_id;
                return id?.toString() === val;
              });
              if (!branch) return 0;
              const term = search.toLowerCase();
              const name = (branch.branch_name ?? "").toLowerCase();
              const code = (branch.branch_code ?? "").toLowerCase();
              if (name.includes(term) || code.includes(term)) {
                return 1;
              }
              return 0;
            }}
          >
            <CommandInput placeholder="Search branch name or code..." />
            <CommandList>
              <CommandEmpty>No branch found.</CommandEmpty>
              <CommandGroup>
                {branches.map((b, index) => {
                  const id = b.id ?? b.branch_id ?? index;
                  const name = b.branch_name ?? "Unknown Branch";
                  return (
                    <CommandItem
                      key={id}
                      value={id.toString()}
                      onSelect={(currentValue) => {
                        handleSelect(Number(currentValue));
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
