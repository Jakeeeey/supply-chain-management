"use client";

import * as React from "react";
import type {
    BranchRow,
    CategoryRow,
    PhysicalInventoryFiltersType,
    PriceTypeRow,
    SupplierRow,
} from "../types";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    AlertTriangle,
    Boxes,
    Check,
    ChevronsUpDown,
    Loader2,
    Lock,
    Search,
    Workflow,
} from "lucide-react";

type Props = {
    filters: PhysicalInventoryFiltersType;
    branches: BranchRow[];
    suppliers: SupplierRow[];
    categories: CategoryRow[];
    priceTypes: PriceTypeRow[];
    canEdit: boolean;
    hasLoadedDetails: boolean;
    isLoadingProducts: boolean;
    onChangeBranch: (value: number | null) => void;
    onChangeSupplier: (value: number | null) => void;
    onChangeCategory: (value: number | null) => void;
    onChangePriceType: (value: number | null) => void;
    onLoadProducts: () => void;
};

type SearchableOption = {
    value: number;
    label: string;
    searchText: string;
};

function selectValue(value: number | null): string {
    return value === null ? "__empty__" : String(value);
}

function fromSelectValue(value: string): number | null {
    return value === "__empty__" ? null : Number(value);
}

function helperText(
    filters: PhysicalInventoryFiltersType,
    hasLoadedDetails: boolean,
): string {
    if (hasLoadedDetails) {
        return "Filters are locked because products have already been loaded.";
    }
    if (!filters.branch_id) {
        return "Step 1: Select a branch.";
    }
    if (!filters.supplier_id) {
        return "Step 2: Select a supplier.";
    }
    if (!filters.category_id) {
        return "Step 3: Select a category.";
    }
    if (!filters.price_type_id) {
        return "Step 4: Select a price type.";
    }
    return "Step 5: Load eligible products for counting.";
}

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

function createBranchOptions(rows: BranchRow[]): SearchableOption[] {
    return rows.map((row) => ({
        value: row.id,
        label: row.branch_name,
        searchText: normalizeText(row.branch_name),
    }));
}

function createSupplierOptions(rows: SupplierRow[]): SearchableOption[] {
    return rows.map((row) => {
        const shortcut =
            "supplier_shortcut" in row && typeof row.supplier_shortcut === "string"
                ? row.supplier_shortcut
                : "";

        return {
            value: row.id,
            label: row.supplier_name,
            searchText: normalizeText(`${row.supplier_name} ${shortcut}`),
        };
    });
}

function createCategoryOptions(rows: CategoryRow[]): SearchableOption[] {
    return rows.map((row) => ({
        value: row.category_id,
        label: row.category_name,
        searchText: normalizeText(row.category_name),
    }));
}

type SearchableSelectProps = {
    label: string;
    placeholder: string;
    emptyText: string;
    value: number | null;
    options: SearchableOption[];
    disabled: boolean;
    searchPlaceholder: string;
    onChange: (value: number | null) => void;
};

function SearchableSelect({
                              label,
                              placeholder,
                              emptyText,
                              value,
                              options,
                              disabled,
                              searchPlaceholder,
                              onChange,
                          }: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    return (
        <div className="space-y-2">
            <Label>{label}</Label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className="w-full justify-between cursor-pointer font-normal"
                    >
                        <span className="truncate">
                            {selected ? selected.label : placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                    <Command
                        filter={(optionValue, search, keywords) => {
                            const haystack = [optionValue, ...(keywords ?? [])]
                                .join(" ")
                                .toLowerCase();

                            return haystack.includes(search.toLowerCase()) ? 1 : 0;
                        }}
                    >
                        <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
                            <Search className="h-3.5 w-3.5" />
                            Search {label.toLowerCase()}
                        </div>

                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList>
                            <CommandEmpty>{emptyText}</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        keywords={[option.searchText]}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selected?.value === option.value
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                            )}
                                        />
                                        <span className="truncate">{option.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export function PhysicalInventoryFilters(props: Props) {
    const {
        filters,
        branches,
        suppliers,
        categories,
        priceTypes,
        canEdit,
        hasLoadedDetails,
        isLoadingProducts,
        onChangeBranch,
        onChangeSupplier,
        onChangeCategory,
        onChangePriceType,
        onLoadProducts,
    } = props;

    const disableFilterChange = !canEdit || hasLoadedDetails;
    const branchSelected = filters.branch_id !== null;
    const supplierSelected = filters.supplier_id !== null;
    const categorySelected = filters.category_id !== null;
    const isFullyScoped =
        branchSelected &&
        supplierSelected &&
        categorySelected &&
        filters.price_type_id !== null;

    const branchOptions = React.useMemo(() => createBranchOptions(branches), [branches]);
    const supplierOptions = React.useMemo(() => createSupplierOptions(suppliers), [suppliers]);
    const categoryOptions = React.useMemo(() => createCategoryOptions(categories), [categories]);

    return (
        <Card className="overflow-hidden rounded-2xl border shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold tracking-tight">
                            Product Scope
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Select the inventory scope before loading eligible product variants.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                        <Workflow className="h-3.5 w-3.5" />
                        Branch → Supplier → Category → Price Type → Load Products
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
                {hasLoadedDetails ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium">Filters locked</p>
                            <p className="text-amber-700/90 dark:text-amber-300/90">
                                Detail rows already exist for this PI. Branch, supplier, category, and price type can no longer be changed.
                            </p>
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SearchableSelect
                        label="Branch"
                        placeholder="Select branch"
                        emptyText="No branch found."
                        value={filters.branch_id}
                        options={branchOptions}
                        disabled={!canEdit}
                        searchPlaceholder="Search branch..."
                        onChange={onChangeBranch}
                    />

                    <SearchableSelect
                        label="Supplier"
                        placeholder={branchSelected ? "Select supplier" : "Select branch first"}
                        emptyText="No supplier found."
                        value={filters.supplier_id}
                        options={supplierOptions}
                        disabled={disableFilterChange || !branchSelected}
                        searchPlaceholder="Search supplier..."
                        onChange={onChangeSupplier}
                    />

                    <SearchableSelect
                        label="Category"
                        placeholder={supplierSelected ? "Select category" : "Select supplier first"}
                        emptyText="No category found."
                        value={filters.category_id}
                        options={categoryOptions}
                        disabled={disableFilterChange || !supplierSelected}
                        searchPlaceholder="Search category..."
                        onChange={onChangeCategory}
                    />

                    <div className="space-y-2">
                        <Label>Price Type</Label>
                        <Select
                            value={selectValue(filters.price_type_id)}
                            onValueChange={(value) => onChangePriceType(fromSelectValue(value))}
                            disabled={disableFilterChange || !categorySelected}
                        >
                            <SelectTrigger className="cursor-pointer">
                                <SelectValue
                                    placeholder={
                                        categorySelected
                                            ? "Select price type"
                                            : "Select category first"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__empty__">Select price type</SelectItem>
                                {priceTypes.map((row) => (
                                    <SelectItem
                                        key={row.price_type_id}
                                        value={String(row.price_type_id)}
                                    >
                                        {row.price_type_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            {helperText(filters, hasLoadedDetails)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">

                        <Button
                            className="cursor-pointer"
                            onClick={onLoadProducts}
                            disabled={!canEdit || hasLoadedDetails || isLoadingProducts || !isFullyScoped}
                        >
                            {isLoadingProducts ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Boxes className="mr-2 h-4 w-4" />
                                    Load Products
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}