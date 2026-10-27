"use client";

import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COAOption } from "../types";

interface CoaSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coaList: COAOption[];
  alreadySelectedCoaIds: Set<number>;
  onAddSelected: (selectedCoas: COAOption[]) => void;
}

export function CoaSelectModal({
  open,
  onOpenChange,
  coaList,
  alreadySelectedCoaIds,
  onAddSelected,
}: CoaSelectModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Filter available accounts that are NOT yet added in the table
  const unselectedAccounts = useMemo(() => {
    return coaList.filter((c) => !alreadySelectedCoaIds.has(c.coa_id));
  }, [coaList, alreadySelectedCoaIds]);

  // Apply search query
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unselectedAccounts;
    return unselectedAccounts.filter(
      (c) =>
        c.account_title.toLowerCase().includes(q) ||
        (c.gl_code && c.gl_code.toLowerCase().includes(q))
    );
  }, [unselectedAccounts, search]);

  const handleToggleSelect = (coaId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(coaId)) {
        next.delete(coaId);
      } else {
        next.add(coaId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size >= filteredAccounts.length && filteredAccounts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAccounts.map((c) => c.coa_id)));
    }
  };

  const handleConfirm = () => {
    const toAdd = coaList.filter((c) => selectedIds.has(c.coa_id));
    onAddSelected(toAdd);
    setSelectedIds(new Set());
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Chart of Accounts</DialogTitle>
          <DialogDescription>
            Choose accounts to allocate budget for this cluster.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by GL Code or Account Title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Accounts List Table */}
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-md mt-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[45px]">
                  <Checkbox
                    checked={
                      filteredAccounts.length > 0 &&
                      selectedIds.size >= filteredAccounts.length
                    }
                    onCheckedChange={handleSelectAllFiltered}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-[120px]">GL Code</TableHead>
                <TableHead>Account Title</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {unselectedAccounts.length === 0
                      ? "All available accounts have already been added."
                      : "No matching accounts found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => {
                  const isChecked = selectedIds.has(account.coa_id);
                  return (
                    <TableRow
                      key={account.coa_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleToggleSelect(account.coa_id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() =>
                            handleToggleSelect(account.coa_id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {account.gl_code || "-"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {account.account_title}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">
            {selectedIds.size} account(s) selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleConfirm}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Add Selected ({selectedIds.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
