"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"
import HistoricalPlanningTable from "./historical-planning-table"
import { ForecastPlanningTable } from "./forecast-planning-table"
import { cn } from "@/lib/utils"
import { Link2Off, DatabaseZap, BrainCircuit, History, Layers } from "lucide-react"

interface PlanningContainerProps {
    mode: "historical" | "forecast"
    data: any[]
    simulationTargets: { A: number; B: number; C: number }
    selectedMonths: string[]
    onQuantityChange: (id: string, newQty: number) => void
}

export interface PlanningContainerHandle {
    clearAllQuantities: () => void;
    getCurrentData: () => any[];
}

export const PlanningContainer = forwardRef<PlanningContainerHandle, PlanningContainerProps>(
    ({ mode, data, simulationTargets, selectedMonths, onQuantityChange }, ref) => {
        const forecastRef = useRef<any>(null);

        // Calculate linked status for the footer badges
        // We now check if category_name is not "OTHERS" to confirm it was successfully mapped
        const linkedCount = data?.filter(row =>
            row.category_name && row.category_name !== "OTHERS"
        ).length || 0;

        const unlinkedCount = (data?.length || 0) - linkedCount;

        // Robust mode check
        const isForecast = mode?.toLowerCase().trim() === "forecast";

        useImperativeHandle(ref, () => ({
            clearAllQuantities: () => {
                data.forEach(row => {
                    const rowId = String(row.product_id || row.id || row.keyProductId);
                    onQuantityChange(rowId, 0);
                });
            },
            getCurrentData: () => {
                if (isForecast) return forecastRef.current?.getCalculatedData() || [];
                return data;
            }
        }));

        return (
            <div className="w-full min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-[3.5rem] transition-colors duration-500 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Main Table Content */}
                <div className="flex-1 w-full overflow-hidden flex flex-col">
                    {isForecast ? (
                        <ForecastPlanningTable
                            ref={forecastRef}
                            data={data} // Passes category_name mapped in page.tsx
                            selectedMonths={selectedMonths}
                            onQuantityChange={onQuantityChange}
                        />
                    ) : (
                        <HistoricalPlanningTable
                            data={data || []} // Passes category_name mapped in page.tsx
                            simulationTargets={simulationTargets || { A: 0, B: 0, C: 0 }}
                            onQuantityChange={onQuantityChange}
                        />
                    )}
                </div>

                {/* Container Footer Status Bar */}
                <div className={cn(
                    "px-10 py-6 border-t flex flex-wrap justify-between items-center shrink-0 transition-all duration-700",
                    isForecast
                        ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                        : "bg-slate-50/80 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800"
                )}>
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                {isForecast
                                    ? <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" />
                                    : <History className="w-3.5 h-3.5 text-blue-600" />
                                }
                                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-800 dark:text-slate-200">
                                    {isForecast ? 'Predictive Forecast Engine' : 'Historical Analysis Mode'}
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                                {isForecast ? 'Optimizing Procurement Cycle' : 'Processing Live Stock Movement'}
                            </span>
                        </div>

                        {/* Category Mapping Status Badge */}
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase leading-none">Category Sync</span>
                                {/*<span className="text-[9px] font-bold text-emerald-500 uppercase">{linkedCount} Identified</span>*/}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-10">
                        {/* Show indicator if products failed the category mapping */}
                        {unlinkedCount > 0 && (
                            <div className="flex items-center gap-2 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">
                                <Link2Off className="w-3.5 h-3.5 text-rose-600" />
                                {/*<span className="text-[10px] font-black text-rose-600 uppercase tracking-tight">*/}
                                {/*    {unlinkedCount} Categories Unmapped*/}
                                {/*</span>*/}
                            </div>
                        )}

                        <div className="flex flex-col items-end min-w-[120px]">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                                    {data?.length || 0} Products
                                </span>
                                <DatabaseZap className={cn(
                                    "w-3.5 h-3.5",
                                    isForecast ? "text-emerald-500" : "text-blue-500"
                                )} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                Live Data
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

PlanningContainer.displayName = "PlanningContainer";