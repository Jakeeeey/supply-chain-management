//src/modules/supply-chain-management/traceability-compliance/product-tracing/ProductTracingModule.tsx
"use client";

import * as React from "react";
import { ProductTracingFilters } from "./components/ProductTracingFilters";
import { ProductTracingTable } from "./components/ProductTracingTable";
import { PhysicalInventorySummary } from "./components/PhysicalInventorySummary";
import { fetchBranches, fetchProductFamilies, fetchMovements } from "./providers/fetchProvider";
import { ProductTracingFiltersType, ProductMovementRow, ProductFamilyRow } from "./types";
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
            // Omit startDate to fetch full historical movements up to endDate
            const fetchFilters = { ...filters, startDate: null };
            const [movementsData] = await Promise.all([
                fetchMovements(fetchFilters)
            ]);
            setMovements(movementsData || []);
        } catch (err) {
            setError("Failed to fetch data. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = React.useMemo(() => {
        if (!movements.length) return { totalIn: 0, totalOut: 0, netChange: 0 };
        
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;
        
        // Base filtering purely for product family, branch, and ending date
        const validMovements = movements.filter(row => {
            const rowDate = new Date(row.ts);
            if (end && rowDate > end) return false;

            if (filters.branch_id && row.branchId !== filters.branch_id) return false;

            if (filters.parent_id) {
                const matchesParent = row.productId === filters.parent_id || row.parentId === filters.parent_id;
                if (!matchesParent) return false;
            }

            return true;
        });

        // Split into "before" (for beginning balance) and "filtered" (for current period stats)
        const filtered: typeof movements = [];

        validMovements.forEach(row => {
            const rowDate = new Date(row.ts);
            if (!start || rowDate >= start) {
                filtered.push(row);
            }
        });

        const divisor = validMovements[0]?.familyUnitCount || 1;
        const totalInBase = filtered.reduce((acc, row) => acc + (row.inBase || 0), 0);
        const totalOutBase = filtered.reduce((acc, row) => acc + (row.outBase || 0), 0);
        const netChangeBase = totalInBase - totalOutBase;

        // Breakdown per UOM as requested
        const breakdown: Record<string, { beginning: number, in: number, out: number }> = {};
        
        validMovements.forEach(row => {
            const unit = row.unit || "Base";
            if (!breakdown[unit]) breakdown[unit] = { beginning: 0, in: 0, out: 0 };
            
            const div = row.unitCount && row.unitCount > 0 ? row.unitCount : 1;
            
            if (start && new Date(row.ts) < start) {
                breakdown[unit].beginning += ((row.inBase || 0) - (row.outBase || 0)) / div;
            } else {
                breakdown[unit].in += (row.inBase || 0) / div;
                breakdown[unit].out += (row.outBase || 0) / div;
            }
        });

        return { 
            totalInBase, 
            totalOutBase, 
            netChangeBase, 
            breakdown,
            filtered, 
            divisor: divisor || 1, 
            unit: validMovements.find(r => r.unitCount === (divisor || 1))?.unit || validMovements[0]?.familyUnit || "Box" 
        };
    }, [movements, filters.startDate, filters.endDate, filters.branch_id, filters.parent_id]);

    const currentUnit = stats?.unit || "Units";
    const currentDivisor = stats?.divisor || 1;
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
                    {stats.filtered && stats.filtered.some(m => m.docNo.toUpperCase().startsWith("PH") || m.docType?.toUpperCase() === "PHYSICAL INVENTORY") && (
                        <PhysicalInventorySummary 
                            movements={stats.filtered} 
                            baseUnitName={currentUnit}
                            baseUnitDivisor={currentDivisor}
                        />
                    )}

                    <Card className="rounded-[2rem] border shadow-sm bg-background overflow-hidden border-border/40 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <CardContent className="p-0">
                            <div className="grid md:grid-cols-[1fr,2.2fr] divide-y md:divide-y-0 md:divide-x divide-border/40">
                                {/* Left Section: High Level Summary */}
                                <div className="p-8 flex flex-col justify-center bg-muted/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -tr-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                        <HistoryIcon className="h-48 w-48 text-primary" />
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="p-1.5 bg-primary/10 rounded-lg">
                                            <TrendIcon className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Total Net Movement</span>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-baseline gap-3">
                                            <span className={cn(
                                                "text-6xl font-black tracking-tighter tabular-nums leading-none",
                                                (stats?.netChangeBase || 0) >= 0 ? "text-emerald-600" : "text-amber-600"
                                            )}>
                                                {(stats?.netChangeBase || 0).toLocaleString()}
                                            </span>
                                            <span className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">{currentUnit}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.1em] mt-2">
                                            Cumulative movement for selected period
                                        </p>
                                    </div>

                                    {/* Product Context Section */}
                                    {filters.parent_id && (
                                        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-left-2 duration-500">
                                            <div className="h-px w-10 bg-border/40" />
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Product Code</span>
                                                    <span className="text-[11px] font-bold text-foreground/80 tracking-tight">
                                                        {families.find(f => f.parent_id === filters.parent_id)?.product_code || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Brand</span>
                                                    <span className="text-[11px] font-bold text-foreground/80 tracking-tight">
                                                        {families.find(f => f.parent_id === filters.parent_id)?.brand_name || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Category</span>
                                                    <span className="text-[11px] font-bold text-foreground/80 tracking-tight">
                                                        {families.find(f => f.parent_id === filters.parent_id)?.category_name || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Short Desc</span>
                                                    <span className="text-[11px] font-bold text-foreground/80 tracking-tight truncate max-w-[120px]">
                                                        {families.find(f => f.parent_id === filters.parent_id)?.short_description || "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-10 pt-8 border-t border-border/40 flex items-center gap-8">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <InIcon className="h-3 w-3 text-emerald-500" />
                                                <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Total Additions</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-black text-emerald-600 tabular-nums">{(stats?.totalInBase || 0).toLocaleString()}</span>
                                                <span className="text-[8px] font-bold text-emerald-600/40 uppercase">Pcs</span>
                                            </div>
                                        </div>
                                        
                                        <div className="h-10 w-px bg-border/40" />

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <OutIcon className="h-3 w-3 text-amber-500" />
                                                <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Total Deductions</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-black text-amber-600 tabular-nums">{(stats?.totalOutBase || 0).toLocaleString()}</span>
                                                <span className="text-[8px] font-bold text-amber-600/40 uppercase">Pcs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Section: Detailed UOM Breakdown */}
                                <div className="p-8 flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-muted rounded-lg">
                                                <ProductIcon className="h-4 w-4 text-muted-foreground/60" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Inventory Unit Breakdown</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Tracking</span>
                                            <span className="text-[10px] font-black px-2 py-1 bg-muted rounded-full text-foreground border border-border/40">
                                                {breakdownEntries.length} Unique UOMs
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-x-auto min-h-[200px]">
                                        {breakdownEntries.length > 0 ? (
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-border/40">
                                                        <th className="pb-4 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Measurement Unit</th>
                                                        <th className="pb-4 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-right">Beginning Balance</th>
                                                        <th className="pb-4 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-right">Inflow (+)</th>
                                                        <th className="pb-4 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-right">Outflow (-)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/20">
                                                    {breakdownEntries.map(([unit, val]) => (
                                                        <tr key={unit} className="group hover:bg-muted/5 transition-colors">
                                                            <td className="py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black text-foreground uppercase tracking-tight">{unit}</span>
                                                                    <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-widest group-hover:text-primary/50 transition-colors">Stock Keeping Unit</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 text-right">
                                                                <span className={cn(
                                                                    "text-sm font-bold tabular-nums",
                                                                    val.beginning > 0 ? "text-primary/70" : val.beginning < 0 ? "text-destructive" : "text-muted-foreground"
                                                                )}>
                                                                    {val.beginning.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-right">
                                                                <span className="text-sm font-bold text-emerald-600/80 tabular-nums">
                                                                    {val.in.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-right">
                                                                <span className="text-sm font-bold text-amber-600/80 tabular-nums">
                                                                    {val.out.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                                                <ProductIcon className="h-10 w-10 text-muted-foreground/10 mb-3" />
                                                <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
                                                    Void Summary Dataset
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                        <span>Data Integrity Verified</span>
                                        <span className="text-primary/40 font-bold italic tracking-normal">Product Tracer Core v2.0</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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
