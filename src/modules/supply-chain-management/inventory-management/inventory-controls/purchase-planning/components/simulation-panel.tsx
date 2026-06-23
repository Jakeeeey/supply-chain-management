"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings2, RotateCcw, Trash2, Info, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SimulationPanelProps {
    mode?: "historical" | "forecast"
    targets: { A: number; B: number; C: number }
    onClear: () => void
    onReset: () => void
    onAutofill: () => void
    onTargetChange: (targets: { A: number; B: number; C: number }) => void
}

export function SimulationPanel({ mode = "historical", targets, onClear, onReset, onAutofill, onTargetChange }: SimulationPanelProps) {
    const [inputs, setInputs] = useState({
        A: String(targets?.A ?? 21),
        B: String(targets?.B ?? 15),
        C: String(targets?.C ?? 15)
    })

    const isForecast = mode === "forecast"

    const [prevTargets, setPrevTargets] = useState(targets)

    if (targets.A !== prevTargets.A || targets.B !== prevTargets.B || targets.C !== prevTargets.C) {
        setPrevTargets(targets)
        setInputs({
            A: String(targets?.A ?? 21),
            B: String(targets?.B ?? 15),
            C: String(targets?.C ?? 15)
        })
    }

    const updateTarget = (cls: "A" | "B" | "C", value: string) => {
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
    const handleAutofill = () => onAutofill()

    return (
        <TooltipProvider>
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 py-1.5 px-3 bg-white/50 dark:bg-slate-900/20 rounded-lg border border-slate-200/60 dark:border-slate-800/60 transition-all shadow-sm backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-slate-500 shrink-0">
                        <div
                            className={cn(
                                "p-1.5 rounded-lg shadow shrink-0",
                                isForecast ? "bg-emerald-600" : "bg-blue-600"
                            )}
                        >
                            <Settings2 className="w-4 h-4 text-white" />
                        </div>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-wider leading-none text-slate-900 dark:text-slate-200 truncate">
                                  Simulation
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
                                    "text-[8px] font-bold uppercase mt-0.5",
                                    isForecast ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-500"
                                )}
                            >
                                Target DTL
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-2 flex-wrap">
                        {(["A", "B", "C"] as const).map((cls) => (
                            <div
                                key={cls}
                                className={cn(
                                    "flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 h-8 rounded-md shadow-sm transition-all group",
                                    isForecast
                                        ? "hover:border-emerald-500/30 focus-within:ring-1 focus-within:ring-emerald-500/10"
                                        : "hover:border-blue-500/30 focus-within:ring-1 focus-within:ring-blue-500/10"
                                )}
                            >
                                <span
                                    className={cn(
                                        "text-[9px] font-black w-5 h-5 flex items-center justify-center rounded text-white shadow-sm transition-transform group-hover:scale-105",
                                        cls === "A" ? "bg-red-500" : cls === "B" ? "bg-purple-600" : "bg-slate-500"
                                    )}
                                >
                                  {cls}
                                </span>

                                <div className="flex items-center gap-1 pl-1 flex-1">
                                    <Input
                                        type="number"
                                        id={`target-input-${cls}`}
                                        value={inputs[cls]}
                                        placeholder="0"
                                        onChange={(e) => updateTarget(cls, e.target.value)}
                                        className={cn(
                                            "w-8 h-6 border-none p-0 text-center font-black text-xs bg-transparent focus-visible:ring-0",
                                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                            "text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                        )}
                                    />

                                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter shrink-0">
                                        Days
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Buttons: horizontal strip */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 flex-wrap">
                    <Button
                        onClick={handleClear}
                        variant="ghost"
                        className="rounded-md gap-1 font-black uppercase text-[9px] tracking-widest h-8 px-2.5 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                    </Button>

                    <Button
                        id="autofill-suggested-btn"
                        onClick={handleAutofill}
                        variant="outline"
                        className={cn(
                            "rounded-md gap-1 font-black uppercase text-[9px] tracking-widest h-8 px-3 transition-all shadow-sm active:scale-95",
                            "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100",
                            "border-slate-200 dark:border-slate-800",
                            isForecast
                                ? "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 hover:border-emerald-500/30"
                                : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 hover:border-blue-500/30"
                        )}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Autofill suggestions
                    </Button>

                    <Button
                        onClick={handleReset}
                        variant="outline"
                        className={cn(
                            "rounded-md gap-1 font-black uppercase text-[9px] tracking-widest h-8 px-3 transition-all shadow-sm active:scale-95",
                            "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100",
                            "border-slate-200 dark:border-slate-800",
                            isForecast
                                ? "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20"
                                : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20"
                        )}
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Suggested
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    )
}