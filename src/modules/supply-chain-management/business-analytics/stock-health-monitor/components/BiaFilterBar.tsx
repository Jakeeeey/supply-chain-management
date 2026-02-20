'use client';

import { GlobalFilter } from '../types';
import { LookupOption } from '../hooks/useBiaLookups';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, FilterIcon, RefreshCw } from 'lucide-react';

interface BiaFilterBarProps {
    filters: GlobalFilter;
    onFilterChange: (filters: Partial<GlobalFilter>) => void;
    onRefresh: () => void;
    isLoading?: boolean;
    branches?: LookupOption[];
    suppliers?: LookupOption[];
}

export function BiaFilterBar({ filters, onFilterChange, onRefresh, isLoading, branches = [], suppliers = [] }: BiaFilterBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-sm mb-6">
            <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
            </div>

            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 justify-start text-left font-normal w-[240px]">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                            filters.dateRange.to ? (
                                <>
                                    {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                    {format(filters.dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(filters.dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange.from}
                        selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                        onSelect={(range) => onFilterChange({ dateRange: { from: range?.from, to: range?.to } })}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>

            <Select
                value={filters.branchId || 'all'}
                onValueChange={(val) => onFilterChange({ branchId: val })}
            >
                <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={filters.supplierId || 'all'}
                onValueChange={(val) => onFilterChange({ supplierId: val })}
            >
                <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="ml-auto">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="h-9"
                >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>
        </div>
    );
}
