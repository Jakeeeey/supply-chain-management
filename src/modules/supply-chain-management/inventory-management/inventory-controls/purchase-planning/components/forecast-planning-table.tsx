"use client"

import React, {
    useState,
    useImperativeHandle,
    forwardRef,
    useEffect,
    useMemo,
} from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {Input} from "@/components/ui/input"
import {
    BrainCircuit,
    ChevronLeft,
    ChevronRight,
    ArrowUpAZ,
    ArrowDownAZ,
    SortAsc,
    TrendingUp,
    Search,
    FilterX,
    Layers,
} from "lucide-react"
import {cn} from "@/lib/utils"
import {TooltipProvider} from "@/components/ui/tooltip"
import {Button} from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface ForecastItem {
    product_id: string
    brandName: string
    category_name: string
    productName: string

    lastCost: number
    boxMultiplier: number

    monthlyForecast: Record<string, number>

    dailyUsage?: number
    pendingSoQty?: number
    inTransitQty?: number
    currentStockBoxes?: number
    inTransitBoxes?: number
    suggestedQty?: number
    computedPricePerBox?: number

    orderQty: number
    abcClass?: string
}

interface Props {
    data: ForecastItem[]
    selectedMonths: string[]
    onQuantityChange?: (id: string, qty: number) => void
}

type SortKey = keyof ForecastItem | "subtotal"
type SortDir = "asc" | "desc" | null

const menuItemBase =
    "text-[11px] font-black uppercase tracking-wider " +
    "text-slate-900 dark:text-slate-100 " +
    "focus:bg-slate-100 dark:focus:bg-slate-800/60 " +
    "focus:text-slate-900 dark:focus:text-slate-100"

// 🚀 FIX 3: Extracted Header to prevent re-mounting on every render
interface ForecastHeaderProps {
    label: string
    sKey: SortKey
    className?: string
    sortConfig: { key: SortKey; dir: SortDir }
    setSortConfig: (config: { key: SortKey; dir: SortDir }) => void
}

function ForecastHeader({label, sKey, className, sortConfig, setSortConfig}: ForecastHeaderProps) {
    return (
        <TableHead className={cn("px-4 py-4 whitespace-nowrap", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer group select-none">
                        <span
                            className={cn(
                                "text-[11px] font-black uppercase tracking-widest",
                                sortConfig.key === sKey && sortConfig.dir
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-slate-700 dark:text-slate-200"
                            )}
                        >
                            {label}
                        </span>
                        <SortAsc
                            className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-300"/>
                    </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="start"
                    className={cn(
                        "rounded-xl shadow-2xl",
                        "border-slate-200 dark:border-slate-800",
                        "bg-white dark:bg-slate-950",
                        "text-slate-900 dark:text-slate-100"
                    )}
                >
                    <DropdownMenuItem onClick={() => setSortConfig({key: sKey, dir: "asc"})} className={menuItemBase}>
                        <ArrowUpAZ className="w-4 h-4 mr-2 text-slate-700 dark:text-slate-200"/>
                        Ascending
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setSortConfig({key: sKey, dir: "desc"})} className={menuItemBase}>
                        <ArrowDownAZ className="w-4 h-4 mr-2 text-slate-700 dark:text-slate-200"/>
                        Descending
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800"/>

                    <DropdownMenuItem
                        onClick={() => setSortConfig({key: "brandName", dir: null})}
                        className={cn(
                            menuItemBase,
                            "text-rose-700 dark:text-rose-300",
                            "focus:bg-rose-50 dark:focus:bg-rose-950/30",
                            "focus:text-rose-800 dark:focus:text-rose-200"
                        )}
                    >
                        <FilterX className="w-4 h-4 mr-2 text-rose-700 dark:text-rose-300"/>
                        Reset
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </TableHead>
    )
}

export const ForecastPlanningTable = forwardRef<any, Props>(
    ({data, selectedMonths, onQuantityChange}, ref) => {
        // 🚀 FIX 1: We only store manual overrides in state now. No more duplicated data!
        const [manualOrderQtys, setManualOrderQtys] = useState<Record<string, number>>({})
        const [searchQuery, setSearchQuery] = useState("")
        const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({key: "abcClass", dir: "asc"})
        const [currentPage, setCurrentPage] = useState(1)
        const [pageSize, setPageSize] = useState(10)

        // Helper to get the final list combining raw data + manual edits
        const getMergedData = () => {
            return (data || []).map((item) => ({
                ...item,
                orderQty: manualOrderQtys[item.product_id] !== undefined
                    ? manualOrderQtys[item.product_id]
                    : (item.orderQty !== undefined ? item.orderQty : (item.suggestedQty || 0))
            }))
        }

        useImperativeHandle(ref, () => ({
            getCalculatedData: () => getMergedData(),
        }))

        const processedItems = useMemo(() => {
            const mergedData = getMergedData()
            const q = searchQuery.trim().toLowerCase()

            // 🚀 FIX 2: Used 'const' here instead of 'let'. Array.sort() mutates in place!
            const filtered = mergedData.filter((item) => {
                const p = String(item.productName || "").toLowerCase()
                const b = String(item.brandName || "").toLowerCase()
                const c = String(item.category_name || "").toLowerCase()
                return !q || p.includes(q) || b.includes(q) || c.includes(q)
            })

            if (sortConfig.dir) {
                filtered.sort((a, b) => {
                    const aPrice = Number(a.computedPricePerBox) || Number(a.lastCost || 0) * Number(a.boxMultiplier || 1)
                    const bPrice = Number(b.computedPricePerBox) || Number(b.lastCost || 0) * Number(b.boxMultiplier || 1)

                    const aVal: any = sortConfig.key === "subtotal" ? Number(a.orderQty || 0) * aPrice : (a as any)[sortConfig.key]
                    const bVal: any = sortConfig.key === "subtotal" ? Number(b.orderQty || 0) * bPrice : (b as any)[sortConfig.key]

                    if (typeof aVal === "string") {
                        return sortConfig.dir === "asc"
                            ? String(aVal).localeCompare(String(bVal))
                            : String(bVal).localeCompare(String(aVal))
                    }

                    return sortConfig.dir === "asc"
                        ? Number(aVal || 0) - Number(bVal || 0)
                        : Number(bVal || 0) - Number(aVal || 0)
                })
            }

            return filtered
        }, [data, manualOrderQtys, searchQuery, sortConfig])

        const totalPages = Math.max(1, Math.ceil(processedItems.length / pageSize))
        const safePage = Math.min(currentPage, totalPages)
        const visibleItems = processedItems.slice((safePage - 1) * pageSize, safePage * pageSize)

        useEffect(() => {
            if (currentPage !== safePage) setCurrentPage(safePage)
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [safePage])

        const updateQty = (pid: string, val: string) => {
            const num = Math.max(0, val === "" ? 0 : parseFloat(val))
            setManualOrderQtys((prev) => ({...prev, [pid]: num}))
            onQuantityChange?.(pid, num)
        }

        const formatMonthKey = (dateString: string) => {
            return dateString.substring(0, 7)
        }

        return (
            <TooltipProvider>
                <div
                    className="w-full bg-white dark:bg-slate-950 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <div
                        className="px-6 sm:px-8 py-6 bg-gradient-to-r from-emerald-50/60 to-transparent dark:from-emerald-950/15 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div
                                className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-700 dark:text-emerald-300">
                                <BrainCircuit className="w-6 h-6"/>
                            </div>
                            <div>
                                <h2 className="text-[16px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Forecast Planning
                                </h2>
                                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3"/>
                                    Forecast Months + Historical Engine Columns
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-72">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-300"/>
                            <Input
                                placeholder="Search Brand / Product / Category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={cn(
                                    "pl-10 h-10 rounded-full",
                                    "bg-white dark:bg-slate-950",
                                    "border-slate-200 dark:border-slate-800",
                                    "text-[12px] font-bold",
                                    "text-slate-900 dark:text-slate-100",
                                    "placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                )}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader
                                className="bg-slate-50/90 dark:bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
                                <TableRow>
                                    <ForecastHeader label="Brand" sKey="brandName" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig} className="pl-6 sm:pl-8"/>
                                    <ForecastHeader label="Category" sKey="category_name" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig}/>
                                    <ForecastHeader label="Product" sKey="productName" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig}/>
                                    <ForecastHeader label="On-Hand" sKey="currentStockBoxes" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig} className="text-center"/>
                                    <ForecastHeader label="In-Transit" sKey="inTransitBoxes" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig} className="text-center"/>
                                    <ForecastHeader label="Suggested" sKey="suggestedQty" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig} className="text-center"/>
                                    <ForecastHeader label="Order" sKey="orderQty" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig} className="text-center"/>
                                    <ForecastHeader label="Subtotal" sKey="subtotal" sortConfig={sortConfig}
                                                    setSortConfig={setSortConfig} className="text-right pr-6 sm:pr-8"/>

                                    {selectedMonths.map((m) => (
                                        <TableHead
                                            key={m}
                                            className="px-6 text-center text-[11px] font-black uppercase text-blue-700 dark:text-blue-300 border-l border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap"
                                        >
                                            {new Date(m).toLocaleDateString("en-US", {
                                                month: "short",
                                                year: "2-digit",
                                            })}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {visibleItems.map((item) => {
                                    const pricePerBox =
                                        Number(item.computedPricePerBox) ||
                                        Number(item.lastCost || 0) * Number(item.boxMultiplier || 1)

                                    const onHand = Number(item.currentStockBoxes ?? 0)
                                    const inTransit = Number(item.inTransitBoxes ?? 0)
                                    const suggested = Number(item.suggestedQty ?? 0)
                                    const isCritical = onHand + inTransit <= 0

                                    return (
                                        <TableRow
                                            key={item.product_id}
                                            className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-all border-b border-slate-200/50 dark:border-slate-800/50"
                                        >
                                            <TableCell className="pl-6 sm:pl-8 py-4 whitespace-nowrap">
                                                <span
                                                    className="text-[13px] font-black uppercase text-slate-800 dark:text-slate-200">
                                                    {item.brandName}
                                                </span>
                                            </TableCell>

                                            <TableCell className="px-4">
                                                <div
                                                    className={cn(
                                                        "inline-flex items-center gap-1 w-fit max-w-[220px]",
                                                        "text-[10px] font-black uppercase px-2 py-1 rounded-xl border",
                                                        "border-slate-200 dark:border-slate-800",
                                                        "bg-slate-50 dark:bg-slate-900",
                                                        "text-slate-800 dark:text-slate-200 truncate"
                                                    )}
                                                    title={item.category_name || "OTHERS"}
                                                >
                                                    <Layers
                                                        className="w-3 h-3 text-blue-600 dark:text-blue-300 shrink-0"/>
                                                    <span className="truncate">{item.category_name || "OTHERS"}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="px-4 min-w-[260px]">
                                                <div className="flex flex-col">
                                                    <span
                                                        className="text-[14px] font-black uppercase text-slate-900 dark:text-slate-100">
                                                        {item.productName}
                                                    </span>
                                                    <div className="flex gap-2 mt-1">
                                                        {item.abcClass && (
                                                            <span
                                                                className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md uppercase">
                                                                Class {item.abcClass}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell
                                                className={cn(
                                                    "text-center font-mono font-black text-[14px]",
                                                    isCritical ? "text-rose-600" : "text-orange-600"
                                                )}
                                            >
                                                {Number.isFinite(onHand) ? onHand.toFixed(1) : "0.0"}
                                            </TableCell>

                                            <TableCell
                                                className="text-center font-mono font-black text-[14px] text-blue-700 dark:text-blue-300">
                                                {Number.isFinite(inTransit) ? inTransit.toFixed(1) : "0.0"}
                                            </TableCell>

                                            <TableCell
                                                className="text-center font-mono font-black text-[14px] text-emerald-700 dark:text-emerald-300">
                                                {Number.isFinite(suggested) ? suggested.toFixed(0) : "0"}
                                            </TableCell>

                                            <TableCell className="px-4">
                                                <Input
                                                    type="number"
                                                    value={item.orderQty || ""}
                                                    onChange={(e) => updateQty(item.product_id, e.target.value)}
                                                    className={cn(
                                                        "h-9 w-24 mx-auto text-center font-black rounded-xl shadow-sm",
                                                        "bg-white dark:bg-slate-950",
                                                        "border-slate-200 dark:border-slate-800",
                                                        "text-slate-900 dark:text-slate-100",
                                                        "placeholder:text-slate-400 dark:placeholder:text-slate-600",
                                                        "focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                    )}
                                                />
                                            </TableCell>

                                            <TableCell
                                                className="pr-6 sm:pr-8 text-right font-mono font-black text-[15px] text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                ₱{(Number(item.orderQty || 0) * pricePerBox).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </TableCell>

                                            {selectedMonths.map((m) => {
                                                const formattedKey = formatMonthKey(m)
                                                const val = item.monthlyForecast?.[formattedKey] || 0
                                                return (
                                                    <TableCell
                                                        key={m}
                                                        className="px-6 text-center font-mono text-[13px] font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200/70 dark:border-slate-800/70"
                                                    >
                                                        {Math.ceil(Number(val)).toLocaleString()}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div
                        className="px-6 sm:px-8 py-5 lg:py-7 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 w-full">
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(v) => {
                                    setPageSize(parseInt(v))
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger
                                    className={cn(
                                        "h-9 w-[96px] rounded-xl font-black text-[12px]",
                                        "bg-white dark:bg-slate-950",
                                        "border-slate-200 dark:border-slate-800",
                                        "text-slate-900 dark:text-slate-100"
                                    )}
                                >
                                    <SelectValue/>
                                </SelectTrigger>

                                <SelectContent
                                    className={cn(
                                        "rounded-xl",
                                        "bg-white dark:bg-slate-950",
                                        "border-slate-200 dark:border-slate-800",
                                        "text-slate-900 dark:text-slate-100"
                                    )}
                                >
                                    <SelectItem value="10" className="font-bold text-slate-900 dark:text-slate-100">
                                        10
                                    </SelectItem>
                                    <SelectItem value="20" className="font-bold text-slate-900 dark:text-slate-100">
                                        20
                                    </SelectItem>
                                    <SelectItem value="50" className="font-bold text-slate-900 dark:text-slate-100">
                                        50
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <span
                                className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-widest min-w-[150px]">
                                Showing {Math.min(visibleItems.length, pageSize)} of {processedItems.length}
                            </span>
                        </div>

                        <div
                            className="flex items-center justify-between sm:justify-end gap-2 bg-white dark:bg-slate-950 p-2 lg:p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-full lg:w-auto">
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                    "rounded-xl",
                                    "bg-white dark:bg-slate-950",
                                    "border-slate-200 dark:border-slate-800",
                                    "text-slate-900 dark:text-slate-100",
                                    "hover:bg-slate-100 dark:hover:bg-slate-900"
                                )}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </Button>

                            <div
                                className={cn(
                                    "flex items-center justify-center px-4 sm:px-6 h-10 rounded-xl border",
                                    "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50",
                                    "text-[12px] font-black uppercase tracking-tighter whitespace-nowrap min-w-[100px]",
                                    "text-slate-900 dark:text-slate-100"
                                )}
                            >
                                Page {safePage} / {totalPages}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                    "rounded-xl",
                                    "bg-white dark:bg-slate-950",
                                    "border-slate-200 dark:border-slate-800",
                                    "text-slate-900 dark:text-slate-100",
                                    "hover:bg-slate-100 dark:hover:bg-slate-900"
                                )}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                </div>
            </TooltipProvider>
        )
    }
)

ForecastPlanningTable.displayName = "ForecastPlanningTable"