'use client';

import React from 'react';
import { useBiaFilters } from './hooks/useBiaFilters';
import { useStockHealth } from './hooks/useStockHealth';
import { useBiaLookups } from '../inventory-performance-dashboard/hooks/useBiaLookups';
import { BiaFilterBar } from './components/BiaFilterBar';
import { SummaryCard } from './components/SummaryCard';
import ErrorPage from '@/components/shared/ErrorPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, PackageSearch } from 'lucide-react';

export default function StockHealthMonitor() {
    const { filters, updateFilters } = useBiaFilters();
    const { data, isLoading, error, refresh } = useStockHealth(filters);
    const { lookups } = useBiaLookups();

    if (error) {
        return (
            <div className="space-y-6">
                <BiaFilterBar
                    filters={filters}
                    onFilterChange={updateFilters}
                    onRefresh={refresh}
                    isLoading={isLoading}
                    branches={lookups.branches}
                    suppliers={lookups.suppliers}
                />
                <ErrorPage
                    title="Stock Health Monitor Error"
                    message={error}
                    reset={refresh}
                />
            </div>
        );
    }

    if (isLoading && !data) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-16 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    const defaultSummary = { totalHealthyValue: 0, totalSlobValue: 0, atRiskCount: 0 };
    const stockHealth = {
        items: data?.items || [],
        summary: { ...defaultSummary, ...data?.summary },
    };

    return (
        <div className="space-y-6">
            <BiaFilterBar
                filters={filters}
                onFilterChange={updateFilters}
                onRefresh={refresh}
                isLoading={isLoading}
                branches={lookups.branches}
                suppliers={lookups.suppliers}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SummaryCard
                    title="Healthy Inventory Value"
                    value={`₱${(stockHealth.summary.totalHealthyValue ?? 0).toLocaleString()}`}
                    description="Stock with movement in last 60 days"
                    gradient="bg-gradient-to-t from-emerald-600 to-emerald-400"
                    type="currency"
                />
                <SummaryCard
                    title="SLOB Inventory Value"
                    value={`₱${(stockHealth.summary.totalSlobValue ?? 0).toLocaleString()}`}
                    description="No outbound movement > 60 days"
                    gradient="bg-gradient-to-t from-rose-600 to-rose-400"
                    type="currency"
                />
                <Card className="bg-gradient-to-t from-amber-600 to-amber-400 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">At-Risk Items</p>
                                <h3 className="text-2xl font-bold mt-1">{stockHealth.summary.atRiskCount}</h3>
                                <p className="text-xs opacity-70 mt-1">Items below 15 days of stock</p>
                            </div>
                            <AlertTriangle className="h-10 w-10 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Action Required: Stock-Out Risks & SLOB</CardTitle>
                    <PackageSearch className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={[
                            { accessorKey: 'sku', header: 'SKU' },
                            { accessorKey: 'name', header: 'Product Name' },
                            { accessorKey: 'currentBalance', header: 'Balance' },
                            { accessorKey: 'ads30', header: 'ADS (30d)', cell: ({ row }) => row.original.ads30.toFixed(2) },
                            {
                                accessorKey: 'daysOfStock',
                                header: 'Days Left',
                                cell: ({ row }) => {
                                    const days = row.original.daysOfStock;
                                    return (
                                        <div className="flex items-center gap-2">
                                            <span className={cn(days <= 15 ? "text-rose-600 font-bold" : "")}>
                                                {days.toFixed(1)}
                                            </span>
                                            {days <= 15 && <Badge variant="destructive" className="h-5 px-1">Critical</Badge>}
                                        </div>
                                    );
                                }
                            },
                            {
                                accessorKey: 'isSlob',
                                header: 'Status',
                                cell: ({ row }) => {
                                    if (row.original.isSlob) return <Badge variant="outline" className="text-rose-500 border-rose-200">SLOB (Dead Stock)</Badge>;
                                    if (row.original.isStockOutRisk) return <Badge variant="outline" className="text-amber-500 border-amber-200">Reorder Soon</Badge>;
                                    return <Badge variant="outline" className="text-emerald-500 border-emerald-200">Healthy</Badge>;
                                }
                            },
                            { accessorKey: 'lastOutboundDate', header: 'Last Outbound', cell: ({ row }) => row.original.lastOutboundDate || 'Never' },
                        ]}
                        data={stockHealth.items}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
