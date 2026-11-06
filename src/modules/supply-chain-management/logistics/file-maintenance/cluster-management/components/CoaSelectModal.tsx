"use client";

import { useState, useMemo } from "react";
import { Search, Check, CheckSquare, Square, X } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
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

  const handleSelectAll = () => {
    const allFilteredIds = filteredAccounts.map((c) => c.coa_id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allFilteredIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleUnselectAll = () => {
    setSelectedIds(new Set());
  };

  const isAllFilteredSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((c) => selectedIds.has(c.coa_id));

  const handleConfirm = () => {
    const toAdd = coaList.filter((c) => selectedIds.has(c.coa_id));
    onAddSelected(toAdd);
    setSelectedIds(new Set());
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] md:max-w-[750px] w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Chart of Accounts</DialogTitle>
          <DialogDescription>
            Choose accounts to allocate budget for this cluster.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar & Quick Action Bar */}
        <div className="space-y-2.5 mt-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by GL Code or Account Title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
                className="absolute right-1 top-1 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Quick Select / Unselect Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1.5 bg-muted/40 rounded-md border text-xs">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 bg-background"
                disabled={filteredAccounts.length === 0 || isAllFilteredSelected}
                onClick={handleSelectAll}
              >
                <CheckSquare className="mr-1 h-3.5 w-3.5 text-primary" />
                Select All {filteredAccounts.length > 0 ? `(${filteredAccounts.length})` : ""}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 bg-background"
                disabled={selectedIds.size === 0}
                onClick={handleUnselectAll}
              >
                <Square className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                Unselect All
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Selected:</span>
              <Badge variant={selectedIds.size > 0 ? "default" : "secondary"} className="text-xs font-medium">
                {selectedIds.size} of {unselectedAccounts.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* Accounts List Table */}
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-md mt-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <Checkbox
                    checked={isAllFilteredSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSelectAll();
                      } else {
                        handleUnselectAll();
                      }
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-[140px] whitespace-nowrap">GL Code</TableHead>
                <TableHead className="min-w-[260px]">Account Title</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-32 text-center text-muted-foreground text-sm"
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
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleToggleSelect(account.coa_id)}
                    >
                      <TableCell
                        className="text-center w-[50px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() =>
                            handleToggleSelect(account.coa_id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground font-medium">
                        {account.gl_code || "-"}
                      </TableCell>
                      <TableCell className="font-medium text-sm leading-snug">
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
        <DialogFooter className="flex flex-row items-center justify-between border-t pt-3 mt-1">
          <div className="text-xs text-muted-foreground">
            {selectedIds.size} account(s) ready to add
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
