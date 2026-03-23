"use client"

import {useState, useRef, useEffect} from "react"
import {Database, Loader2, AlertTriangle, TrendingUp, History} from "lucide-react"
import {cn} from "@/lib/utils"

import {PlanningToolbar} from "./components/planning-toolbar"
import {SimulationPanel} from "./components/simulation-panel"
import {PlanningContainer, type PlanningContainerHandle} from "./components/planning-container"
import {PlanningFooter} from "./components/planning-footer"
import {InTransitModal} from "./components/in-transit-modal"

import {fetchHistoricalData, fetchForecastData} from "./services/purchase-planning-api"

export function PurchasePlanningModule() {
    // --- UI STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [dataLoaded, setDataLoaded] = useState(false)
    const [isTableLoading, setIsTableLoading] = useState(false)
    const [viewMode, setViewMode] = useState<"historical" | "forecast">("historical")
    const [planningData, setPlanningData] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [targets, setTargets] = useState({A: 0, B: 0, C: 0})
    const [pendingSelection, setPendingSelection] = useState<any>(null)

    // 🚀 NEW: Source of truth for selected branches (shared between Header & Footer)
    const [activeBranches, setActiveBranches] = useState<string[]>([])

    const tableRef = useRef<PlanningContainerHandle>(null)

    // 🚀 UNIVERSAL DYNAMIC HYDRATION ENGINE
    const applySimulationMath = (rawData: any[], currentTargets: any, mode: string, monthsCount: number) => {
        return rawData.map((row) => {
            const targetDays = currentTargets[row.abcClass as keyof typeof currentTargets] || 15;

            let dau = 0;
            let expectedSellout = 0;

            if (mode === "forecast") {
                const forecastValues = Object.values(row.monthlyForecast || {});
                const totalForecastBoxes = forecastValues.reduce((sum: any, val: any) => sum + Number(val), 0) as number;
                const activeMonths = Math.max(1, monthsCount);
                dau = totalForecastBoxes / (activeMonths * 21);
                expectedSellout = 0;
            } else {
                dau = row.dailyUsage || 0;
                expectedSellout = row.expectedSelloutBoxes || 0;
            }

            const reqInv = dau * targetDays;
            const projStock = (row.currentStockBoxes || 0) + (row.inTransitBoxes || 0) - expectedSellout;
            const suggested = Math.max(0, Math.ceil(reqInv - projStock));
            const finalOrderQty = row.isManual ? row.orderQty : suggested;

            return {
                ...row,
                dailyUsage: dau,
                reqInv: reqInv,
                projStock: projStock,
                suggestedQty: suggested,
                orderQty: finalOrderQty,
                totalValue: finalOrderQty * (row.computedPricePerBox || 0)
            };
        });
    };

    useEffect(() => {
        if (dataLoaded && planningData.length > 0) {
            const monthsCount = pendingSelection?.months?.length || 3;
            setPlanningData((prevData) => applySimulationMath(prevData, targets, viewMode, monthsCount));
        }
    }, [targets]);

    const handleInitialLoad = (months: string[], mode: "historical" | "forecast", year: string, supplierId: string, selectedBranches: string[]) => {
        setPendingSelection({months, mode, year, supplierId, selectedBranches})
        // 🚀 Sync branch state on initial load trigger
        setActiveBranches(selectedBranches)
        setIsModalOpen(true)
    }

    const handleConfirmLoad = async (selectedPOs: any[] = []) => {
        setIsModalOpen(false)
        setIsTableLoading(true)
        setError(null)

        try {
            const poIds: number[] = selectedPOs.map(po => parseInt(po.id, 10))
            const supplierIdNum = parseInt(pendingSelection.supplierId, 10)
            const branchIdsNum: number[] = (pendingSelection.selectedBranches || []).map((id: string) => parseInt(id, 10))
            const selectedYearNum = parseInt(pendingSelection.year, 10) || new Date().getFullYear()

            const mappedMonths: number[] = (pendingSelection.months || []).map((m: any): number => {
                const str = String(m).trim();
                if (str.includes("-")) {
                    const parts = str.split("-");
                    if (parts.length >= 2) return parseInt(parts[1], 10);
                }
                const textMap: Record<string, number> = {
                    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
                    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
                };
                return textMap[str.toLowerCase().substring(0, 3)] || 1;
            });

            const uniqueMappedMonths = Array.from(new Set(mappedMonths)) as number[];
            const monthsCount = uniqueMappedMonths.length > 0 ? uniqueMappedMonths.length : 3;

            let rawData;

            if (pendingSelection?.mode === "forecast") {
                rawData = await fetchForecastData({
                    supplierId: supplierIdNum,
                    branchIds: branchIdsNum,
                    inTransitPoIds: poIds
                });
            } else {
                rawData = await fetchHistoricalData({
                    supplierId: supplierIdNum,
                    branchIds: branchIdsNum,
                    inTransitPoIds: poIds,
                    selectedMonths: uniqueMappedMonths.length > 0 ? uniqueMappedMonths : [1, 2, 3],
                    selectedYear: selectedYearNum
                });
            }

            const finalData = applySimulationMath(rawData, targets, pendingSelection?.mode, monthsCount);

            setPlanningData(finalData)
            setViewMode(pendingSelection?.mode || "historical")
            setDataLoaded(true)

        } catch (err: any) {
            console.error("❌ Failed to load planning dashboard:", err)
            setError(err.message || "Failed to synthesize market intelligence.")
        } finally {
            setIsTableLoading(false)
        }
    }

    const handleQuantityChange = (id: string, newQty: number) => {
        setPlanningData((prev) => prev.map((row) => {
            if (String(row.product_id || row.id) === String(id)) {
                return {
                    ...row,
                    orderQty: newQty,
                    isManual: true,
                    totalValue: newQty * (row.computedPricePerBox || 0)
                }
            }
            return row
        }))
    }

    const handleClearAllOrders = () => {
        tableRef.current?.clearAllQuantities()
    }

    const handleResetSuggested = () => {
        setPlanningData((prev) => prev.map((row) => ({
            ...row,
            isManual: false,
            orderQty: row.suggestedQty,
            totalValue: row.suggestedQty * (row.computedPricePerBox || 0)
        })))
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-40 transition-colors duration-500">
            <header
                className={cn(
                    "px-4 sm:px-8 py-10 sm:py-16 text-white shadow-2xl relative transition-all duration-700 overflow-hidden",
                    !dataLoaded ? "bg-slate-900" : viewMode === "forecast" ? "bg-emerald-900" : "bg-blue-950"
                )}
            >
                <div className="w-full mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                        <div
                            className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-[1.75rem] sm:rounded-[2rem] border border-white/20 shrink-0">
                            {viewMode === "forecast" ? <TrendingUp className="w-8 h-8 text-emerald-200"/> :
                                <History className="w-8 h-8 text-blue-200"/>}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter truncate">
                                Purchase Planning
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="w-full mx-auto px-4 sm:px-6 md:px-8 -mt-6 sm:-mt-10 space-y-6 sm:space-y-8 relative z-20">
                <section
                    className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-2 shadow-xl border border-white dark:border-slate-800">
                    {/* 🚀 ADDED onBranchChange to sync the toolbar selection to Parent */}
                    <PlanningToolbar
                        onLoad={handleInitialLoad}
                        onBranchChange={setActiveBranches}
                    />
                </section>

                {error && (
                    <div
                        className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-[2rem] text-rose-600 flex items-center gap-4">
                        <AlertTriangle className="w-6 h-6 shrink-0"/>
                        <span className="font-black uppercase text-sm">{error}</span>
                    </div>
                )}

                {dataLoaded ? (
                    <div className="space-y-6 animate-in fade-in duration-700">
                        <SimulationPanel mode={viewMode} onTargetChange={setTargets} onClear={handleClearAllOrders}
                                         onReset={handleResetSuggested}/>

                        <div
                            className="bg-white dark:bg-slate-900 rounded-[2rem] border shadow-2xl overflow-hidden relative min-h-[500px]">
                            {isTableLoading && (
                                <div
                                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-950/50 backdrop-blur-md">
                                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-2"/>
                                    <span className="text-[10px] font-black uppercase">Synthesizing...</span>
                                </div>
                            )}
                            <PlanningContainer
                                ref={tableRef}
                                mode={viewMode}
                                data={planningData}
                                simulationTargets={targets}
                                selectedMonths={pendingSelection?.months || []}
                                onQuantityChange={handleQuantityChange}
                            />
                        </div>

                        {/* 🚀 Footer now receives the synced branchIds from Parent State */}
                        <PlanningFooter
                            data={planningData}
                            supplierId={pendingSelection?.supplierId || ""}
                            branchIds={activeBranches}
                            mode={viewMode}
                        />
                    </div>
                ) : (
                    <div
                        className="h-[400px] flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] bg-white/20 border-slate-200 dark:border-slate-800">
                        <Database className="w-14 h-14 text-slate-300 mb-6"/>
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest text-center">Select
                            Supplier to Load Data</h3>
                    </div>
                )}
            </main>

            <InTransitModal open={isModalOpen} setOpen={setIsModalOpen} onConfirm={handleConfirmLoad}
                            supplierId={pendingSelection?.supplierId || null}/>
        </div>
    )
}