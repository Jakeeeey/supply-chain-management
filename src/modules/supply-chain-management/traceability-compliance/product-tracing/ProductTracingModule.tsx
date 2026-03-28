//src/modules/supply-chain-management/traceability-compliance/product-tracing/ProductTracingModule.tsx
"use client";

import * as React from "react";
import { ProductTracingFilters } from "./components/ProductTracingFilters";
import { ProductTracingTable } from "./components/ProductTracingTable";
import { ProductTracingFiltersType, ProductMovementRow, ProductFamilyRow } from "./types";
import { fetchBranches, fetchProductFamilies, fetchMovements } from "./providers/fetchProvider";
import { Separator } from "@/components/ui/separator";
import { 
    History as HistoryIcon, 
    ArrowUpCircle as InIcon, 
    ArrowDownCircle as OutIcon, 
    Activity as TrendIcon, 
    Package as ProductIcon, 
    Search as TracerSearchIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export const ProductTracingModule = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
    const [filters, setFilters] = React.useState<ProductTracingFiltersType>({
        branch_id: null,
        parent_id: null,
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        endDate: new Date().toISOString(),
    });

    const [branches, setBranches] = React.useState<Array<{ id: number; branch_name: string }>>([]);
    const [families, setFamilies] = React.useState<ProductFamilyRow[]>([]);
    const [movements, setMovements] = React.useState<ProductMovementRow[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [b, f] = await Promise.all([fetchBranches(), fetchProductFamilies()]);
                setBranches(b || []);
                setFamilies(f || []);
            } catch (err) {
                console.error("Failed to load initial data", err);
            }
        };
        loadInitialData();
    }, []);

    const handleFilterChange = (newFilters: Partial<ProductTracingFiltersType>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const handleReset = () => {
        setFilters({
            branch_id: null,
            parent_id: null,
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            endDate: new Date().toISOString(),
        });
        setMovements([]);
        setError(null);
    };

    const handleSearch = async () => {
        if (!filters.branch_id || !filters.parent_id) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchMovements(filters);
            setMovements(data || []);
        } catch (err) {
            setError("Failed to fetch movements. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = React.useMemo(() => {
        if (!movements.length) return { totalIn: 0, totalOut: 0, netChange: 0 };
        
        // Frontend filtering by timestamp, branch and product family as requested
        const filtered = movements.filter(row => {
            // Date filter
            const rowDate = new Date(row.ts);
            const start = filters.startDate ? new Date(filters.startDate) : null;
            const end = filters.endDate ? new Date(filters.endDate) : null;
            if (start && rowDate < start) return false;
            if (end && rowDate > end) return false;

            // Branch filter
            if (filters.branch_id && row.branchId !== filters.branch_id) return false;

            // Product Family filter
            // We match if the product itself is the parent OR its parent is the selected parent
            if (filters.parent_id) {
                const matchesParent = row.productId === filters.parent_id || row.parentId === filters.parent_id;
                if (!matchesParent) return false;
            }

            return true;
        });

        const divisor = filtered[0]?.familyUnitCount || 1;
        const totalInBase = filtered.reduce((acc, row) => acc + (row.inBase || 0), 0);
        const totalOutBase = filtered.reduce((acc, row) => acc + (row.outBase || 0), 0);
        const netChangeBase = totalInBase - totalOutBase;

        // Breakdown per UOM as requested
        const breakdown: Record<string, { in: number, out: number }> = {};
        filtered.forEach(row => {
            const unit = row.unit || "Base";
            if (!breakdown[unit]) breakdown[unit] = { in: 0, out: 0 };
            
            const div = row.unitCount && row.unitCount > 0 ? row.unitCount : 1;
            breakdown[unit].in += (row.inBase || 0) / div;
            breakdown[unit].out += (row.outBase || 0) / div;
        });
        
        return { 
            totalInBase, 
            totalOutBase, 
            netChangeBase, 
            breakdown,
            filtered, 
            divisor: divisor || 1, 
            unit: filtered[0]?.familyUnit || filtered[0]?.unit || "Units" 
        };
    }, [movements, filters.startDate, filters.endDate]);

    const currentUnit = stats?.unit || "Units";
    const currentDivisor = stats?.divisor || 1;
    const currentBrand = (movements[0]?.brand || "Product tracing base") + (currentDivisor > 1 ? ` (x${currentDivisor})` : "");
    const breakdownEntries = Object.entries(stats?.breakdown || {});

    return (
        <div ref={ref} className={cn("space-y-6 max-w-[1600px] mx-auto pb-10", props.className)} {...props}>
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-2xl">
                        <HistoryIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Product Tracing Report</h1>
                        <p className="text-muted-foreground text-sm">Detailed product movement history and ledger.</p>
                    </div>
                </div>
            </div>

            <ProductTracingFilters 
                filters={filters}
                branches={branches}
                families={families}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                onSearch={handleSearch}
                isLoading={isLoading}
            />

            {error && (
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium">
                    {error}
                </div>
            )}

            {(movements.length > 0 || isLoading) && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-500">
                        <SummaryStatCard 
                            title="Total In" 
                            value={
                                <div className="flex flex-col gap-0.5 mt-1">
                                    {breakdownEntries.length > 0 ? (
                                        breakdownEntries.map(([unit, val]) => (
                                            <div key={unit} className="flex flex-col first:mt-0 mt-2">
                                                <div className="flex items-baseline justify-between w-full">
                                                    <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">{unit}</span>
                                                    <span className="text-3xl font-black tabular-nums text-emerald-600">
                                                        {val.in.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-sm font-bold text-muted-foreground opacity-50 italic">No additions</span>
                                    )}
                                </div>
                            } 
                            icon={<InIcon className="h-4 w-4 text-emerald-500" />}
                            subtitle={<span className="text-xl text-emerald-700/80">TOTAL: {(stats?.totalInBase || 0).toLocaleString()} <span className="text-[10px] opacity-60">PCS</span></span>}
                        />
                        <SummaryStatCard 
                            title="Total Out" 
                            value={
                                <div className="flex flex-col gap-0.5 mt-1">
                                    {breakdownEntries.length > 0 ? (
                                        breakdownEntries.map(([unit, val]) => (
                                            <div key={unit} className="flex flex-col first:mt-0 mt-2">
                                                <div className="flex items-baseline justify-between w-full">
                                                    <span className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest">{unit}</span>
                                                    <span className="text-3xl font-black tabular-nums text-amber-600">
                                                        {val.out.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-sm font-bold text-muted-foreground opacity-50 italic">No deductions</span>
                                    )}
                                </div>
                            } 
                            icon={<OutIcon className="h-4 w-4 text-amber-500" />}
                            subtitle={<span className="text-xl text-amber-700/80">TOTAL: {(stats?.totalOutBase || 0).toLocaleString()} <span className="text-[10px] opacity-60">PCS</span></span>}
                        />
                        <SummaryStatCard 
                            title="Net Change" 
                            value={
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black">{(stats?.netChangeBase || 0).toLocaleString()}</span>
                                    <span className="text-xs font-bold text-muted-foreground uppercase opacity-50 tracking-widest">Pieces</span>
                                </div>
                            } 
                            icon={<TrendIcon className="h-4 w-4 text-primary" />}
                            subtitle="Total net movement"
                            trend={(stats?.netChangeBase || 0) >= 0 ? "positive" : "negative"}
                        />
                        <SummaryStatCard 
                            title="UOM Breakdown" 
                            value={
                                <div className="flex flex-col gap-1 mt-1">
                                    {breakdownEntries.length > 0 ? (
                                        breakdownEntries.map(([unit, val]) => (
                                            <div key={unit} className="flex items-baseline justify-between w-full first:mt-0 mt-2">
                                                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{unit}</span>
                                                <span className="text-3xl font-black tabular-nums text-foreground">
                                                    {(val.in - val.out).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-sm font-bold text-muted-foreground opacity-50 italic text-center w-full">No movements</span>
                                    )}
                                </div>
                            } 
                            icon={<ProductIcon className="h-4 w-4 text-muted-foreground" />}
                            subtitle={`${breakdownEntries.length} Unique UOMs tracked`}
                        />
                    </div>

                    <Separator className="opacity-50" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-tight">Movement Ledger</h2>
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full font-medium">
                                {(stats.filtered?.length || movements.length)} records
                            </span>
                        </div>
                        <ProductTracingTable data={stats.filtered || movements} isLoading={isLoading} />
                    </div>
                </div>
            )}

            {movements.length === 0 && !isLoading && !error && (
                <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed rounded-[2rem] bg-muted/5 animate-in zoom-in-95 duration-500">
                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                        <TracerSearchIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-semibold text-muted-foreground">Ready to Trace?</h3>
                    <p className="text-muted-foreground max-w-sm mt-2">
                        Select a branch, product family and date range to begin tracing movements.
                    </p>
                </div>
            )}
        </div>
    );
});

ProductTracingModule.displayName = "ProductTracingModule";

function SummaryStatCard({ title, value, icon, subtitle, trend }: { 
    title: string; 
    value: React.ReactNode; 
    icon: React.ReactNode; 
    subtitle?: React.ReactNode;
    trend?: "positive" | "negative";
}) {
    return (
        <Card className="rounded-3xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-background group border-border/50">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">{title}</span>
                    <div className="p-2 bg-muted/20 group-hover:bg-muted/40 transition-colors rounded-xl">
                        {icon}
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <div className={cn(
                        "text-3xl font-black tracking-tighter tabular-nums",
                        trend === "positive" ? "text-emerald-600" : trend === "negative" ? "text-amber-600" : "text-foreground"
                    )}>{value}</div>
                </div>
                {subtitle && (
                    <div className="mt-4 pt-4 border-t border-border/40">
                        <p className="text-sm text-foreground uppercase font-black tracking-widest leading-tight">{subtitle}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
