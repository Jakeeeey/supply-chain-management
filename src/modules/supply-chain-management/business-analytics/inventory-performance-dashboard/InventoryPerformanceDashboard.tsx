'use client';

import React from 'react';
import { useBiaFilters } from './hooks/useBiaFilters';
import { useInventoryPerformance } from './hooks/useInventoryPerformance';
import { useBiaLookups } from './hooks/useBiaLookups';
import { BiaFilterBar } from './components/BiaFilterBar';
import { SummaryCard } from './components/SummaryCard';
import ErrorPage from '@/components/shared/ErrorPage';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryPerformanceDashboard() {
    const { filters, updateFilters } = useBiaFilters();
    const { data: perfData, isLoading, error, refresh } = useInventoryPerformance(filters);
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
                    title="Data Fetch Error"
                    message={error}
                    reset={refresh}
                />
            </div>
        );
    }

    if (isLoading && !perfData) {
        return (
            <div className="space-y-6">
                <div className="h-16 w-full bg-muted animate-pulse rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-[400px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        );
    }

    const inventoryPerformance = {
        items: perfData?.items || [],
        fnsDistribution: perfData?.fnsDistribution || [],
    };

    // Compute summary cards from own data
    const totalValue = inventoryPerformance.items.reduce((sum, i) => sum + (i.value ?? 0), 0);
    const totalSKUs = inventoryPerformance.items.length;
    const abcACount = inventoryPerformance.items.filter(i => i.abcValueClass === 'A').length;
    const fastMovers = inventoryPerformance.fnsDistribution.find(d => d.label === 'Fast');
    const fastPct = fastMovers ? fastMovers.percentage : 0;

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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Inventory Value"
                    value={`₱${totalValue.toLocaleString()}`}
                    description="Across all warehouses"
                    gradient="bg-gradient-to-t from-blue-600 to-blue-400"
                    type="currency"
                />
                <SummaryCard
                    title="Total SKUs"
                    value={totalSKUs}
                    description="Active products tracked"
                    gradient="bg-gradient-to-t from-violet-600 to-violet-400"
                    type="number"
                />
                <SummaryCard
                    title="ABC Class A Items"
                    value={abcACount}
                    description="Top 80% value contributors"
                    gradient="bg-gradient-to-t from-amber-600 to-amber-400"
                    type="number"
                />
                <SummaryCard
                    title="Fast Movers"
                    value={`${fastPct}%`}
                    description="High pick-frequency items"
                    gradient="bg-gradient-to-t from-emerald-600 to-emerald-400"
                    type="percentage"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>ABC Analysis (Value vs Volume)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inventoryPerformance.items}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="sku" />
                                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="value" name="Value (₱)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="volume" name="Volume" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>FNS Distribution (Pick Frequency)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={inventoryPerformance.fnsDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {inventoryPerformance.fnsDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Inventory Performance Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={[
                            { accessorKey: 'sku', header: 'SKU' },
                            { accessorKey: 'name', header: 'Product Name' },
                            { accessorKey: 'value', header: 'Value (₱)', cell: ({ row }) => (row.original.value ?? 0).toLocaleString() },
                            { accessorKey: 'volume', header: 'Volume' },
                            { accessorKey: 'pickFrequency', header: 'Pick Frequency' },
                            { accessorKey: 'abcValueClass', header: 'ABC (Value)' },
                            { accessorKey: 'fnsClass', header: 'FNS Status' },
                        ]}
                        data={inventoryPerformance.items}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
