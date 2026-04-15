"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings2, RotateCcw, Trash2, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SimulationPanelProps {
    mode?: "historical" | "forecast"
    onClear: () => void
    onReset: () => void
    onTargetChange: (targets: { A: number; B: number; C: number }) => void
}

export function SimulationPanel({ mode = "historical", onClear, onReset, onTargetChange }: SimulationPanelProps) {
    // 🚀 FIX 1: Set realistic initial defaults so the UI matches the engine's math on load!
    const [inputs, setInputs] = useState({ A: "21", B: "15", C: "15" })

    const isForecast = mode === "forecast"

    // 🚀 FIX 1B: Fire the initial targets to the parent once on mount
    useEffect(() => {
        onTargetChange({ A: 21, B: 15, C: 15 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const updateTarget = (cls: "A" | "B" | "C", value: string) => {
        // 🚀 FIX 2: Block negative numbers alongside the NaN check
        if (value !== "" && (isNaN(Number(value)) || Number(value) < 0)) return

        const newInputs = { ...inputs, [cls]: value }
        setInputs(newInputs)

        onTargetChange({
            A: newInputs.A === "" ? 0 : parseFloat(newInputs.A),
            B: newInputs.B === "" ? 0 : parseFloat(newInputs.B),
            C: newInputs.C === "" ? 0 : parseFloat(newInputs.C),
        })
    }

    const handleClear = () => onClear()
    const handleReset = () => onReset()

    return (
        <TooltipProvider>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 py-4 px-4 sm:px-6 bg-white/50 dark:bg-slate-900/20 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 transition-all shadow-sm backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6 flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-slate-500 min-w-0">
                        <div
                            className={cn(
                                "p-2.5 rounded-2xl shadow-lg shrink-0",
                                isForecast ? "bg-emerald-600 shadow-emerald-500/20" : "bg-blue-600 shadow-blue-500/20"
                            )}
                        >
                            <Settings2 className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none text-slate-900 dark:text-slate-200 truncate">
                                  Simulation Engine
                                </span>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="outline-none cursor-help shrink-0">
                                            <Info className="w-3 h-3 text-slate-400" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-[10px] font-bold uppercase tracking-tight bg-slate-900 text-white border-none p-3 shadow-2xl">
                                        Adjust target days per ABC class. This dynamically calculates Required Inventory and Suggested Order
                                        Quantities based on Daily Usage.
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <span
                                className={cn(
                                    "text-[9px] font-bold uppercase mt-1",
                                    isForecast ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-500"
                                )}
                            >
                                Target DTL (Days to Last)
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl">
                        {(["A", "B", "C"] as const).map((cls) => (
                            <div
                                key={cls}
                                className={cn(
                                    "flex items-center gap-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-[1.5rem] shadow-sm transition-all group",
                                    isForecast
                                        ? "hover:border-emerald-500/30 focus-within:ring-2 focus-within:ring-emerald-500/10"
                                        : "hover:border-blue-500/30 focus-within:ring-2 focus-within:ring-blue-500/10"
                                )}
                            >
                                <span
                                    className={cn(
                                        "text-[11px] font-black w-8 h-8 flex items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110",
                                        cls === "A" ? "bg-red-500" : cls === "B" ? "bg-purple-600" : "bg-slate-500"
                                    )}
                                >
                                  {cls}
                                </span>

                                <div className="flex items-center gap-2 border-l pl-4 border-slate-100 dark:border-slate-800 flex-1">
                                    <Input
                                        type="number"
                                        value={inputs[cls]}
                                        placeholder="0"
                                        onChange={(e) => updateTarget(cls, e.target.value)}
                                        className={cn(
                                            "w-full h-8 border-none p-0 text-center font-black text-sm bg-transparent focus-visible:ring-0",
                                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                            "text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                        )}
                                    />

                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter shrink-0">
                                        Days
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Buttons: responsive stack */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <Button
                        onClick={handleClear}
                        variant="ghost"
                        className="w-full sm:w-auto rounded-2xl gap-2 font-black uppercase text-[10px] tracking-widest h-12 sm:h-14 px-6 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                        <Trash2 className="w-4 h-4" /> Clear All
                    </Button>

                    <Button
                        onClick={handleReset}
                        variant="outline"
                        className={cn(
                            "w-full sm:w-auto rounded-2xl gap-2 font-black uppercase text-[10px] tracking-widest h-12 sm:h-14 px-8 transition-all shadow-sm active:scale-95",
                            "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100",
                            "border-slate-200 dark:border-slate-800",
                            isForecast
                                ? "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20"
                                : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20"
                        )}
                    >
                        <RotateCcw className="w-4 h-4" /> Reset Suggested
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    )
}