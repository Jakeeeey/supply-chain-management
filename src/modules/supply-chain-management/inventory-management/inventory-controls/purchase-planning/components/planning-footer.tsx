"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Calculator, Boxes, TrendingUp, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { PurchaseRequestSuccessModal } from "./purchase-request-success-modal"

interface PlanningFooterProps {
    data: any[]
    supplierId: string
    branchIds: string[]
    mode?: "historical" | "forecast"
}

// 🚀 NAMED EXPORT: This is crucial to fix the TS2305 error
export function PlanningFooter({
                                   data = [],
                                   supplierId = "",
                                   branchIds = [],
                                   mode = "historical",
                               }: PlanningFooterProps) {
    const [showSuccess, setShowSuccess] = useState(false)
    const isForecast = mode === "forecast"

    // 🧮 Aggregate Stats from Table Data
    const stats = useMemo(() => {
        const safeData = Array.isArray(data) ? data : []
        let totalOrderValue = 0
        let totalSuggestedValue = 0
        let totalMavValue = 0

        safeData.forEach((row) => {
            const pricePerBox = Number(row.computedPricePerBox || 0)
            const orderQty = Number(row.orderQty || 0)
            const suggestedQty = Number(row.suggestedQty || 0)
            const mavQty = Number(row.mav || 0)

            totalOrderValue += (orderQty * pricePerBox)
            totalSuggestedValue += (suggestedQty * pricePerBox)
            totalMavValue += (mavQty * pricePerBox)
        })

        const itemsToOrder = safeData.filter((row) => Number(row.orderQty || 0) > 0)

        return {
            totalSkus: safeData.length,
            totalSuggestedValue,
            totalMavValue,
            grandTotalOrderValue: totalOrderValue,
            itemsToOrder,
        }
    }, [data])

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-[1600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={cn(
                "px-6 sm:px-10 py-5 rounded-[2.5rem] border shadow-2xl transition-all backdrop-blur-xl",
                "bg-white/90 dark:bg-slate-950/90 border-slate-200 dark:border-slate-800",
                isForecast && "ring-2 ring-emerald-500/20 shadow-emerald-500/10"
            )}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                    {/* LEFT: Mode & SKU Count */}
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.2em] mb-2",
                                isForecast ? "text-emerald-600" : "text-blue-600"
                            )}>
                                {isForecast ? "Forecast Logic" : "Historical Logic"}
                            </span>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    isForecast ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                )}>
                                    {isForecast ? <TrendingUp className="w-4 h-4" /> : <History className="w-4 h-4" />}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {stats.totalSkus}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SKUs</span>
                                </div>
                            </div>
                        </div>

                        {/* MIDDLE: Financial Insights (Desktop Only) */}
                        <div className="hidden lg:flex items-center gap-10 border-l border-slate-200 dark:border-slate-800 pl-10">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suggested</p>
                                <p className="text-sm font-black text-slate-900 dark:text-slate-200">
                                    ₱{stats.totalSuggestedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest text-center">MAV Value</p>
                                <p className="text-sm font-black text-slate-900 dark:text-slate-200">
                                    ₱{stats.totalMavValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Grand Total & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 sm:gap-12">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total Order</span>
                            <span className="text-3xl sm:text-4xl font-black tabular-nums text-slate-900 dark:text-white">
                                ₱{stats.grandTotalOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <Button
                            onClick={() => setShowSuccess(true)}
                            disabled={stats.grandTotalOrderValue === 0}
                            className={cn(
                                "h-16 px-10 rounded-[1.5rem] font-black transition-all flex gap-4 shadow-xl active:scale-95",
                                isForecast
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900",
                                "disabled:opacity-20 disabled:grayscale"
                            )}
                        >
                            <Calculator className="w-6 h-6" />
                            <div className="text-left hidden sm:block">
                                <p className="text-[10px] font-black uppercase leading-none opacity-60 mb-0.5">Finalize</p>
                                <p className="text-sm font-black uppercase tracking-tight">Generate PR</p>
                            </div>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal for Review and Submission */}
            <PurchaseRequestSuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                supplierId={supplierId}
                branchIds={branchIds}
                prNumber="DRAFT"
                items={stats.itemsToOrder.map((item) => ({
                    product_id: item.product_id || item.id,
                    brand: item.brandName || "N/A",
                    product_name: item.productName || item.description || "Product",
                    orderQty: Number(item.orderQty),
                    suggestedOrderBox: Number(item.suggestedQty || 0),
                    lastCost: Number(item.lastCost || 0),
                    boxMultiplier: Number(item.boxMultiplier || 1),
                    total: Number(item.totalValue || 0),
                }))}
            />
        </div>
    )
}