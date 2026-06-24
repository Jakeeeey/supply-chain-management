"use client"

import {useState, useEffect, useMemo} from "react"
import {Button} from "@/components/ui/button"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
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
} from "lucide-react"
import {cn} from "@/lib/utils"

import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover"
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command"
import {Checkbox} from "@/components/ui/checkbox"

// IMPORT THE NEW SERVICES
import {fetchSuppliers, fetchBranches} from "../services/purchase-planning-api"

interface Supplier {
    id: string | number
    supplier_name: string
}

interface Branch {
    id: string | number
    branchName: string
    isActive?: boolean | number
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

    const [supplierId, setSupplierId] = useState<string>("")
    const [selectedBranches, setSelectedBranches] = useState<string[]>([])
    const [selectedMonths, setSelectedMonths] = useState<string[]>([])
    const [localMode, setLocalMode] = useState<"historical" | "forecast">("historical")
    const [selectedYear, setSelectedYear] = useState<string>("2026")

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
                setSuppliers(supResult as Supplier[])
                setBranches(brResult as Branch[])
            } catch (error) {
                console.error("❌ Toolbar Sync Error:", error)
            } finally {
                setIsLoadingSuppliers(false)
                setIsLoadingBranches(false)
            }
        }

        fetchData()
    }, [])

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

    if (!mounted) return <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] animate-pulse"/>

    return (
        <div className="w-full relative z-[80]">
            <div
                className="flex flex-col gap-3 bg-white dark:bg-[#0f172a] p-3 md:p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md transition-all">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-end">
                    {/* Mode Selector */}
                    <div className="xl:col-span-3 flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Mode</label>
                        <div
                            className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setLocalMode("historical")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] font-black rounded-md transition-all uppercase",
                                    localMode === "historical" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-600 dark:text-slate-400"
                                )}
                            >
                                <History className="w-3.5 h-3.5"/> Historical
                            </button>
                            <button
                                onClick={() => setLocalMode("forecast")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] font-black rounded-md transition-all uppercase",
                                    localMode === "forecast" ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-600 dark:text-slate-400"
                                )}
                            >
                                <BrainCircuit className="w-3.5 h-3.5"/> Forecast
                            </button>
                        </div>
                    </div>

                    {/* Year Select */}
                    <div className="xl:col-span-1 flex flex-col gap-1">
                        <label
                            className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Year</label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger
                                className="h-8 rounded-md font-bold text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                <SelectValue placeholder="Select year"/>
                            </SelectTrigger>
                            <SelectContent className="rounded-md">
                                <SelectItem value="2025" className="font-bold">2025</SelectItem>
                                <SelectItem value="2026" className="font-bold">2026</SelectItem>
                                <SelectItem value="2027" className="font-bold">2027</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Supplier Partner */}
                    <div className="xl:col-span-4 flex flex-col gap-1 relative">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Supplier Partner</label>
                        <Popover open={isSupplierOpen} onOpenChange={setIsSupplierOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    id="supplier-trigger"
                                    className={cn(
                                        "h-8 w-full flex items-center justify-between px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md cursor-pointer transition-all hover:border-blue-500 outline-none text-left",
                                        isSupplierOpen && "ring-1 ring-blue-500 border-blue-500"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 truncate">
                                        {isLoadingSuppliers ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> :
                                            <Building2 className="w-3.5 h-3.5 text-slate-400"/>}
                                        <span
                                            className={cn("text-xs font-bold truncate uppercase", supplierId ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic")}>
                                            {selectedSupplierName}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isSupplierOpen && "rotate-180")}/>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[--radix-popover-trigger-width] p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-lg overflow-hidden"
                                align="start"
                            >
                                <Command>
                                    <CommandInput placeholder="Search partner..." className="h-8 text-xs" />
                                    <CommandList className="max-h-[220px]">
                                        <CommandEmpty>No partners found.</CommandEmpty>
                                        <CommandGroup className="p-1">
                                            {suppliers.map((s) => (
                                                <CommandItem
                                                    key={s.id}
                                                    value={s.supplier_name}
                                                    onSelect={() => {
                                                        setSupplierId(String(s.id));
                                                        setIsSupplierOpen(false);
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-[10px] font-bold uppercase transition-all text-slate-900 dark:text-slate-100",
                                                        supplierId === String(s.id) && "text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800"
                                                    )}
                                                >
                                                    <span className="truncate">{s.supplier_name}</span>
                                                    {supplierId === String(s.id) && <Check className="w-3 h-3 shrink-0 text-blue-600 dark:text-blue-400"/>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Branch Locations */}
                    <div className="xl:col-span-4 flex flex-col gap-1 relative">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Active Branches</label>
                        <Popover open={isBranchOpen} onOpenChange={setIsBranchOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    id="branch-trigger"
                                    className={cn(
                                        "h-8 w-full flex items-center justify-between px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md cursor-pointer transition-all hover:border-blue-500 outline-none text-left",
                                        isBranchOpen && "ring-1 ring-blue-500 border-blue-500"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 truncate">
                                        <MapPin
                                            className={cn("w-3.5 h-3.5", selectedBranches.length > 0 ? "text-blue-500" : "text-slate-400")}/>
                                        <span
                                            className={cn("text-xs font-bold truncate uppercase", selectedBranches.length === 0 ? "text-slate-400" : "text-slate-900 dark:text-slate-100")}>
                                            {selectedBranches.length === 0 ? "Identify Locations" : `${selectedBranches.length} Selected`}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isBranchOpen && "rotate-180")}/>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[--radix-popover-trigger-width] p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-lg overflow-hidden"
                                align="start"
                            >
                                <Command>
                                    <CommandInput placeholder="Search location..." className="h-8 text-xs" />
                                    <CommandList className="max-h-[220px]">
                                        <CommandEmpty>No locations found.</CommandEmpty>
                                        <CommandGroup className="p-1">
                                            {branches.map((b) => {
                                                const isSelected = selectedBranches.includes(String(b.id));
                                                const isInactive = b.isActive === false || b.isActive === 0;
                                                return (
                                                    <CommandItem
                                                        key={b.id}
                                                        value={b.branchName}
                                                        onSelect={() => {
                                                            toggleBranch(String(b.id));
                                                        }}
                                                        className={cn(
                                                            "flex items-center justify-between px-2 py-1 rounded cursor-pointer text-[10px] font-bold transition-all uppercase text-slate-900 dark:text-slate-100",
                                                            isSelected && "text-blue-600 dark:text-blue-400"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                className={cn(
                                                                    "pointer-events-none shrink-0 w-3.5 h-3.5 border-slate-300 dark:border-slate-700",
                                                                    isSelected ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400" : ""
                                                                )}
                                                            />
                                                            <span className="truncate">{b.branchName}</span>
                                                            {isInactive && (
                                                                <span className={cn(
                                                                    "px-1 py-0.2 text-[7px] rounded font-black tracking-widest shrink-0 uppercase bg-slate-200 dark:bg-slate-700 text-slate-500"
                                                                )}>
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Periods & Action */}
                <div
                    className="flex flex-col xl:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex flex-col gap-1 w-full xl:w-auto">
                        <div className="flex items-center justify-between xl:justify-start gap-4">
                            <label
                                className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5"/> Selected Periods <span
                                className="text-blue-500 font-black">[{selectedMonths.length}]</span>
                            </label>
                            <button
                                onClick={() => setSelectedMonths(selectedMonths.length === months.length ? [] : months)}
                                className="text-[9px] font-black text-blue-600 uppercase hover:underline">
                                {selectedMonths.length === months.length ? "deselect all" : "select all"}
                            </button>
                        </div>
                        <div 
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden"
                        >
                            {months.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => toggleMonth(m)}
                                    className={cn(
                                        "px-3 h-7 text-[10px] font-black rounded-md transition-all border uppercase whitespace-nowrap",
                                        selectedMonths.includes(m) ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800"
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
                                "w-full xl:w-[200px] h-9 rounded-md font-black gap-2 text-white uppercase shadow transition-all text-xs",
                                localMode === "historical" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700",
                                isLoadDisabled && "opacity-20 grayscale pointer-events-none"
                            )}
                        >
                            {isDataLoading ? <Loader2 className="w-4 h-4 animate-spin"/> :
                                <Database className="w-4 h-4"/>}
                            {isDataLoading ? "Connecting..." : "LOAD DATA"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}