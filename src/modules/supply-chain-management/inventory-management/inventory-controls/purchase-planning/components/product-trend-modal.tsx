"use client"

import React from "react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogHeader,
} from "@/components/ui/dialog"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as ChartTooltip,
    CartesianGrid,
    Cell,
} from "recharts"
import { PlanningRow } from "../types"
import { BarChart3, Info } from "lucide-react"

interface ProductTrendModalProps {
    isOpen: boolean
    onClose: () => void
    product: PlanningRow | null
}

export function ProductTrendModal({ isOpen, onClose, product }: ProductTrendModalProps) {
    if (!product) return null

    // Extract metrics
    const soh = Number(product.currentStockBoxes || 0)
    const transit = Number(product.inTransitBoxes || 0)
    const suggested = Number(product.suggestedQty || 0)
    const order = Number(product.orderQty || 0)
    const targetStock = Number(product.reqInv || 0)
    const mav = Number(product.mav || 0)

    // Prepare chart data
    const data = [
        { name: "Current Stock", value: parseFloat(soh.toFixed(1)), fill: "#3b82f6" },
        { name: "In Transit", value: parseFloat(transit.toFixed(1)), fill: "#6366f1" },
        { name: "Suggested Qty", value: parseFloat(suggested.toFixed(1)), fill: "#10b981" },
        { name: "Required Inv", value: parseFloat(targetStock.toFixed(1)), fill: "#f59e0b" },
        { name: "Order Qty", value: parseFloat(order.toFixed(1)), fill: "#2563eb" },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl rounded-[2rem] border-none shadow-2xl bg-white dark:bg-slate-950 p-6">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 text-left">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight truncate">
                                {product.productName || product.product_name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                SKU: {product.sku} • ABC Class: {product.abcClass}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Monthly Average</span>
                        <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{mav.toFixed(1)} <span className="text-xs font-bold">Boxes</span></p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Required Boxes</span>
                        <p className="text-xl font-black text-amber-600 mt-1">{targetStock.toFixed(1)} <span className="text-xs font-bold">Boxes</span></p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Daily Average (DAU)</span>
                        <p className="text-xl font-black text-emerald-600 mt-1">{(mav / 21).toFixed(2)} <span className="text-xs font-bold">Boxes</span></p>
                    </div>
                </div>

                {/* Recharts Container */}
                <div className="h-64 w-full bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                fontStyle="bold"
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                fontStyle="bold"
                            />
                            <ChartTooltip
                                cursor={{ fill: "rgba(148, 163, 184, 0.05)", radius: 10 }}
                                contentStyle={{
                                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                                    border: "none",
                                    borderRadius: "12px",
                                    color: "#fff",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase"
                                }}
                            />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={40}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex gap-2 items-center text-[10px] font-black text-slate-500 uppercase tracking-widest justify-center mt-4">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    <span>Calculations are refreshed dynamically based on simulation targets.</span>
                </div>
            </DialogContent>
        </Dialog>
    )
}
