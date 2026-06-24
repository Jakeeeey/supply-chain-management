"use client"

import { type MouseEvent as ReactMouseEvent, useMemo, useState, useEffect } from "react"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    AlertCircle, ArrowUpDown, CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft,
    ChevronsRight, Filter, History, Layers, SortAsc, SortDesc, Timer, XCircle, BarChart3
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
    isSticky?: boolean
    leftOffset?: number
    isLastSticky?: boolean
}

// Extracted Component
function SortableHeader({
                            title, sortKey, className, isBlue = false, hasFilter = false, filterType = "", tooltip,
                            columnWidths, sortConfig, setSortConfig, handleMouseDown, classFilters, setClassFilters,
                            categoryFilters, setCategoryFilters, uniqueCategories, isSticky, leftOffset, isLastSticky
                        }: SortableHeaderProps) {
    const direction = sortConfig.key === sortKey ? sortConfig.direction : null
    const isActive = direction !== null
    const width = columnWidths[sortKey] || 100

    const isSortable = sortKey !== "abcClass" && sortKey !== "category_name"
    const isCentered = className?.includes("text-center")
    const isRightAligned = className?.includes("text-right")

    const stickyCellClass = () => {
        if (!isSticky) return "sticky top-0 z-[30] bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md"
        return cn(
            "sticky top-0 z-[40] bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md",
            isLastSticky && "border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
        )
    }

    const headerText = (
        <span className={cn(
            isActive ? "text-blue-600 dark:text-blue-400" : isBlue ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-slate-200",
            tooltip && "underline decoration-dotted cursor-help",
            "block max-w-full"
        )}>
            {title}
        </span>
    )

    return (
        <TableHead
            className={cn(
                "p-0 relative font-black uppercase text-[10px] tracking-widest text-slate-700 dark:text-slate-200 group transition-all",
                stickyCellClass(),
                className
            )}
            style={{
                width: `${width}px`,
                minWidth: `${width}px`,
                maxWidth: `${width}px`,
                left: leftOffset !== undefined ? `${leftOffset}px` : undefined
            }}
        >
            <div className={cn(
                "flex items-center w-full h-full px-2 py-3 relative gap-1 justify-between"
            )}>
                <div
                    onClick={() => isSortable && setSortConfig({ key: sortKey, direction: direction === "asc" ? "desc" : direction === "desc" ? null : "asc" })}
                    className={cn(
                        "flex items-center gap-1 min-w-0 select-none",
                        isSortable ? "cursor-pointer hover:text-blue-500" : "",
                        isRightAligned ? "flex-row-reverse" : "",
                        isCentered ? "mx-auto" : ""
                    )}
                >
                    {tooltip ? (
                        <TooltipProvider>
                            <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                    {headerText}
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 text-white text-[10px] p-2 font-bold uppercase border-slate-700 shadow-xl">
                                    {tooltip}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : headerText}
                    {isSortable && (
                        <span className="shrink-0">
                            {direction === "asc" ? (
                                <SortAsc className="w-3.5 h-3.5 text-blue-500" />
                            ) : direction === "desc" ? (
                                <SortDesc className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </span>
                    )}
                </div>

                {hasFilter && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md outline-none shrink-0">
                                <Filter className={cn("w-3 h-3", (filterType === "category" ? categoryFilters.length : classFilters.length) > 0 ? "text-blue-500 opacity-100" : "")} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 rounded-xl shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center px-2 py-1 border-b">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filters</span>
                                <Button variant="ghost" className="h-6 px-2 text-[9px] font-black text-rose-600 uppercase hover:bg-rose-500/10" onClick={() => (filterType === "category" ? setCategoryFilters([]) : setClassFilters([]))}>
                                    Clear
                                </Button>
                            </div>
                            <div className="max-h-48 overflow-y-auto py-1 space-y-1">
                                {filterType === "category" ? (
                                    uniqueCategories.map((cat) => (
                                        <div key={cat} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                            <Checkbox id={`cat-${cat}`} checked={categoryFilters.includes(cat)} onCheckedChange={() => setCategoryFilters((prev: string[]) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))} />
                                            <label htmlFor={`cat-${cat}`} className="text-[10px] font-bold uppercase truncate cursor-pointer select-none">{cat}</label>
                                        </div>
                                    ))
                                ) : (
                                    (["A", "B", "C"] as const).map((cls) => (
                                        <div key={cls} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                            <Checkbox id={`cls-${cls}`} checked={classFilters.includes(cls)} onCheckedChange={() => setClassFilters((prev: string[]) => (prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]))} />
                                            <label htmlFor={`cls-${cls}`} className="text-[10px] font-bold uppercase cursor-pointer select-none">{cls}-Class</label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
                <div
                    onMouseDown={(e) => handleMouseDown(e, sortKey)}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                />
            </div>
        </TableHead>
    )
}

// Main Table Component
export default function HistoricalPlanningTable({
    data = [],
    onQuantityChange,
    simulationTargets = { A: 0, B: 0, C: 0 },
    onFilteredDataChange,
    onShowTrend
}: {
    data: PlanningRow[];
    onQuantityChange: (id: string, qty: number) => void;
    simulationTargets: SimulationTargets;
    onFilteredDataChange?: (filteredData: PlanningRow[]) => void;
    onShowTrend?: (row: PlanningRow) => void;
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
            const targetDays = simulationTargets[item.abcClass?.toUpperCase() as keyof typeof simulationTargets] || 0;
            const requiredInv = dau * targetDays;
            const projected = (currentStock + inTransit) - sellout;
            const suggested = Math.max(0, requiredInv - (currentStock + inTransit - sellout));
            const dtl = dau > 0 ? projected / dau : 0;

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
                daysToLast: dtl,
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
        if (classFilters.length > 0) items = items.filter((item) => item.abcClass && classFilters.includes(item.abcClass.toUpperCase()))
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

    useEffect(() => {
        onFilteredDataChange?.(filteredAndSortedData)
    }, [filteredAndSortedData, onFilteredDataChange])

    const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / rowsPerPage))
    const paginatedData = filteredAndSortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
        brandName: 90,
        category_name: 110,
        abcClass: 75,
        productName: 200,
        orderQty: 80,
        suggestedQty: 90,
        projectedStockBoxes: 100,
        targetStock: 90,
        daysToLast: 110,
        mav: 100,
        mavValue: 70,
        currentStockBoxes: 105,
        inTransitBoxes: 100,
        dailyUsage: 100,
        totalAmount: 110,
        unitPrice: 100,
        expectedSelloutBoxes: 105,
        inventoryStatus: 90,
    })

    const handleMouseDown = (e: ReactMouseEvent, columnKey: string) => {
        const startX = e.pageX
        const startWidth = columnWidths[columnKey] || 120
        const onMouseMove = (moveEvent: MouseEvent) => setColumnWidths((prev) => ({ ...prev, [columnKey]: Math.max(startWidth + (moveEvent.pageX - startX), 40) }))
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
        category_name: getW("brandName", 90),
        abcClass: getW("brandName", 90) + getW("category_name", 110),
        productName: getW("brandName", 90) + getW("category_name", 110) + getW("abcClass", 75),
        orderQty: getW("brandName", 90) + getW("category_name", 110) + getW("abcClass", 75) + getW("productName", 200),
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
            </div>            <div className="w-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 shadow-md transition-all">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-2 w-full md:max-w-[360px]">
                            <Input
                                id="table-search-input"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Search product name or SKU..."
                                className="h-7.5 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md font-bold text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-blue-500"
                            />
                            {searchQuery.trim() && (
                                <Button type="button" variant="ghost" className="h-7.5 w-7.5 p-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                                    <XCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </Button>
                            )}
                        </div>

                        <div className="text-[9px] font-black text-slate-500 dark:text-slate-550 uppercase tracking-widest">
                            {classFilters.length > 0 || categoryFilters.length > 0 || searchQuery.trim() ? (
                                <span>Active: {[searchQuery.trim() ? "SEARCH" : null, categoryFilters.length ? `CATEGORY(${categoryFilters.length})` : null, classFilters.length ? `CLASS(${classFilters.length})` : null,].filter(Boolean).join(" • ")}</span>
                            ) : <span>All Products</span>}
                        </div>
                    </div>
                </div>

                {/* 🚀 Vertical + Horizontal Scroll Container */}
                <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[400px] relative">
                    <table className="w-full table-fixed border-collapse text-sm">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-2 border-slate-200 dark:border-slate-800">
                                <SortableHeader title="Brand" sortKey="brandName" className="pl-3 pr-2" isSticky leftOffset={leftOffsets.brandName} {...headerProps} />
                                <SortableHeader title="Category" sortKey="category_name" className="px-2" hasFilter filterType="category" isSticky leftOffset={leftOffsets.category_name} {...headerProps} />
                                <SortableHeader title="Class" sortKey="abcClass" className="text-center px-1" hasFilter filterType="class" isSticky leftOffset={leftOffsets.abcClass} {...headerProps} />
                                <SortableHeader title="Product" sortKey="productName" className="px-2" isSticky leftOffset={leftOffsets.productName} {...headerProps} />
                                <SortableHeader title="Order" sortKey="orderQty" className="text-center px-2" isBlue isSticky leftOffset={leftOffsets.orderQty} isLastSticky {...headerProps} />

                                {/* Standard Columns */}
                                <SortableHeader title="Sugg. Qty" sortKey="suggestedQty" className="text-right text-slate-500 px-2" {...headerProps} />
                                <SortableHeader title="Proj Stock" sortKey="projectedStockBoxes" className="text-right text-amber-600 bg-amber-50/50 dark:bg-amber-900/10 px-2" tooltip="PROJECTED POSITION (STOCK + TRANSIT - SELLOUT)" {...headerProps} />
                                <SortableHeader title="Req. Inv" sortKey="targetStock" className="text-right text-emerald-600 px-2" tooltip="REQUIRED INVENTORY (DAU x TARGET DAYS)" {...headerProps} />
                                <SortableHeader title="MAV (Boxes)" sortKey="mav" className="text-right text-purple-500 px-2" tooltip="Monthly Average Volume (Boxes/Month)" {...headerProps} />
                                <SortableHeader title="Inventory" sortKey="currentStockBoxes" className="text-right text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/40 px-2 border-x border-blue-200 dark:border-blue-800" tooltip="On-hand stock in boxes" {...headerProps} />
                                <SortableHeader title="In-Transit" sortKey="inTransitBoxes" className="text-right text-indigo-500 px-2" {...headerProps} />
                                <SortableHeader title="Days to Last" sortKey="daysToLast" className="text-right text-purple-600 px-2" tooltip="DAYS OF STOCK COVERAGE (PROJECTED / DAU)" {...headerProps} />
                                <SortableHeader title="DAU (Boxes)" sortKey="dailyUsage" className="text-right text-slate-400 px-2" tooltip="Daily Average Usage in Boxes" {...headerProps} />
                                <SortableHeader title="Box Price" sortKey="unitPrice" className="text-right px-2" tooltip="Price per BOX. Formula: (Piece Cost × Box Multiplier)" {...headerProps} />
                                <SortableHeader title="Exp Sellout" sortKey="expectedSelloutBoxes" className="text-right text-red-500 bg-red-50/50 dark:bg-red-900/10 px-2" {...headerProps} />
                                <SortableHeader title="Total Value" sortKey="totalAmount" className="text-right text-slate-500 px-2" {...headerProps} />
                                <SortableHeader title="Status" sortKey="inventoryStatus" className="text-center px-2" {...headerProps} />
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {paginatedData.map((row, idx) => {
                                const rowId = String(row.product_id || row.id)
                                const statusStyles = ({ "BELOW ROP": "bg-red-500/10 text-red-600 border-red-500/20", "NEAR ROP": "bg-orange-500/10 text-orange-600 border-orange-500/20", OK: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" } as Record<string, string>)[row.inventoryStatus as string] || "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                const StatusIcon = row.inventoryStatus === "OK" ? CheckCircle : row.inventoryStatus === "NEAR ROP" ? Timer : AlertCircle

                                return (
                                    <TableRow
                                        key={rowId}
                                        className="h-10 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                    >
                                        <TableCell className={cn("px-2 py-1 font-black text-blue-700 dark:text-blue-400 text-[11px] uppercase italic truncate", stickyCellClass())} style={{ left: leftOffsets.brandName }}>
                                            {row.brandName}
                                        </TableCell>

                                        <TableCell className={cn("px-2 py-1", stickyCellClass())} style={{ left: leftOffsets.category_name }}>
                                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded max-w-full border border-blue-100 dark:border-blue-800">
                                                <Layers className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                                <span className="font-black text-blue-700 dark:text-blue-300 uppercase text-[9px] truncate">{row.category_name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className={cn("text-center px-1 py-1", stickyCellClass())} style={{ left: leftOffsets.abcClass }}>
                                            <Badge variant="outline" className={cn("font-black text-[9px] px-1.5 py-0.2 rounded", row.abcClass?.toUpperCase() === "A" ? "border-red-500 text-red-600" : row.abcClass?.toUpperCase() === "B" ? "border-purple-500 text-purple-600" : "border-slate-400 text-slate-500")}>
                                                {row.abcClass}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className={cn("px-2 py-1 font-bold text-slate-900 dark:text-slate-200 uppercase text-[11px] leading-tight", stickyCellClass())} style={{ left: leftOffsets.productName }}>
                                            <div className="flex items-center justify-between min-w-0 gap-1.5">
                                                <div className="flex flex-col min-w-0">
                                                    <div className="max-w-[170px] truncate text-[11px]" title={row.productName}>{row.productName}</div>
                                                    {row.sku && <div className="mt-0.5 text-[9px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-500 truncate">SKU: {row.sku}</div>}
                                                </div>
                                                {onShowTrend && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onShowTrend(row)}
                                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors shrink-0 outline-none"
                                                        title="View Inventory Position Chart"
                                                    >
                                                        <BarChart3 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className={cn("px-1.5 py-1", stickyCellClass(true))} style={{ left: leftOffsets.orderQty }}>
                                            <Input
                                                type="number"
                                                className="h-6.5 w-full text-center font-black text-[12px] bg-blue-50/50 dark:bg-blue-950/50 text-slate-900 dark:text-slate-100 border-blue-200 dark:border-blue-900/40 focus-visible:ring-1 focus-visible:ring-blue-500 rounded shadow-sm p-0"
                                                value={row.orderQty || ""}
                                                onChange={(e) => onQuantityChange(rowId, parseFloat(e.target.value) || 0)}
                                                data-row-index={idx}
                                                onKeyDown={(e) => {
                                                    if (e.key === "ArrowDown" || e.key === "Enter") {
                                                        e.preventDefault();
                                                        const target = document.querySelector(`input[data-row-index="${idx + 1}"]`) as HTMLInputElement | null;
                                                        if (target) {
                                                            target.focus();
                                                            target.select();
                                                        }
                                                    } else if (e.key === "ArrowUp") {
                                                        e.preventDefault();
                                                        const target = document.querySelector(`input[data-row-index="${idx - 1}"]`) as HTMLInputElement | null;
                                                        if (target) {
                                                            target.focus();
                                                            target.select();
                                                        }
                                                    }
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell className="text-right font-mono font-black text-slate-800 dark:text-slate-200 px-2 text-[11px]">{(Number(row.suggestedQty) || 0).toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-amber-700 dark:text-amber-400 text-[11px] px-2 bg-amber-500/5">{(Number(row.projectedStockBoxes) || 0).toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-emerald-700 dark:text-emerald-400 px-2 text-[11px] bg-emerald-500/5">{(Number(row.targetStock) || 0).toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-purple-700 dark:text-purple-400 text-[11px] px-2">{(Number(row.mav) || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-blue-800 dark:text-blue-300 text-[11px] px-2 bg-blue-50/40 dark:bg-blue-900/20 border-x border-blue-100 dark:border-blue-900/30">{(Number(row.currentStockBoxes) || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-black text-indigo-600 dark:text-indigo-400 text-[11px] px-2">
                                            {(() => {
                                                const transitList = row.inTransitDetails
                                                    ? row.inTransitDetails.split(";").filter(Boolean).map((item) => {
                                                          const [poNo, qty] = item.split(":");
                                                          return { poNo, quantity: parseFloat(qty) || 0 };
                                                      })
                                                    : [];

                                                return (row.inTransitBoxes || 0) > 0 && transitList.length > 0 ? (
                                                    <TooltipProvider>
                                                        <Tooltip delayDuration={100}>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help underline decoration-dotted decoration-indigo-400/60 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                                                                    {(row.inTransitBoxes || 0).toFixed(1)}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-2xl min-w-[200px]">
                                                                <div className="space-y-2">
                                                                    <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider border-b border-slate-800 pb-1.5 flex justify-between">
                                                                        <span>PO Number</span>
                                                                        <span>Qty</span>
                                                                    </div>
                                                                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                                        {transitList.map((po, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center text-[10px] font-bold uppercase gap-4">
                                                                                <span className="text-slate-350">{po.poNo}</span>
                                                                                <span className="text-indigo-400 font-mono font-black">{po.quantity.toFixed(1)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    (row.inTransitBoxes || 0).toFixed(1)
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-black text-purple-700 dark:text-purple-400 px-2 text-[11px]">
                                            {row.daysToLast && row.daysToLast > 0 ? `${row.daysToLast.toFixed(1)}d` : "0.0d"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-black text-slate-500 dark:text-slate-400 text-[10px] px-2 italic">{(row.dailyUsage || 0).toFixed(2)}</TableCell>

                                        <TableCell className="text-right font-mono font-black text-slate-600 dark:text-slate-300 text-[11px] px-2">
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

                                        <TableCell className="text-right text-red-600 font-mono font-black text-[11px] px-2">
                                            {Math.abs(row.expectedSelloutBoxes || 0).toFixed(1)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-black text-slate-900 dark:text-slate-100 px-2 text-[11px]">₱{(row.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>

                                        <TableCell className="px-2 text-center">
                                            <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase inline-flex items-center gap-1 shadow-sm border", statusStyles)}>
                                                <StatusIcon className="w-3 h-3" /> {row.inventoryStatus || "OK"}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-lg">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 w-full">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">Show</span>
                                <Select value={rowsPerPage.toString()} onValueChange={(val) => { setRowsPerPage(parseInt(val)); setCurrentPage(1); }}>
                                    <SelectTrigger className={cn("h-7.5 w-[90px] text-[11px] font-black rounded-md shadow-sm", "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950", "text-slate-900 dark:text-slate-100", "[&>span]:text-slate-900 dark:[&>span]:text-slate-100")}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-md border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                                        <SelectItem value="10">10 Rows</SelectItem>
                                        <SelectItem value="20">20 Rows</SelectItem>
                                        <SelectItem value="50">50 Rows</SelectItem>
                                        <SelectItem value="100">100 Rows</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800" />
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest min-w-[150px]">
                                {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length}
                            </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-1 bg-white dark:bg-slate-950 p-1 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm w-full lg:w-auto">
                            <Button variant="ghost" size="icon" className="h-7.5 w-7.5 rounded-md text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                <ChevronsLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7.5 w-7.5 rounded-md text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center px-3 h-7.5 bg-blue-600 rounded-md shadow-sm whitespace-nowrap min-w-[90px] justify-center">
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">Page {currentPage} of {totalPages}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7.5 w-7.5 rounded-md text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7.5 w-7.5 rounded-md text-slate-800 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-900 dark:hover:text-blue-400 disabled:opacity-40" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                <ChevronsRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}