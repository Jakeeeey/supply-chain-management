//src/modules/supply-chain-management/traceability-compliance/product-tracing/components/ProductTracingFilters.tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ProductTracingFiltersType, ProductFamilyRow } from "../types";
import { SearchableSelect } from "./SearchableSelect";

type Props = {
    filters: ProductTracingFiltersType;
    branches: Array<{ id: number; branch_name: string }>;
    families: ProductFamilyRow[];
    onFilterChange: (filters: Partial<ProductTracingFiltersType>) => void;
    onReset: () => void;
    onSearch: () => void;
    isLoading?: boolean;
};

export function ProductTracingFilters({
    filters,
    branches,
    families,
    onFilterChange,
    onReset,
    onSearch,
    isLoading
}: Props) {
    const branchOptions = React.useMemo(() => 
        branches.map(b => ({ value: b.id, label: b.branch_name })),
    [branches]);

    const familyOptions = React.useMemo(() => 
        families.map(f => ({ 
            value: f.parent_id, 
            label: f.product_name || "Unknown Product",
            description: `${f.category_name || "No Category"} | ${f.brand_name || "No Brand"}`
        })),
    [families]);

    const safeStartDate = filters.startDate ? new Date(filters.startDate) : null;
    const safeEndDate = filters.endDate ? new Date(filters.endDate) : null;

    return (
        <Card className="rounded-2xl border shadow-sm overflow-visible">
            <CardContent className="p-4 sm:p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-end">
                    <SearchableSelect 
                        label="Branch"
                        placeholder="Select Branch"
                        emptyText="No branch found."
                        value={filters.branch_id}
                        options={branchOptions}
                        onChange={(val) => onFilterChange({ branch_id: val })}
                        searchPlaceholder="Search branch..."
                        disabled={isLoading}
                    />

                    <SearchableSelect 
                        label="Product Family"
                        placeholder="Select Product"
                        emptyText="No product family found."
                        value={filters.parent_id}
                        options={familyOptions}
                        onChange={(val) => onFilterChange({ parent_id: val })}
                        searchPlaceholder="Search product family..."
                        disabled={isLoading}
                    />

                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Date Range</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-10 rounded-xl px-4 border-muted-foreground/20",
                                        !filters.startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {safeStartDate ? (
                                        safeEndDate ? (
                                            <>
                                                {format(safeStartDate, "LLL dd, y")} -{" "}
                                                {format(safeEndDate, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(safeStartDate, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border overflow-hidden shadow-xl" align="start">
                                <Calendar
                                    mode="range"
                                    defaultMonth={safeStartDate || undefined}
                                    selected={{ 
                                        from: safeStartDate || undefined, 
                                        to: safeEndDate || undefined 
                                    }}
                                    onSelect={(range) => {
                                        onFilterChange({ 
                                            startDate: range?.from?.toISOString() || null, 
                                            endDate: range?.to?.toISOString() || null 
                                        });
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            className="h-10 rounded-xl px-4 flex-1 hover:bg-muted font-bold text-xs uppercase tracking-widest text-muted-foreground transition-colors"
                            onClick={onReset}
                            disabled={isLoading}
                        >
                            <RotateCcw className="mr-2 h-3.5 w-3.5" />
                            Reset
                        </Button>
                        <Button
                            className="h-10 rounded-xl px-6 flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase tracking-widest shadow-sm shadow-primary/20 transition-all active:scale-[0.98]"
                            onClick={onSearch}
                            disabled={isLoading || !filters.branch_id || !filters.parent_id}
                        >
                            <Search className="mr-2 h-4 w-4" />
                            {isLoading ? "..." : "Trace"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
