"use client"

import { type MouseEvent as ReactMouseEvent, useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    AlertCircle, ArrowUpDown, CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft,
    ChevronsRight, Filter, History, Layers, SortAsc, SortDesc, Timer, XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {PlanningRow, SimulationTargets} from "../types"

type SortableHeaderProps = {
    title: string
    sortKey: string
    className?: string
    isBlue?: boolean
    hasFilter?: boolean
    filterType?: string
    tooltip?: string
    columnWidths: Record<string, number>
    sortConfig: { key: string; direction: "asc" | "desc" | null }
    setSortConfig: (val: { key: string; direction: "asc" | "desc" | null }) => void
    handleMouseDown: (e: ReactMouseEvent, key: string) => void
    classFilters: string[]
    setClassFilters: React.Dispatch<React.SetStateAction<string[]>>
    categoryFilters: string[]
    setCategoryFilters: React.Dispatch<React.SetStateAction<string[]>>
    uniqueCategories: string[]
    // 🚀 NEW: Sticky Column Props
    isSticky?: boolean
    leftOffset?: number
    isLastSticky?: boolean
}

// Extracted Component
function SortableHeader({
                            title, sortKey, className, isBlue = false, hasFilter = false, filterType = "", tooltip,
                            columnWidths, sortConfig, setSortConfig, handleMouseDown, classFilters, setClassFilters,
                            categoryFilters, setCategoryFilters, uniqueCategories,
                            isSticky = false, leftOffset = 0, isLastSticky = false
                        }: SortableHeaderProps) {
    const isSortable = sortKey !== "abcClass" && sortKey !== "category_name"

    return (
        <TableHead
            className={cn(
                "font-black text-[11px] uppercase group h-14 select-none outline-none ring-0",
                // 🚀 Z-Index Logic: Sticky top+left = 40, Sticky top = 30
                isSticky ? "z-[40]" : "z-[30]",
                isLastSticky ? "border-r-2 border-slate-200 dark:border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.05)]" : "",
                isBlue
                    ? "text-white bg-blue-700 dark:bg-blue-700"
                    : "text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900",
                className
            )}
            style={{
                width: columnWidths[sortKey] || 120,
                minWidth: columnWidths[sortKey] || 120,
                position: "sticky",
                top: 0,
                left: isSticky ? leftOffset : undefined,
            }}
        >
            <div className="flex items-center h-full justify-between w-full">
                <TooltipProvider>
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <button
                                disabled={!isSortable}
                                className={cn(
                                    "flex items-center gap-1.5 flex-1 outline-none transition-all w-full",
                                    isSortable
                                        ? isBlue ? "hover:text-blue-100 cursor-pointer" : "hover:text-slate-900 dark:hover:text-blue-400 cursor-pointer"
                                        : "cursor-default opacity-70 hover:text-inherit dark:hover:text-inherit",
                                    className?.includes("text-right") && "justify-end text-right",
                                    className?.includes("text-center") && "justify-center text-center",
                                )}
                                onClick={() => {
                                    if (!isSortable) return
                                    let newDirection: "asc" | "desc" | null = "asc"
                                    if (sortConfig.key === sortKey) {
                                        if (sortConfig.direction === "asc") newDirection = "desc"
                                        else if (sortConfig.direction === "desc") newDirection = null
                                        else newDirection = "asc"
                                    }
                                    setSortConfig({ key: newDirection ? sortKey : "", direction: newDirection })
                                }}
                            >
                                {title}
                                {isSortable && sortConfig.key === sortKey && sortConfig.direction === "asc" && <SortAsc className="w-3 h-3 text-blue-500" />}
                                {isSortable && sortConfig.key === sortKey && sortConfig.direction === "desc" && <SortDesc className="w-3 h-3 text-blue-500" />}
                                {isSortable && sortConfig.key !== sortKey && <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />}
                            </button>
                        </TooltipTrigger>
                        {tooltip && (
                            <TooltipContent className="bg-slate-900 text-white text-[10px] border-slate-800 shadow-xl px-3 py-2 font-bold uppercase tracking-wider max-w-[200px] text-center">
                                {tooltip}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>

                {hasFilter && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                                <Filter className={cn("w-3 h-3", (filterType === "category" ? categoryFilters.length : classFilters.length) > 0 ? "text-blue-500 opacity-100" : "")} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl z-[100]">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between px-2 py-1 mb-1 border-b dark:border-slate-800">
                                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Filter {title}</span>
                                    <Button variant="ghost" className="h-6 px-2 text-[9px] font-black text-rose-600 uppercase hover:bg-rose-500/10" onClick={() => (filterType === "category" ? setCategoryFilters([]) : setClassFilters([]))}>
                                        Clear
                                    </Button>
                                </div>
                                {filterType === "category" ? (
                                    <div className="max-h-64 overflow-y-auto px-1 custom-scrollbar">
                                        {uniqueCategories.map((cat) => (
                                            <div key={cat} className="flex items-center gap-2 mb-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-md transition-colors">
                                                <Checkbox id={`cat-${cat}`} checked={categoryFilters.includes(cat)} onCheckedChange={() => setCategoryFilters((prev: string[]) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))} />
                                                <label htmlFor={`cat-${cat}`} className="text-[10px] font-bold uppercase truncate cursor-pointer flex-1 leading-none text-slate-800 dark:text-slate-200">{cat}</label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    ["A", "B", "C"].map((cls) => (
                                        <div key={cls} className="flex items-center gap-2 mb-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-md transition-colors">
                                            <Checkbox id={`cls-${cls}`} checked={classFilters.includes(cls)} onCheckedChange={() => setClassFilters((prev: string[]) => (prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]))} />
                                            <label htmlFor={`cls-${cls}`} className="text-[10px] font-bold uppercase cursor-pointer flex-1 leading-none text-slate-800 dark:text-slate-200">Class {cls}</label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                <div
                    onMouseDown={(e) => handleMouseDown(e, sortKey)}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-blue-500/30 transition-colors z-[50]"
                />
            </div>
        </TableHead>
    )
}

// Main Table Component
export default function HistoricalPlanningTable({ data = [], onQuantityChange, simulationTargets = { A: 0, B: 0, C: 0 } }: {
    data: PlanningRow[];
    onQuantityChange: (id: string, qty: number) => void;
    simulationTargets: SimulationTargets;
}) {
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({ key: "abcClass", direction: "asc" })
    const [classFilters, setClassFilters] = useState<string[]>([])
    const [categoryFilters, setCategoryFilters] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    const WORKING_DAYS = 21;

    const enhancedData = useMemo(() => {
        return data.map((item: PlanningRow) => {
            const mav = Number(item.mav || 0);
            const currentStock = Number(item.currentStockBoxes || 0);
            const inTransit = Number(item.inTransitBoxes || 0);
            const sellout = Number(item.expectedSelloutBoxes || 0);
            const orderQty = Number(item.orderQty || 0);
            const boxPrice = Number(item.computedPricePerBox || 0);
            const dau = mav / WORKING_DAYS;
            const targetDays = simulationTargets[item.abcClass as keyof typeof simulationTargets] || 0;
            const requiredInv = dau * targetDays;
            const projected = (currentStock + inTransit) - sellout;
            const suggested = Math.max(0, requiredInv - (currentStock + inTransit - sellout));

            let status = "OK";
            if (projected < (requiredInv * 0.5)) status = "BELOW ROP";
            else if (projected < requiredInv) status = "NEAR ROP";

            return {
                ...item,
                category_name: item.category_name || "OTHERS",
                sku: String(item.sku || "").trim(),
                dailyUsage: dau,
                targetStock: requiredInv,
                projectedStockBoxes: projected,
                suggestedQty: suggested,
                totalAmount: orderQty * boxPrice,
                inventoryStatus: status
            };
        });
    }, [data, simulationTargets]);

    const uniqueCategories = useMemo(() => {
        const categories = enhancedData.map((item) => item.category_name || "OTHERS")
        return Array.from(new Set(categories)).filter(Boolean).sort() as string[]
    }, [enhancedData])

    const filteredAndSortedData = useMemo(() => {
        let items = [...enhancedData]
        const q = searchQuery.trim().toLowerCase()
        if (q) {
            items = items.filter((item) => {
                const name = String(item.productName || item.product_name || "").toLowerCase()
                const sku = String(item.sku || "").toLowerCase()
                return name.includes(q) || sku.includes(q)
            })
        }
        if (classFilters.length > 0) items = items.filter((item) => item.abcClass && classFilters.includes(item.abcClass))
        if (categoryFilters.length > 0) items = items.filter((item) => item.category_name && categoryFilters.includes(item.category_name))

        if (sortConfig.direction !== null) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof PlanningRow]
                const bValue = b[sortConfig.key as keyof PlanningRow]
                if (typeof aValue === "number" && typeof bValue === "number") {
                    return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
                }
                return String(aValue || "").localeCompare(String(bValue || "")) * (sortConfig.direction === "asc" ? 1 : -1)
            })
        }
        return items
    }, [enhancedData, sortConfig, classFilters, categoryFilters, searchQuery])

    const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / rowsPerPage))
    const paginatedData = filteredAndSortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
        brandName: 120,
        category_name: 160,
        abcClass: 80,
        productName: 280,
        orderQty: 130,
        suggestedQty: 110,
        projectedStockBoxes: 110,
        targetStock: 110,
        mavValue: 100,
        currentStockBoxes: 100,
        inTransitBoxes: 100,
        dailyUsage: 100,
        totalAmount: 140,
        unitPrice: 120,
        expectedSelloutBoxes: 110,
        inventoryStatus: 130,
    })

    const handleMouseDown = (e: ReactMouseEvent, columnKey: string) => {
        const startX = e.pageX
        const startWidth = columnWidths[columnKey] || 120
        const onMouseMove = (moveEvent: MouseEvent) => setColumnWidths((prev) => ({ ...prev, [columnKey]: Math.max(startWidth + (moveEvent.pageX - startX), 60) }))
        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }
        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
    }

    // 🚀 STICKY OFFSETS COMPUTATION (Reactive to Drag-Resizing)
    const getW = (key: string, def: number) => columnWidths[key] ?? def;
    const leftOffsets = {
        brandName: 0,
        category_name: getW("brandName", 120),
        abcClass: getW("brandName", 120) + getW("category_name", 160),
        productName: getW("brandName", 120) + getW("category_name", 160) + getW("abcClass", 80),
        orderQty: getW("brandName", 120) + getW("category_name", 160) + getW("abcClass", 80) + getW("productName", 280),
    };

    const headerProps = {
        columnWidths, sortConfig, setSortConfig, handleMouseDown, classFilters,
        setClassFilters, categoryFilters, setCategoryFilters, uniqueCategories,
    }

    // Helper for applying sticky styles to body cells
    const stickyCellClass = (isLast = false) => cn(
        "sticky z-[10] bg-inherit",
        isLast ? "border-r-2 border-slate-200 dark:border-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.05)]" : ""
    );

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 pt-2">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white shrink-0">
                        <History className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none truncate">
                            Historical Planning
                        </h2>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Live Simulation Engine</span>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] bg-white dark:bg-slate-950 shadow-xl transition-all">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-2 w-full md:max-w-[520px]">
                            <Input
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Search product name or SKU..."
                                className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-[12px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:ring-blue-500/20"
                            />
                            {searchQuery.trim() && (
                                <Button type="button" variant="ghost" className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                                    <XCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                </Button>
                            )}
                        </div>

                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                            {classFilters.length > 0 || categoryFilters.length > 0 || searchQuery.trim() ? (
                                <span>Active: {[searchQuery.trim() ? "SEARCH" : null, categoryFilters.length ? `CATEGORY(${categoryFilters.length})` : null, classFilters.length ? `CLASS(${classFilters.length})` : null,].filter(Boolean).join(" • ")}</span>
                            ) : <span>All Products</span>}
                        </div>
                    </div>
                </div>

                {/* 🚀 Vertical + Horizontal Scroll Container */}
                <div className="overflow-auto scrollbar-thin max-h-[calc(100vh-320px)] min-h-[400px] relative">
                    <Table className="w-full table-fixed border-collapse">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-2 border-slate-200 dark:border-slate-800">
                                <SortableHeader title="Brand" sortKey="brandName" className="px-6" isSticky leftOffset={leftOffsets.brandName} {...headerProps} />
                                <SortableHeader title="Category" sortKey="category_name" className="px-4" hasFilter filterType="category" isSticky leftOffset={leftOffsets.category_name} {...headerProps} />
                                <SortableHeader title="Class" sortKey="abcClass" className="text-center" hasFilter filterType="class" isSticky leftOffset={leftOffsets.abcClass} {...headerProps} />
                                <SortableHeader title="Product" sortKey="productName" className="px-4" isSticky leftOffset={leftOffsets.productName} {...headerProps} />
                                <SortableHeader title="Order" sortKey="orderQty" className="text-center" isBlue isSticky leftOffset={leftOffsets.orderQty} isLastSticky {...headerProps} />

                                {/* Standard Columns */}
                                <SortableHeader title="Sugg. Qty" sortKey="suggestedQty" className="text-right text-slate-500 px-4" {...headerProps} />
                                <SortableHeader title="Proj Stock" sortKey="projectedStockBoxes" className="text-right text-amber-600 bg-amber-50/50 dark:bg-amber-900/10 px-4" tooltip="PROJECTED POSITION (STOCK + TRANSIT - SELLOUT)" {...headerProps} />
                                <SortableHeader title="Req. Inv" sortKey="targetStock" className="text-right text-emerald-600 px-4" tooltip="REQUIRED INVENTORY (DAU x TARGET DAYS)" {...headerProps} />
                                <SortableHeader title="MAV (Avg Boxes)" sortKey="mav" className="text-right text-purple-500 px-4" tooltip="Monthly Average Volume (Boxes/Month)" {...headerProps} />
                                <SortableHeader title="Inventory" sortKey="currentStockBoxes" className="text-right text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/40 px-4 border-x border-blue-200 dark:border-blue-800" tooltip="On-hand stock in boxes" {...headerProps} />
                                <SortableHeader title="In-Transit" sortKey="inTransitBoxes" className="text-right text-indigo-500 px-4" {...headerProps} />
                                <SortableHeader title="DAU (Boxes)" sortKey="dailyUsage" className="text-right text-slate-400 px-4" tooltip="Daily Average Usage in Boxes" {...headerProps} />
                                <SortableHeader title="Total Value" sortKey="totalAmount" className="text-right text-slate-500 px-4" {...headerProps} />
                                <SortableHeader title="Box Price" sortKey="unitPrice" className="text-right px-4" tooltip="Price per BOX. Formula: (Piece Cost × Box Multiplier)" {...headerProps} />
                                <SortableHeader title="Exp Sellout" sortKey="expectedSelloutBoxes" className="text-right text-red-500 bg-red-50/50 dark:bg-red-900/10 px-4" {...headerProps} />
                                <SortableHeader title="Status" sortKey="inventoryStatus" className="text-center px-6" {...headerProps} />
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {paginatedData.map((row) => {
                                const rowId = String(row.product_id || row.id)
                                const statusStyles = ({ "BELOW ROP": "bg-red-500/10 text-red-600 border-red-500/20", "NEAR ROP": "bg-orange-500/10 text-orange-600 border-orange-500/20", OK: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" } as Record<string, string>)[row.inventoryStatus as string] || "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                const StatusIcon = row.inventoryStatus === "OK" ? CheckCircle : row.inventoryStatus === "NEAR ROP" ? Timer : AlertCircle

                                return (
                                    <TableRow
                                        key={rowId}
                                        // 🚀 FIX: Setting a solid base color so `bg-inherit` on sticky cells works beautifully on hover
                                        className="h-16 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                    >
                                        <TableCell className={cn("px-6 font-black text-blue-700 dark:text-blue-400 text-[13px] uppercase italic truncate", stickyCellClass())} style={{ left: leftOffsets.brandName }}>
                                            {row.brandName}
                                        </TableCell>

                                        <TableCell className={cn("px-4", stickyCellClass())} style={{ left: leftOffsets.category_name }}>
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md max-w-full border border-blue-100 dark:border-blue-800">
                                                <Layers className="w-3 h-3 text-blue-500 shrink-0" />
                                                <span className="font-black text-blue-700 dark:text-blue-300 uppercase text-[11px] truncate">{row.category_name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className={cn("text-center", stickyCellClass())} style={{ left: leftOffsets.abcClass }}>
                                            <Badge variant="outline" className={cn("font-black text-[11px] px-3", row.abcClass === "A" ? "border-red-500 text-red-600" : row.abcClass === "B" ? "border-purple-500 text-purple-600" : "border-slate-400 text-slate-500")}>
                                                {row.abcClass}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className={cn("px-4 font-bold text-slate-900 dark:text-slate-200 uppercase text-[13px] leading-tight", stickyCellClass())} style={{ left: leftOffsets.productName }}>
                                            <div className="max-w-[260px] truncate" title={row.productName}>{row.productName}</div>
                                            {row.sku && <div className="mt-1 text-[11px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-500 truncate">SKU: {row.sku}</div>}
                                        </TableCell>

                                        <TableCell className={cn("px-2 py-2", stickyCellClass(true))} style={{ left: leftOffsets.orderQty }}>
                                            <Input
                                                type="number"
                                                className="h-10 w-full text-center font-black text-[15px] bg-blue-50/50 dark:bg-blue-950/50 text-slate-900 dark:text-slate-100 border-blue-200 dark:border-blue-900/40 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-lg shadow-sm"
                                                value={row.orderQty || ""}
                                                onChange={(e) => onQuantityChange(rowId, parseFloat(e.target.value) || 0)}
                                            />
                                        </TableCell>

                                        <TableCell className="text-right font-mono font-black text-slate-800 dark:text-slate-200 px-4 text-[14px]">{(Number(row.suggestedQty) || 0).toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-amber-700 dark:text-amber-400 text-[15px] px-4 bg-amber-500/5">{(Number(row.projectedStockBoxes) || 0).toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-emerald-700 dark:text-emerald-400 px-4 text-[15px] bg-emerald-500/5">{(Number(row.targetStock) || 0).toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-purple-700 dark:text-purple-400 text-[14px] px-4">{(Number(row.mav) || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-blue-800 dark:text-blue-300 text-[14px] px-4 bg-blue-50/40 dark:bg-blue-900/20 border-x border-blue-100 dark:border-blue-900/30">{(Number(row.currentStockBoxes) || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-indigo-600 dark:text-indigo-400 text-[14px] px-4">{(row.inTransitBoxes || 0).toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-slate-500 dark:text-slate-400 text-[13px] px-4 italic">{(row.dailyUsage || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-slate-900 dark:text-slate-100 px-4 text-[14px]">₱{(row.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>

                                        <TableCell className="text-right font-mono font-black text-slate-600 dark:text-slate-300 text-[14px] px-4">
                                            <TooltipProvider>
                                                <Tooltip delayDuration={100}>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help underline decoration-dotted decoration-slate-400">
                                                            ₱{(Number(row.computedPricePerBox) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-900 text-white text-[10px] p-2 font-bold uppercase border-slate-700 shadow-xl">
                                                        ₱{(Number(row.last_cost || row.lastCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} per Piece × {row.boxMultiplier} Units
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>

                                        <TableCell className="text-right text-red-600 font-mono font-black text-[14px] px-4">
                                            {Math.abs(row.expectedSelloutBoxes || 0).toFixed(1)}
                                        </TableCell>

                                        <TableCell className="px-6 text-center">
                                            <div className={cn("px-3 py-2 rounded-xl text-[11px] font-black uppercase inline-flex items-center gap-1.5 shadow-sm border", statusStyles)}>
                                                <StatusIcon className="w-3.5 h-3.5" /> {row.inventoryStatus || "OK"}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-[2rem] sm:rounded-b-[2.5rem]">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">Show</span>
                                <Select value={rowsPerPage.toString()} onValueChange={(val) => { setRowsPerPage(parseInt(val)); setCurrentPage(1); }}>
                                    <SelectTrigger className={cn("h-9 w-[120px] text-[12px] font-black rounded-xl shadow-sm", "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950", "text-slate-900 dark:text-slate-100", "[&>span]:text-slate-900 dark:[&>span]:text-slate-100")}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                                        <SelectItem value="10">10 Rows</SelectItem>
                                        <SelectItem value="20">20 Rows</SelectItem>
                                        <SelectItem value="50">50 Rows</SelectItem>
                                        <SelectItem value="100">100 Rows</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800" />
                            <span className="text-[12px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest min-w-[200px]">
                                Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} Products
                            </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 bg-white dark:bg-slate-950 p-2 lg:p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-full lg:w-auto">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                <ChevronsLeft className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center px-4 sm:px-6 h-10 bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 whitespace-nowrap min-w-[120px] justify-center">
                                <span className="text-[12px] font-black text-white uppercase tracking-tighter">Page {currentPage} of {totalPages}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                <ChevronsRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}