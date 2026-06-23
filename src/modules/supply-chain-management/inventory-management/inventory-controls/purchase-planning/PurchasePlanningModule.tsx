"use client"

import {useState, useRef, useEffect} from "react"
import {Database, AlertTriangle, TrendingUp, History} from "lucide-react"
import {cn} from "@/lib/utils"

import {PlanningToolbar} from "./components/planning-toolbar"
import {SimulationPanel} from "./components/simulation-panel"
import {PlanningContainer, type PlanningContainerHandle} from "./components/planning-container"
import {PlanningFooter} from "./components/planning-footer"
import {InTransitModal} from "./components/in-transit-modal"
import {ProductTrendModal} from "./components/product-trend-modal"
import {PlanningRow, PendingSelection, SimulationTargets, PurchaseOrder} from "./types"
import {useCallback} from "react"



export function PurchasePlanningModule() {
    // --- UI STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [dataLoaded, setDataLoaded] = useState(false)
    const [isTableLoading, setIsTableLoading] = useState(false)
    const [viewMode, setViewMode] = useState<"historical" | "forecast">("historical")
    const [planningData, setPlanningData] = useState<PlanningRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loadProgress, setLoadProgress] = useState(0)
    const [loadingStage, setLoadingStage] = useState("")
    const [targets, setTargets] = useState<SimulationTargets>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("vos_planning_targets")
            if (saved) {
                try { return JSON.parse(saved) } catch {}
            }
        }
        return {A: 21, B: 15, C: 15}
    })
    const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("vos_planning_selection")
            if (saved) {
                try { return JSON.parse(saved) } catch {}
            }
        }
        return null
    })

    // 🚀 NEW: Source of truth for selected branches (shared between Header & Footer)
    const [activeBranches, setActiveBranches] = useState<string[]>([])
    const [filteredPlanningData, setFilteredPlanningData] = useState<PlanningRow[]>([])

    // Trend Visualizer Modal State
    const [trendProduct, setTrendProduct] = useState<PlanningRow | null>(null)
    const [isTrendOpen, setIsTrendOpen] = useState(false)

    const tableRef = useRef<PlanningContainerHandle>(null)

    // Sync state changes to localStorage
    useEffect(() => {
        if (dataLoaded) {
            localStorage.setItem("vos_planning_targets", JSON.stringify(targets))
        }
    }, [targets, dataLoaded])

    useEffect(() => {
        if (pendingSelection) {
            localStorage.setItem("vos_planning_selection", JSON.stringify(pendingSelection))
        }
    }, [pendingSelection])

    const handleFilteredDataChange = useCallback((data: PlanningRow[]) => {
        setFilteredPlanningData(data)
    }, [])

    const handleShowTrend = useCallback((row: PlanningRow) => {
        setTrendProduct(row)
        setIsTrendOpen(true)
    }, [])

    // 🚀 UNIVERSAL DYNAMIC HYDRATION ENGINE
    const applySimulationMath = useCallback((rawData: PlanningRow[], currentTargets: SimulationTargets, mode: string, monthsCount: number) => {
        return rawData.map((row) => {
            const targetDays = currentTargets[row.abcClass?.toUpperCase() as keyof SimulationTargets] || 15;

            let dau = 0;
            let expectedSellout = 0;

            if (mode === "forecast") {
                const forecastValues = Object.values(row.monthlyForecast || {});
                const totalForecastBoxes = forecastValues.reduce((sum: number, val: number) => sum + Number(val), 0);
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
    }, []);

    useEffect(() => {
        if (dataLoaded && planningData.length > 0 && pendingSelection) {
            const monthsCount = pendingSelection.months?.length || 3;
            setPlanningData((prevData) => applySimulationMath(prevData, targets, viewMode, monthsCount));
        }
    }, [targets, dataLoaded, planningData.length, pendingSelection, viewMode, applySimulationMath]);

    // ⌨ GLOBAL KEYBOARD SHORTCUTS FOR MOUSE-FREE UX
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.altKey) {
                const key = e.key.toLowerCase();
                if (key === "s") {
                    e.preventDefault();
                    document.getElementById("supplier-trigger")?.click();
                } else if (key === "b") {
                    e.preventDefault();
                    document.getElementById("branch-trigger")?.click();
                } else if (key === "f") {
                    e.preventDefault();
                    const searchInput = document.getElementById("table-search-input") as HTMLInputElement | null;
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                } else if (key === "1" || key === "a") {
                    e.preventDefault();
                    const inp = document.getElementById("target-input-A") as HTMLInputElement | null;
                    if (inp) {
                        inp.focus();
                        inp.select();
                    }
                } else if (key === "2" || key === "k") {
                    e.preventDefault();
                    const inp = document.getElementById("target-input-B") as HTMLInputElement | null;
                    if (inp) {
                        inp.focus();
                        inp.select();
                    }
                } else if (key === "3" || key === "c") {
                    e.preventDefault();
                    const inp = document.getElementById("target-input-C") as HTMLInputElement | null;
                    if (inp) {
                        inp.focus();
                        inp.select();
                    }
                } else if (key === "g") {
                    e.preventDefault();
                    document.getElementById("generate-pr-btn")?.click();
                } else if (key === "d") {
                    e.preventDefault();
                    document.getElementById("download-pdf-btn")?.click();
                } else if (key === "u") {
                    e.preventDefault();
                    document.getElementById("autofill-suggested-btn")?.click();
                }
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, []);

    const handleInitialLoad = (months: string[], mode: "historical" | "forecast", year: string, supplierId: string, selectedBranches: string[]) => {
        setPendingSelection({months, mode, year, supplierId, selectedBranches})
        // 🚀 Sync branch state on initial load trigger
        setActiveBranches(selectedBranches)
        setIsModalOpen(true)
    }

    const handleConfirmLoad = async (selectedPOs: PurchaseOrder[] = []) => {
        if (!pendingSelection) return
        setIsModalOpen(false)
        setIsTableLoading(true)
        setLoadProgress(0)
        setError(null)
        setLoadingStage("Initiating request...")

        try {
            const poIds: number[] = selectedPOs.map(po => parseInt(po.id, 10))
            const supplierIdNum = parseInt(pendingSelection.supplierId, 10)
            const branchIdsNum: number[] = (pendingSelection.selectedBranches || []).map((id: string) => parseInt(id, 10))
            const selectedYearNum = parseInt(pendingSelection?.year || "", 10) || new Date().getFullYear()

            const mappedMonths: number[] = (pendingSelection?.months || []).map((m: string): number => {
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

            const queryParams = new URLSearchParams()
            queryParams.set("supplierId", String(supplierIdNum))
            queryParams.set("mode", pendingSelection.mode || "historical")
            queryParams.set("selectedYear", String(selectedYearNum))

            branchIdsNum.forEach(id => queryParams.append("branchIds", String(id)))
            poIds.forEach(id => queryParams.append("inTransitPoIds", String(id)))
            uniqueMappedMonths.forEach(m => queryParams.append("selectedMonths", String(m)))

            const response = await fetch(
                `/api/scm/inventory-management/inventory-controls/load-planning/stream?${queryParams.toString()}`
            )

            if (!response.ok) {
                const errText = await response.text().catch(() => "Unknown stream initialization error")
                throw new Error(errText || `Failed to start load stream (Status: ${response.status})`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error("Response body is not a readable stream")
            }

            const decoder = new TextDecoder()
            let buffer = ""
            let rawData: PlanningRow[] = []
            let streamFinished = false
            let currentEvent = ""

            while (!streamFinished) {
                const { value, done } = await reader.read()
                if (done) {
                    streamFinished = true
                    break
                }

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed) continue

                    if (trimmed.startsWith("event:")) {
                        currentEvent = trimmed.substring(6).trim()
                    } else if (trimmed.startsWith("data:")) {
                        const dataStr = trimmed.substring(5).trim()
                        try {
                            const parsed = JSON.parse(dataStr)
                            if (currentEvent === "progress") {
                                if (typeof parsed.percent === "number") {
                                    setLoadProgress(parsed.percent)
                                }
                                if (parsed.stage) {
                                    setLoadingStage(parsed.stage)
                                }
                            } else if (currentEvent === "complete") {
                                rawData = parsed as PlanningRow[]
                            } else if (currentEvent === "error") {
                                throw new Error(parsed.message || "Server reported streaming error")
                            }
                        } catch (e) {
                            console.error("Error parsing event data:", e, "Line was:", line)
                        }
                    }
                }
            }

            const finalData = applySimulationMath(rawData, targets, pendingSelection?.mode || "historical", monthsCount);

            setLoadProgress(100)
            setLoadingStage("Data hydration complete! Rendering grid...")
            await new Promise((resolve) => setTimeout(resolve, 400))

            setPlanningData(finalData)
            setViewMode(pendingSelection?.mode || "historical")
            setDataLoaded(true)

        } catch (err: unknown) {
            console.error("❌ Failed to load planning dashboard:", err)
            const message = err instanceof Error ? err.message : "Failed to synthesize market intelligence."
            setError(message)
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
        setPlanningData((prev) => prev.map((row) => {
            const suggested = row.suggestedQty || 0;
            return {
                ...row,
                isManual: false,
                orderQty: suggested,
                totalValue: suggested * (row.computedPricePerBox || 0)
            }
        }))
    }

    const handleAutofillSuggested = () => {
        setPlanningData((prev) => prev.map((row) => {
            const suggested = row.suggestedQty || 0;
            return {
                ...row,
                orderQty: suggested,
                totalValue: suggested * (row.computedPricePerBox || 0)
            }
        }))
    }

    const loadingScreen = (
        <div className="flex flex-col items-center max-w-sm w-full px-6 text-center space-y-6">
            {/* Glowing Ring Progress Indicator */}
            <div className="relative flex items-center justify-center w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r="38"
                        className="stroke-slate-200 dark:stroke-slate-800"
                        strokeWidth="6"
                        fill="transparent"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r="38"
                        className={cn(
                            "transition-all duration-300 ease-out",
                            pendingSelection?.mode === "forecast" ? "stroke-emerald-600 dark:stroke-emerald-400" : "stroke-blue-600 dark:stroke-blue-400"
                        )}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - loadProgress / 100)}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-slate-800 dark:text-white">
                        {loadProgress}%
                    </span>
                </div>
            </div>

            {/* Stage text & indicator */}
            <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Database Synthesis
                </h3>
                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 min-h-[16px] transition-all duration-300">
                    {loadingStage}
                </p>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div
                    className={cn(
                        "h-full transition-all duration-300 ease-out rounded-full",
                        pendingSelection?.mode === "forecast"
                            ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    )}
                    style={{ width: `${loadProgress}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-40 transition-colors duration-500">
            <header
                className={cn(
                    "px-4 sm:px-6 py-4 text-white shadow-md relative transition-all duration-500 overflow-hidden",
                    !dataLoaded ? "bg-slate-900" : viewMode === "forecast" ? "bg-emerald-950" : "bg-blue-950"
                )}
            >
                <div className="w-full mx-auto flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="p-1.5 bg-white/10 backdrop-blur-sm rounded border border-white/20 shrink-0">
                            {viewMode === "forecast" ? <TrendingUp className="w-5 h-5 text-emerald-200"/> :
                                <History className="w-5 h-5 text-blue-200"/>}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-black uppercase tracking-wider truncate">
                                Purchase Planning
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="w-full mx-auto px-4 sm:px-6 -mt-2 space-y-3 relative z-20">
                {/* Keyboard Shortcuts Legend HUD */}
                <div className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-md p-1.5 border border-slate-200 dark:border-slate-800/40 shadow-sm flex flex-col md:flex-row gap-2 items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">Alt</kbd>
                        <span>+ Shortcuts</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">S</kbd> Supplier</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">B</kbd> Branches</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">F</kbd> Search</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">1-3</kbd> DTL</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">U</kbd> Autofill</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">G</kbd> Generate PR</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">D</kbd> PDF</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[8px]">↑/↓</kbd> Navigation</span>
                    </div>
                </div>

                <section
                    className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-lg p-1 shadow-md border border-slate-200 dark:border-slate-800 transition-all">
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
                    <div className="space-y-3 animate-in fade-in duration-300">
                        <SimulationPanel
                            mode={viewMode}
                            targets={targets}
                            onTargetChange={setTargets}
                            onClear={handleClearAllOrders}
                            onReset={handleResetSuggested}
                            onAutofill={handleAutofillSuggested}
                        />

                        <div
                            className="bg-white dark:bg-slate-900 rounded-lg border shadow-lg overflow-hidden relative min-h-[450px]">
                            {isTableLoading && (
                                <div
                                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
                                    {loadingScreen}
                                </div>
                            )}
                            <PlanningContainer
                                ref={tableRef}
                                mode={viewMode}
                                data={planningData}
                                simulationTargets={targets}
                                selectedMonths={pendingSelection?.months || []}
                                onQuantityChange={handleQuantityChange}
                                onFilteredDataChange={handleFilteredDataChange}
                                onShowTrend={handleShowTrend}
                            />
                        </div>

                        {/* 🚀 Footer now receives the filtered dataset from Parent State */}
                        <PlanningFooter
                            data={filteredPlanningData.length > 0 || planningData.length === 0 ? filteredPlanningData : planningData}
                            supplierId={pendingSelection?.supplierId || ""}
                            branchIds={activeBranches}
                            mode={viewMode}
                        />
                    </div>
                ) : (
                    <div
                        className="h-[350px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-white/20 border-slate-200 dark:border-slate-800 relative overflow-hidden">
                        {isTableLoading ? (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
                                {loadingScreen}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center">
                                <Database className="w-8 h-8 text-slate-300 mb-3"/>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest text-center">Select Supplier to Load Data</h3>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <InTransitModal open={isModalOpen} setOpen={setIsModalOpen} onConfirm={handleConfirmLoad}
                            supplierId={pendingSelection?.supplierId || null}/>

            <ProductTrendModal
                isOpen={isTrendOpen}
                onClose={() => setIsTrendOpen(false)}
                product={trendProduct}
            />
        </div>
    )
}