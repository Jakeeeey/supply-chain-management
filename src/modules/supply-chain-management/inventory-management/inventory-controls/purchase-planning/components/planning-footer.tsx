"use client"

import {useState, useMemo} from "react"
import {Button} from "@/components/ui/button"
import {Calculator, TrendingUp, History, Download} from "lucide-react"
import {cn} from "@/lib/utils"
import {PurchaseRequestSuccessModal} from "./purchase-request-success-modal"
import {PlanningRow} from "../types"

// jsPDF and autoTable
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface PlanningFooterProps {
    data: PlanningRow[]
    supplierId: string
    branchIds: string[]
    mode?: "historical" | "forecast"
}

interface JsPDFWithAutoTable extends jsPDF {
    lastAutoTable: {
        finalY: number;
    };
}

// 💰 Helper function for professional currency formatting
const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PlanningFooter({
                                   data = [],
                                   supplierId = "",
                                   branchIds = [],
                                   mode = "historical",
                               }: PlanningFooterProps) {
    const [showSuccess, setShowSuccess] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const isForecast = mode === "forecast"

    // 🧮 Aggregate Stats from Table Data
    const stats = useMemo(() => {
        const safeData = Array.isArray(data) ? data : []
        let totalOrderValue = 0
        let totalSuggestedValue = 0
        let totalMavValue = 0
        let totalInventoryValue = 0

        let totalOrderQty = 0
        let totalInventoryBoxes = 0
        let totalAValue = 0, totalAQty = 0
        let totalBValue = 0, totalBQty = 0
        let totalCValue = 0, totalCQty = 0

        safeData.forEach((row: PlanningRow) => {
            const pricePerBox = Number(row.computedPricePerBox || 0)
            const orderQty = Number(row.orderQty || 0)
            const suggestedQty = Number(row.suggestedQty || 0)
            const mavQty = Number(row.mav || 0)
            const sohQty = Number(row.currentStockBoxes || 0)
            const abcClass = row.abcClass || "C"

            const rowOrderValue = orderQty * pricePerBox

            totalOrderQty += orderQty
            totalInventoryBoxes += sohQty

            totalOrderValue += rowOrderValue
            totalSuggestedValue += (suggestedQty * pricePerBox)
            totalMavValue += (mavQty * pricePerBox)
            totalInventoryValue += (sohQty * pricePerBox)

            if (abcClass === "A") {
                totalAValue += rowOrderValue
                totalAQty += orderQty
            } else if (abcClass === "B") {
                totalBValue += rowOrderValue
                totalBQty += orderQty
            } else {
                totalCValue += rowOrderValue
                totalCQty += orderQty
            }
        })

        const itemsToOrder = safeData.filter((row) => Number(row.orderQty || 0) > 0)

        return {
            totalSkus: safeData.length,
            totalOrderQty,
            totalInventoryBoxes,
            totalSuggestedValue,
            totalMavValue,
            totalInventoryValue,
            grandTotalOrderValue: totalOrderValue,
            totalAValue, totalAQty,
            totalBValue, totalBQty,
            totalCValue, totalCQty,
            itemsToOrder,
        }
    }, [data])

    // 📄 PDF Generation Logic
    const generatePDF = () => {
        setIsExporting(true)
        try {
            const doc = new jsPDF()
            doc.setFontSize(18)
            doc.setTextColor(15, 23, 42)
            doc.text("Purchase Planning Report", 14, 22)

            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139)
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
            doc.text(`Supplier ID: ${supplierId || "N/A"}`, 14, 36)
            doc.text(`Logic Mode: ${isForecast ? "Forecast" : "Historical"}`, 14, 42)

            const tableColumns = ["SKU", "Product Name", "ABC", "SOH", "MAV", "Suggested", "Order Qty", "Total Value"]
            const tableRows = (data as PlanningRow[]).map((row: PlanningRow) => {
                const price = Number(row.computedPricePerBox || 0)
                const orderQty = Number(row.orderQty || 0)
                const rowTotal = price * orderQty
                return [
                    row.sku || "N/A",
                    row.productName || "Unknown Product",
                    row.abcClass || "-",
                    Number(row.currentStockBoxes || 0).toFixed(1),
                    Number(row.mav || 0).toFixed(1),
                    row.suggestedQty || 0,
                    orderQty,
                    `P${formatCurrency(rowTotal)}`
                ]
            })

            autoTable(doc, {
                startY: 50,
                head: [tableColumns],
                body: tableRows,
                theme: 'striped',
                headStyles: {fillColor: [15, 23, 42], textColor: 255},
                styles: {fontSize: 8, cellPadding: 3},
                columnStyles: { 6: {fontStyle: 'bold', textColor: [15, 23, 42]}, 7: {halign: 'right'} }
            })

            const finalY = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY || 50

            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139)
            doc.text(`Total SKUs Evaluated: ${stats.totalSkus}`, 14, finalY + 12)
            doc.text(`Total Order Quantity: ${stats.totalOrderQty.toLocaleString()} Boxes`, 14, finalY + 18)
            doc.text(`Total Inventory Value: P${formatCurrency(stats.totalInventoryValue)}`, 14, finalY + 24)
            doc.text(`Total Inventory Boxes: ${stats.totalInventoryBoxes.toLocaleString()} Boxes`, 14, finalY + 30)

            doc.text(`Class A: ${stats.totalAQty.toLocaleString()} Boxes | P${formatCurrency(stats.totalAValue)}`, 120, finalY + 12)
            doc.text(`Class B: ${stats.totalBQty.toLocaleString()} Boxes | P${formatCurrency(stats.totalBValue)}`, 120, finalY + 18)
            doc.text(`Class C: ${stats.totalCQty.toLocaleString()} Boxes | P${formatCurrency(stats.totalCValue)}`, 120, finalY + 24)

            doc.setFontSize(14)
            doc.setTextColor(15, 23, 42)
            doc.text(`Grand Total Order: P${formatCurrency(stats.grandTotalOrderValue)}`, 14, finalY + 42)

            doc.save(`Planning_Report_${supplierId}_${new Date().getTime()}.pdf`)
        } catch (error) {
            console.error("Failed to generate PDF:", error)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] animate-in fade-in slide-in-from-bottom-8 duration-500 print:hidden">
            <div className="w-full bg-[#0a0f1c]/95 backdrop-blur-2xl border-t border-slate-800/60 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] px-6 py-4">
                <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-6">

                    {/* 📊 LEFT: Metadata & SKUs */}
                    <div className="flex items-center gap-6 shrink-0">
                        {/* Logic Mode Badge */}
                        <div className={cn(
                            "flex flex-col items-center justify-center w-16 h-16 rounded-2xl border bg-slate-900/50 shadow-inner",
                            isForecast ? "border-emerald-500/30 text-emerald-400" : "border-blue-500/30 text-blue-400"
                        )}>
                            {isForecast ? <TrendingUp className="w-6 h-6 mb-1"/> : <History className="w-6 h-6 mb-1"/>}
                            <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                                {isForecast ? "Forecast" : "History"}
                            </span>
                        </div>

                        {/* Counts */}
                        <div className="flex flex-col gap-1 pr-6 border-r border-slate-800">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white tabular-nums leading-none tracking-tight">
                                    {stats.totalSkus}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SKUs</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-slate-300 tabular-nums leading-none">
                                    {stats.totalOrderQty.toLocaleString()}
                                </span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Boxes</span>
                            </div>
                        </div>
                    </div>

                    {/* 💸 MIDDLE: Financial Insights */}
                    <div className="hidden lg:flex items-center gap-8 xl:gap-12 flex-1">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Inventory Value
                            </p>
                            <p className="text-lg font-black text-white tabular-nums leading-none">
                                <span className="text-slate-500 pr-0.5 text-sm font-bold">₱</span>{formatCurrency(stats.totalInventoryValue)}
                            </p>
                            <p className="text-[10px] font-medium text-slate-400 tabular-nums">
                                {stats.totalInventoryBoxes.toLocaleString(undefined, {maximumFractionDigits: 1})} Boxes
                            </p>
                        </div>

                        <div className="space-y-1.5 pl-8 xl:pl-12 border-l border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Suggested</p>
                            <p className="text-lg font-black text-white tabular-nums leading-none">
                                <span className="text-slate-500 pr-0.5 text-sm font-bold">₱</span>{formatCurrency(stats.totalSuggestedValue)}
                            </p>
                            <div className="h-3"></div> {/* Spacer to match Inventory Boxes text */}
                        </div>

                        <div className="space-y-1.5 pl-8 xl:pl-12 border-l border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MAV Value</p>
                            <p className="text-lg font-black text-white tabular-nums leading-none">
                                <span className="text-slate-500 pr-0.5 text-sm font-bold">₱</span>{formatCurrency(stats.totalMavValue)}
                            </p>
                            <div className="h-3"></div> {/* Spacer */}
                        </div>
                    </div>

                    {/* 🎯 RIGHT: ABC Totals, Grand Total & Actions */}
                    <div className="flex items-center justify-between xl:justify-end gap-6 w-full xl:w-auto shrink-0">

                        {/* 🚀 FIXED: Strict Grid ABC Breakdown (Now visible on laptops) */}
                        <div className="hidden lg:grid grid-cols-[auto_auto_auto] gap-x-4 xl:gap-x-6 gap-y-1.5 border-l border-slate-800 pl-6 xl:pl-8 pr-4 items-center text-[10px] xl:text-[11px]">
                            {/* Class A */}
                            <span className="text-emerald-400 font-black uppercase tracking-wider">A-Class</span>
                            <span className="text-slate-400 font-medium tabular-nums text-right">{stats.totalAQty.toLocaleString()} bx</span>
                            <span className="text-slate-200 font-bold tabular-nums text-right"><span className="text-slate-600 pr-0.5 font-normal">₱</span>{formatCurrency(stats.totalAValue)}</span>

                            {/* Class B */}
                            <span className="text-blue-400 font-black uppercase tracking-wider">B-Class</span>
                            <span className="text-slate-400 font-medium tabular-nums text-right">{stats.totalBQty.toLocaleString()} bx</span>
                            <span className="text-slate-200 font-bold tabular-nums text-right"><span className="text-slate-600 pr-0.5 font-normal">₱</span>{formatCurrency(stats.totalBValue)}</span>

                            {/* Class C */}
                            <span className="text-amber-500 font-black uppercase tracking-wider">C-Class</span>
                            <span className="text-slate-400 font-medium tabular-nums text-right">{stats.totalCQty.toLocaleString()} bx</span>
                            <span className="text-slate-200 font-bold tabular-nums text-right"><span className="text-slate-600 pr-0.5 font-normal">₱</span>{formatCurrency(stats.totalCValue)}</span>
                        </div>

                        {/* Grand Total */}
                        <div className="flex flex-col items-end border-l border-slate-800 pl-6 xl:pl-8">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Grand Total Order</span>
                            <span className="text-3xl sm:text-4xl font-black text-white tabular-nums leading-none tracking-tight">
                                <span className="text-slate-500 pr-1 text-2xl font-bold">₱</span>{formatCurrency(stats.grandTotalOrderValue)}
                            </span>
                        </div>

                        {/* Buttons Group */}
                        <div className="flex items-center gap-3 ml-2">
                            <Button
                                variant="outline"
                                onClick={generatePDF}
                                disabled={isExporting || stats.totalSkus === 0}
                                className="h-14 px-4 rounded-xl border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                <span className="hidden sm:inline-block ml-2 text-xs font-bold uppercase tracking-wider">
                                    {isExporting ? "..." : "PDF"}
                                </span>
                            </Button>

                            <Button
                                onClick={() => setShowSuccess(true)}
                                disabled={stats.grandTotalOrderValue === 0}
                                className={cn(
                                    "h-14 px-6 sm:px-8 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex gap-3 shadow-xl",
                                    isForecast
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20",
                                    "disabled:opacity-30 disabled:grayscale"
                                )}
                            >
                                <Calculator className="w-5 h-5" />
                                <span className="hidden sm:inline-block">Generate PR</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <PurchaseRequestSuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                supplierId={supplierId}
                branchIds={branchIds}
                prNumber="DRAFT"
                items={stats.itemsToOrder.map((item: PlanningRow) => ({
                    product_id: String(item.product_id || item.id),
                    brand: item.brandName || "N/A",
                    product_name: String(item.productName || item.product_name || item.description || "Product"),
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