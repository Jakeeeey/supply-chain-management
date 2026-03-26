//src/modules/supply-chain-management/physical-inventory-list/PhysicalInventoryListModule.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";

import type {
    BranchRow,
    SupplierRow,
} from "@/modules/supply-chain-management/inventory-management/physical-inventory-management";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ClipboardList, Loader2, Plus, RefreshCcw } from "lucide-react";

import { PhysicalInventoryListTable } from "./components/PhysicalInventoryListTable";
import { fetchPhysicalInventoryListRows } from "./providers/fetchProvider";
import type {
    PhysicalInventoryListFilters,
    PhysicalInventoryListRow,
} from "./types";

type Props = {
    selectedHeaderId?: number | null;
    onOpenRecord?: (row: PhysicalInventoryListRow) => void;
    onCreateNew?: () => void;
    hideCreateButton?: boolean;
};

const PAGE_SIZE = 6;

// ─── Searchable Combobox ──────────────────────────────────────────────────────
type ComboboxOption = { value: string; label: string };

function SearchableCombobox({
    options,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyText,
}: {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    searchPlaceholder: string;
    emptyText: string;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span className="truncate">{selectedLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === option.value ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// ─── Module ───────────────────────────────────────────────────────────────────
export function PhysicalInventoryListModule(props: Props) {
    const {
        selectedHeaderId = null,
        onOpenRecord,
        onCreateNew,
        hideCreateButton = false,
    } = props;

    const [isLoading, setIsLoading] = React.useState(true);
    const [rows, setRows] = React.useState<PhysicalInventoryListRow[]>([]);
    const [branches, setBranches] = React.useState<BranchRow[]>([]);
    const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
    const [page, setPage] = React.useState(1);

    const [filters, setFilters] = React.useState<PhysicalInventoryListFilters>({
        search: "",
        branch_id: null,
        supplier_id: null,
        status: "All",
        stock_type: "All",
    });

    const loadRows = React.useCallback(async () => {
        try {
            setIsLoading(true);

            const result = await fetchPhysicalInventoryListRows();
            setRows(result.rows);
            setBranches(result.branches);
            setSuppliers(result.suppliers);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to load PI list.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadRows();
    }, [loadRows]);

    const filteredRows = React.useMemo(() => {
        const search = filters.search.trim().toLowerCase();

        return rows.filter((row) => {
            const matchesSearch =
                !search ||
                (row.ph_no ?? "").toLowerCase().includes(search) ||
                (row.branch_name ?? "").toLowerCase().includes(search) ||
                (row.supplier_name ?? "").toLowerCase().includes(search) ||
                (row.category_name ?? "").toLowerCase().includes(search) ||
                (row.price_type_name ?? "").toLowerCase().includes(search);

            const matchesBranch =
                !filters.branch_id || row.branch_id === filters.branch_id;

            const matchesSupplier =
                !filters.supplier_id || row.supplier_id === filters.supplier_id;

            const matchesStatus =
                filters.status === "All" || row.status === filters.status;

            const matchesStockType =
                filters.stock_type === "All" || row.stock_type === filters.stock_type;

            return (
                matchesSearch &&
                matchesBranch &&
                matchesSupplier &&
                matchesStatus &&
                matchesStockType
            );
        });
    }, [filters, rows]);

    React.useEffect(() => {
        setPage(1);
    }, [filters.search, filters.branch_id, filters.supplier_id, filters.status, filters.stock_type]);

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const paginatedRows = React.useMemo(() => {
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return filteredRows.slice(start, end);
    }, [filteredRows, page, totalPages]);

    const handleOpen = React.useCallback(
        (row: PhysicalInventoryListRow) => {
            onOpenRecord?.(row);
        },
        [onOpenRecord],
    );

    // Build combobox options
    const branchOptions: ComboboxOption[] = React.useMemo(
        () => [
            { value: "all", label: "All branches" },
            ...branches.map((b) => ({ value: String(b.id), label: b.branch_name })),
        ],
        [branches],
    );

    const supplierOptions: ComboboxOption[] = React.useMemo(
        () => [
            { value: "all", label: "All suppliers" },
            ...suppliers.map((s) => ({ value: String(s.id), label: s.supplier_name })),
        ],
        [suppliers],
    );

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border bg-background px-3 py-3 shadow-sm sm:px-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                        <div className="rounded-xl border bg-muted/40 p-2">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                                Physical Inventory List
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                View PI sessions and open an existing record.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => void loadRows()}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Refreshing...
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Refresh
                                </>
                            )}
                        </Button>

                        {!hideCreateButton && (
                            <Button
                                type="button"
                                className="cursor-pointer"
                                onClick={onCreateNew}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                New Physical Inventory
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Card className="rounded-2xl border shadow-sm">
                <CardContent className="pt-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Search */}
                        <div className="space-y-2">
                            <Label htmlFor="pi-list-search">Search</Label>
                            <Input
                                id="pi-list-search"
                                value={filters.search}
                                onChange={(event) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        search: event.target.value,
                                    }))
                                }
                                placeholder="PH No, branch, supplier..."
                            />
                        </div>

                        {/* Branch — searchable combobox */}
                        <div className="space-y-2">
                            <Label>Branch</Label>
                            <SearchableCombobox
                                options={branchOptions}
                                value={filters.branch_id ? String(filters.branch_id) : "all"}
                                onChange={(val) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        branch_id: val === "all" ? null : Number(val),
                                    }))
                                }
                                placeholder="All branches"
                                searchPlaceholder="Search branch..."
                                emptyText="No branch found."
                            />
                        </div>

                        {/* Supplier — searchable combobox */}
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <SearchableCombobox
                                options={supplierOptions}
                                value={filters.supplier_id ? String(filters.supplier_id) : "all"}
                                onChange={(val) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        supplier_id: val === "all" ? null : Number(val),
                                    }))
                                }
                                placeholder="All suppliers"
                                searchPlaceholder="Search supplier..."
                                emptyText="No supplier found."
                            />
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={filters.status}
                                onValueChange={(value) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        status: value as PhysicalInventoryListFilters["status"],
                                    }))
                                }
                            >
                                <SelectTrigger className="cursor-pointer w-full">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All statuses</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Committed">Committed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Stock Type */}
                        <div className="space-y-2">
                            <Label>Stock Type</Label>
                            <Select
                                value={filters.stock_type}
                                onValueChange={(value) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        stock_type: value as PhysicalInventoryListFilters["stock_type"],
                                    }))
                                }
                            >
                                <SelectTrigger className="cursor-pointer w-full">
                                    <SelectValue placeholder="All stock types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All stock types</SelectItem>
                                    <SelectItem value="GOOD">Good Stock</SelectItem>
                                    <SelectItem value="BAD">Bad Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <PhysicalInventoryListTable
                rows={paginatedRows}
                isLoading={isLoading}
                selectedHeaderId={selectedHeaderId}
                page={Math.min(page, totalPages)}
                pageSize={PAGE_SIZE}
                totalCount={totalCount}
                onPageChange={setPage}
                onOpen={handleOpen}
            />
        </div>
    );
}