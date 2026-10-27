"use client";

import { useState, useMemo } from "react";
import { useWatch, UseFormReturn } from "react-hook-form";
import {
  Plus,
  Trash2,
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClusterFormValues, COAOption } from "../types";
import { CoaSelectModal } from "./CoaSelectModal";

interface CoaBudgetStepProps {
  form: UseFormReturn<ClusterFormValues>;
  coaList: COAOption[];
  fields: Record<"id", string>[];
  append: (value: { coa_id: number; budget: number }) => void;
  remove: (index: number) => void;
}

const PAGE_SIZE = 6;

export function CoaBudgetStep({
  form,
  coaList,
  fields,
  append,
  remove,
}: CoaBudgetStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const watchedBudgets =
    useWatch({
      control: form.control,
      name: "coa_budgets",
    }) || [];

  const coaMap = useMemo(() => {
    const map = new Map<number, COAOption>();
    for (const c of coaList) {
      map.set(c.coa_id, c);
    }
    return map;
  }, [coaList]);

  // Set of already selected COA IDs
  const alreadySelectedCoaIds = useMemo(() => {
    return new Set(
      watchedBudgets
        .map((b) => Number(b?.coa_id))
        .filter((id) => !isNaN(id) && id > 0)
    );
  }, [watchedBudgets]);

  // Items mapped with original field index for form binding
  const itemsWithIndex = useMemo(() => {
    return fields.map((field, index) => {
      const budgetItem = watchedBudgets[index];
      const coaId = Number(budgetItem?.coa_id);
      const coa = coaMap.get(coaId);
      return {
        fieldId: field.id,
        originalIndex: index,
        coaId,
        glCode: coa?.gl_code || "-",
        title: coa?.account_title || `Account #${coaId}`,
      };
    });
  }, [fields, watchedBudgets, coaMap]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemsWithIndex;
    return itemsWithIndex.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.glCode.toLowerCase().includes(q)
    );
  }, [itemsWithIndex, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  // Auto-correct page if current page exceeds total pages due to deletions
  if (page > totalPages) {
    setPage(totalPages);
  }

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const totalAllocated = watchedBudgets.reduce(
    (sum, item) => sum + (Number(item?.budget) || 0),
    0
  );

  const handleAddBatch = (selectedCoas: COAOption[]) => {
    selectedCoas.forEach((coa) => {
      append({ coa_id: coa.coa_id, budget: 0 });
    });
    // Jump to the last page so user can immediately see added items
    const newTotal = fields.length + selectedCoas.length;
    setPage(Math.ceil(newTotal / PAGE_SIZE));
  };

  const handleRemoveItem = (fieldId: string) => {
    // Find the live current index in fields array to prevent index shifting bugs during search
    const liveIndex = fields.findIndex((f) => f.id === fieldId);
    if (liveIndex !== -1) {
      remove(liveIndex);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Title and Add Account Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-primary" />
            Chart of Accounts & Budget Allocation
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select accounts and specify their allocated budget amount.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Select Accounts
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground space-y-3">
          <Wallet className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              No accounts selected yet
            </p>
            <p className="text-xs">
              Click &quot;Select Accounts&quot; above to batch select Chart of
              Accounts and allocate their budgets.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Select Accounts
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table Search Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter added accounts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-8 text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Accounts:{" "}
              <span className="font-medium text-foreground">
                {fields.length}
              </span>
            </div>
          </div>

          {/* Accounts Budget Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">GL Code</TableHead>
                  <TableHead>Account Title</TableHead>
                  <TableHead className="w-[190px] text-right">
                    Budget (PHP) <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[50px] text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground text-xs"
                    >
                      No accounts match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow key={item.fieldId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.glCode}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-right">
                        <FormField<ClusterFormValues>
                          control={form.control}
                          name={`coa_budgets.${item.originalIndex}.budget`}
                          render={({ field }) => (
                            <FormItem className="space-y-0 inline-block w-full">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="0.00"
                                  className="h-8 text-right font-medium tabular-nums text-xs"
                                  value={field.value === 0 ? "" : (field.value ?? "")}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : e.target.valueAsNumber;
                                    field.onChange(isNaN(val) ? 0 : val);
                                    form.clearErrors(
                                      `coa_budgets.${item.originalIndex}.budget`
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.fieldId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of{" "}
                {filteredItems.length} accounts
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-medium text-foreground px-1">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Total Summary Banner */}
          <div className="rounded-lg bg-muted/60 p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              Total Allocated Budget:
            </span>
            <span className="font-semibold tabular-nums text-foreground text-base">
              PHP{" "}
              {totalAllocated.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Multi-select Picker Dialog */}
      <CoaSelectModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        coaList={coaList}
        alreadySelectedCoaIds={alreadySelectedCoaIds}
        onAddSelected={handleAddBatch}
      />
    </div>
  );
}
