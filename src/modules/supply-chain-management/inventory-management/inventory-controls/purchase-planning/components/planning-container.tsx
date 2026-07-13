"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"
import HistoricalPlanningTable from "./historical-planning-table"
import { ForecastPlanningTable, ForecastPlanningTableHandle, ForecastItem } from "./forecast-planning-table"
import { PlanningRow } from "../types"
import { cn } from "@/lib/utils"
import { Link2Off, DatabaseZap, BrainCircuit, History, Layers } from "lucide-react"

interface PlanningContainerProps {
    mode: "historical" | "forecast"
    data: PlanningRow[]
    simulationTargets: { A: number; B: number; C: number }
    selectedMonths: string[]
    onQuantityChange: (id: string, newQty: number) => void
    onFilteredDataChange?: (filteredData: PlanningRow[]) => void
    onShowTrend?: (row: PlanningRow) => void
}

export interface PlanningContainerHandle {
    clearAllQuantities: () => void;
    getCurrentData: () => PlanningRow[];
}

export const PlanningContainer = forwardRef<PlanningContainerHandle, PlanningContainerProps>(
    ({ mode, data, simulationTargets, selectedMonths, onQuantityChange, onFilteredDataChange, onShowTrend }, ref) => {
        const forecastRef = useRef<ForecastPlanningTableHandle>(null);

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
                    const rowId = String(row.product_id || row.id);
                    onQuantityChange(rowId, 0);
                });
            },
            getCurrentData: () => {
                if (isForecast) return (forecastRef.current?.getCalculatedData() || []) as unknown as PlanningRow[];
                return data;
            }
        }));

        return (
            <div className="w-full min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg transition-colors duration-500 shadow-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Main Table Content */}
                <div className="flex-1 w-full overflow-hidden flex flex-col">
                    {isForecast ? (
                        <ForecastPlanningTable
                            ref={forecastRef}
                            data={data as unknown as ForecastItem[]} // Passes category_name mapped in page.tsx
                            selectedMonths={selectedMonths}
                            onQuantityChange={onQuantityChange}
                            onFilteredDataChange={onFilteredDataChange as unknown as (filteredData: ForecastItem[]) => void}
                            onShowTrend={onShowTrend}
                        />
                    ) : (
                        <HistoricalPlanningTable
                            data={data || []} // Passes category_name mapped in page.tsx
                            simulationTargets={simulationTargets || { A: 0, B: 0, C: 0 }}
                            onQuantityChange={onQuantityChange}
                            onFilteredDataChange={onFilteredDataChange}
                            onShowTrend={onShowTrend}
                        />
                    )}
                </div>

                {/* Container Footer Status Bar */}
                <div className={cn(
                    "px-4 py-2 border-t flex flex-wrap justify-between items-center shrink-0 transition-all duration-700",
                    isForecast
                        ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                        : "bg-slate-50/80 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800"
                )}>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                {isForecast
                                    ? <BrainCircuit className="w-3 h-3 text-emerald-600" />
                                    : <History className="w-3 h-3 text-blue-600" />
                                }
                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 dark:text-slate-200">
                                    {isForecast ? 'Predictive Forecast Engine' : 'Historical Analysis Mode'}
                                </span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                                {isForecast ? 'Optimizing Procurement Cycle' : 'Processing Live Stock Movement'}
                            </span>
                        </div>

                        {/* Category Mapping Status Badge */}
                        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-100 dark:border-slate-700">
                            <Layers className="w-3 h-3 text-blue-500" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase leading-none">Category Sync</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Show indicator if products failed the category mapping */}
                        {unlinkedCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">
                                <Link2Off className="w-3 h-3 text-rose-600" />
                            </div>
                        )}

                        <div className="flex flex-col items-end min-w-[100px]">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">
                                    {data?.length || 0} Products
                                </span>
                                <DatabaseZap className={cn(
                                    "w-3 h-3",
                                    isForecast ? "text-emerald-500" : "text-blue-500"
                                )} />
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">
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