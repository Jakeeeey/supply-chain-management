"use client"

import {useState, useEffect, useMemo, useRef} from "react"
import {createPortal} from "react-dom"
import {Button} from "@/components/ui/button"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Input} from "@/components/ui/input"
import {
    Database,
    BrainCircuit,
    Loader2,
    Building2,
    Calendar,
    MapPin,
    Check,
    ChevronDown,
    History,
    Info,
} from "lucide-react"
import {cn} from "@/lib/utils"

// IMPORT THE NEW SERVICES
import {fetchSuppliers, fetchBranches} from "../services/purchase-planning-api"

interface Supplier {
    id: string | number
    supplier_name: string
}

interface Branch {
    id: string | number
    branchName: string
}

interface PlanningToolbarProps {
    onLoad: (
        selectedMonths: string[],
        mode: "historical" | "forecast",
        selectedYear: string,
        supplierId: string,
        selectedBranches: string[]
    ) => void
    onBranchChange?: (selectedBranches: string[]) => void // 🚀 NEW PROP
}

type PopoverPos = {
    top: number
    left: number
    width: number
    placement: "bottom" | "top"
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

export function PlanningToolbar({onLoad, onBranchChange}: PlanningToolbarProps) {
    const monthMap: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    }
    const months = Object.keys(monthMap)

    const [mounted, setMounted] = useState(false)
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true)
    const [isLoadingBranches, setIsLoadingBranches] = useState(true)

    const [isBranchOpen, setIsBranchOpen] = useState(false)
    const [isSupplierOpen, setIsSupplierOpen] = useState(false)

    const supplierTriggerRef = useRef<HTMLDivElement>(null)
    const branchTriggerRef = useRef<HTMLDivElement>(null)
    const branchDropdownRef = useRef<HTMLDivElement>(null)
    const supplierDropdownRef = useRef<HTMLDivElement>(null)
    const supplierPopoverRef = useRef<HTMLDivElement>(null)
    const branchPopoverRef = useRef<HTMLDivElement>(null)

    const [supplierPopoverPos, setSupplierPopoverPos] = useState<PopoverPos | null>(null)
    const [branchPopoverPos, setBranchPopoverPos] = useState<PopoverPos | null>(null)

    const [supplierId, setSupplierId] = useState<string>("")
    const [selectedBranches, setSelectedBranches] = useState<string[]>([])
    const [selectedMonths, setSelectedMonths] = useState<string[]>([])
    const [localMode, setLocalMode] = useState<"historical" | "forecast">("historical")
    const [selectedYear, setSelectedYear] = useState<string>("2026")

    const [branchSearch, setBranchSearch] = useState("")
    const [supplierSearch, setSupplierSearch] = useState("")

    // 🚀 SYNC BRANCHES TO PARENT IN REAL-TIME
    useEffect(() => {
        if (onBranchChange) {
            onBranchChange(selectedBranches);
        }
    }, [selectedBranches, onBranchChange]);

    useEffect(() => {
        setMounted(true)

        async function fetchData() {
            try {
                const [supResult, brResult] = await Promise.all([
                    fetchSuppliers("TRADE"),
                    fetchBranches()
                ])
                setSuppliers(supResult)
                setBranches(brResult)
            } catch (error) {
                console.error("❌ Toolbar Sync Error:", error)
            } finally {
                setIsLoadingSuppliers(false)
                setIsLoadingBranches(false)
            }
        }

        fetchData()

        const handleClickOutside = (event: MouseEvent) => {
            const t = event.target as Node
            const insideSupplier = (supplierDropdownRef.current?.contains(t)) || (supplierPopoverRef.current?.contains(t))
            const insideBranch = (branchDropdownRef.current?.contains(t)) || (branchPopoverRef.current?.contains(t))
            if (!insideSupplier) setIsSupplierOpen(false)
            if (!insideBranch) setIsBranchOpen(false)
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filteredBranches = useMemo(() => {
        return branches.filter((b) => (b.branchName || "").toLowerCase().includes(branchSearch.toLowerCase()))
    }, [branches, branchSearch])

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter((s) => (s.supplier_name || "").toLowerCase().includes(supplierSearch.toLowerCase()))
    }, [suppliers, supplierSearch])

    const selectedSupplierName = useMemo(() => {
        return suppliers.find((s) => String(s.id) === supplierId)?.supplier_name || "Identify Partner"
    }, [suppliers, supplierId])

    const handleLoadTrigger = () => {
        const formattedMonths = selectedMonths.map((m) => `${selectedYear}-${monthMap[m]}-01`)
        formattedMonths.sort()
        onLoad(formattedMonths, localMode, selectedYear, supplierId, selectedBranches)
    }

    const toggleMonth = (month: string) => {
        setSelectedMonths((prev) => (prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]))
    }

    const toggleBranch = (id: string) => {
        setSelectedBranches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
    }

    const isDataLoading = isLoadingSuppliers || isLoadingBranches
    const isLoadDisabled = !supplierId || selectedBranches.length === 0 || selectedMonths.length === 0 || isDataLoading

    const computePopoverPos = (el: HTMLDivElement | null): PopoverPos | null => {
        if (!el) return null
        const rect = el.getBoundingClientRect()
        const gap = 8
        const preferBottomSpace = window.innerHeight - rect.bottom
        const preferTopSpace = rect.top
        const placement: "bottom" | "top" = preferBottomSpace < 340 && preferTopSpace > preferBottomSpace ? "top" : "bottom"
        const width = Math.max(280, rect.width)
        const left = clamp(rect.left, 8, Math.max(8, window.innerWidth - width - 8))
        const top = placement === "bottom" ? rect.bottom + gap : rect.top - gap
        return {top, left, width, placement}
    }

    const syncSupplierPos = () => setSupplierPopoverPos(computePopoverPos(supplierTriggerRef.current))
    const syncBranchPos = () => setBranchPopoverPos(computePopoverPos(branchTriggerRef.current))

    useEffect(() => {
        if (!mounted) return
        const onRelayout = () => {
            if (isSupplierOpen) syncSupplierPos()
            if (isBranchOpen) syncBranchPos()
        }
        window.addEventListener("resize", onRelayout)
        window.addEventListener("scroll", onRelayout, true)
        return () => {
            window.removeEventListener("resize", onRelayout)
            window.removeEventListener("scroll", onRelayout, true)
        }
    }, [mounted, isSupplierOpen, isBranchOpen])

    const openSupplier = () => {
        const next = !isSupplierOpen
        setIsSupplierOpen(next)
        if (next) requestAnimationFrame(syncSupplierPos)
    }

    const openBranch = () => {
        const next = !isBranchOpen
        setIsBranchOpen(next)
        if (next) requestAnimationFrame(syncBranchPos)
    }

    if (!mounted) return <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] animate-pulse"/>

    return (
        <div className="w-full relative z-[80]">
            <div
                className="flex flex-col gap-6 bg-white dark:bg-[#0f172a] p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl transition-all">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-end">
                    {/* Mode Selector */}
                    <div className="xl:col-span-3 flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select
                            Mode</label>
                        <div
                            className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setLocalMode("historical")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 h-10 text-[10px] font-black rounded-lg transition-all uppercase",
                                    localMode === "historical" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-600 dark:text-slate-400"
                                )}
                            >
                                <History className="w-4 h-4"/> Historical
                            </button>
                            <button
                                onClick={() => setLocalMode("forecast")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 h-10 text-[10px] font-black rounded-lg transition-all uppercase",
                                    localMode === "forecast" ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-600 dark:text-slate-400"
                                )}
                            >
                                <BrainCircuit className="w-4 h-4"/> Forecast
                            </button>
                        </div>
                    </div>

                    {/* Year Select */}
                    <div className="xl:col-span-1 flex flex-col gap-2">
                        <label
                            className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Year</label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger
                                className="h-12 rounded-xl font-bold text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                <SelectValue placeholder="Select year"/>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="2025" className="font-bold">2025</SelectItem>
                                <SelectItem value="2026" className="font-bold">2026</SelectItem>
                                <SelectItem value="2027" className="font-bold">2027</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Supplier Partner */}
                    <div className="xl:col-span-4 flex flex-col gap-2 relative" ref={supplierDropdownRef}>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Supplier
                            Partner</label>
                        <div
                            ref={supplierTriggerRef}
                            onClick={openSupplier}
                            className={cn(
                                "h-12 flex items-center justify-between px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer transition-all hover:border-blue-500",
                                isSupplierOpen && "ring-2 ring-blue-500/20 border-blue-500"
                            )}
                        >
                            <div className="flex items-center gap-2 truncate">
                                {isLoadingSuppliers ? <Loader2 className="w-4 h-4 animate-spin text-blue-500"/> :
                                    <Building2 className="w-4 h-4 text-slate-400"/>}
                                <span
                                    className={cn("text-xs font-bold truncate uppercase", supplierId ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic")}>
                  {selectedSupplierName}
                </span>
                            </div>
                            <ChevronDown
                                className={cn("w-4 h-4 text-slate-400 transition-transform", isSupplierOpen && "rotate-180")}/>
                        </div>
                    </div>

                    {/* Branch Locations */}
                    <div className="xl:col-span-4 flex flex-col gap-2 relative" ref={branchDropdownRef}>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Active
                            Branches</label>
                        <div
                            ref={branchTriggerRef}
                            onClick={openBranch}
                            className={cn(
                                "h-12 flex items-center justify-between px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer transition-all hover:border-blue-500",
                                isBranchOpen && "ring-2 ring-blue-500/20 border-blue-500"
                            )}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <MapPin
                                    className={cn("w-4 h-4", selectedBranches.length > 0 ? "text-blue-500" : "text-slate-400")}/>
                                <span
                                    className={cn("text-xs font-bold truncate uppercase", selectedBranches.length === 0 ? "text-slate-400" : "text-slate-900 dark:text-slate-100")}>
                  {selectedBranches.length === 0 ? "Identify Locations" : `${selectedBranches.length} Selected`}
                </span>
                            </div>
                            <ChevronDown
                                className={cn("w-4 h-4 text-slate-400 transition-transform", isBranchOpen && "rotate-180")}/>
                        </div>
                    </div>
                </div>

                {/* Periods & Action */}
                <div
                    className="flex flex-col xl:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex flex-col gap-3 w-full xl:w-auto">
                        <div className="flex items-center justify-between xl:justify-start gap-4">
                            <label
                                className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Calendar className="w-4 h-4"/> Selected Periods <span
                                className="text-blue-500 font-black">[{selectedMonths.length}]</span>
                            </label>
                            <button
                                onClick={() => setSelectedMonths(selectedMonths.length === months.length ? [] : months)}
                                className="text-[10px] font-black text-blue-600 uppercase hover:underline">
                                {selectedMonths.length === months.length ? "deselect all" : "select all"}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {months.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => toggleMonth(m)}
                                    className={cn(
                                        "px-5 h-9 text-[11px] font-black rounded-full transition-all border uppercase whitespace-nowrap",
                                        selectedMonths.includes(m) ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full xl:w-auto">
                        <Button
                            onClick={handleLoadTrigger}
                            disabled={isLoadDisabled}
                            className={cn(
                                "w-full xl:w-[280px] h-14 rounded-2xl font-black gap-3 text-white uppercase shadow-xl transition-all",
                                localMode === "historical" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700",
                                isLoadDisabled && "opacity-20 grayscale pointer-events-none"
                            )}
                        >
                            {isDataLoading ? <Loader2 className="w-5 h-5 animate-spin"/> :
                                <Database className="w-5 h-5"/>}
                            {isDataLoading ? "Connecting..." : "LOAD DATA"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* PORTALS */}
            {mounted && isSupplierOpen && supplierPopoverPos && createPortal(
                <div ref={supplierPopoverRef}
                     className="fixed z-[9999] rounded-2xl shadow-2xl border p-3 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700"
                     style={{
                         top: supplierPopoverPos.top,
                         left: supplierPopoverPos.left,
                         width: supplierPopoverPos.width,
                         transform: supplierPopoverPos.placement === "top" ? "translateY(-100%)" : undefined
                     }}>
                    <Input placeholder="Search partner..." className="h-9 mb-2 text-xs" value={supplierSearch}
                           onChange={(e) => setSupplierSearch(e.target.value)}/>
                    <div className="max-h-[320px] overflow-y-auto flex flex-col gap-1 pr-1">
                        {filteredSuppliers.map((s) => (
                            <div key={s.id} onClick={() => {
                                setSupplierId(String(s.id));
                                setIsSupplierOpen(false);
                            }}
                                 className={cn("flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-[11px] font-bold uppercase transition-all", supplierId === String(s.id) ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100")}>
                                <span className="truncate">{s.supplier_name}</span>
                                {supplierId === String(s.id) && <Check className="w-3.5 h-3.5"/>}
                            </div>
                        ))}
                    </div>
                </div>, document.body
            )}

            {mounted && isBranchOpen && branchPopoverPos && createPortal(
                <div ref={branchPopoverRef}
                     className="fixed z-[9999] rounded-2xl shadow-2xl border p-3 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700"
                     style={{
                         top: branchPopoverPos.top,
                         left: branchPopoverPos.left,
                         width: branchPopoverPos.width,
                         transform: branchPopoverPos.placement === "top" ? "translateY(-100%)" : undefined
                     }}>
                    <Input placeholder="Search location..." className="h-9 mb-2 text-xs" value={branchSearch}
                           onChange={(e) => setBranchSearch(e.target.value)}/>
                    <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 pr-1">
                        {filteredBranches.map((b) => (
                            <div key={b.id} onClick={() => toggleBranch(String(b.id))}
                                 className={cn("flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-[11px] font-bold transition-all uppercase", selectedBranches.includes(String(b.id)) ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100")}>
                                <span className="truncate">{b.branchName}</span>
                                {selectedBranches.includes(String(b.id)) && <Check className="w-3.5 h-3.5"/>}
                            </div>
                        ))}
                    </div>
                </div>, document.body
            )}
        </div>
    )
}