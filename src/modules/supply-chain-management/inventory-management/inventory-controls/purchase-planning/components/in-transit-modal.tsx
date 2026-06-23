"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Package, Inbox, CheckSquare, Square, Ban, ArrowRight, RefreshCw, Search } from "lucide-react"
import { cn } from "@/lib/utils"

import { fetchInTransitPOs } from "../services/purchase-planning-api"
import { PurchaseOrder } from "../types"

interface InTransitModalProps {
    open: boolean
    setOpen: (open: boolean) => void
    onConfirm: (selectedPOs: PurchaseOrder[]) => void
    supplierId: string | null
}

export function InTransitModal({ open, setOpen, onConfirm, supplierId }: InTransitModalProps) {
    const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([])
    const [selectedPoIds, setSelectedPoIds] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        if (open && supplierId) {
            const loadPOs = async () => {
                setIsLoading(true)
                setIsProcessing(false)
                setError(null)
                setSearchTerm("")
                try {
                    const result = await fetchInTransitPOs(supplierId) as PurchaseOrder[]

                    if (isMounted) {
                        const sanitizedData = result.map((po: PurchaseOrder): PurchaseOrder => ({
                            ...po,
                            id: String(po.id)
                        }))

                        setPendingPOs(sanitizedData)
                        setSelectedPoIds(sanitizedData.map((p: PurchaseOrder) => p.id))
                    }
                } catch (e: unknown) {
                    console.error("❌ In-Transit Modal Sync Error:", e)
                    const m = e instanceof Error ? e.message : "Could not sync with Purchase Orders"
                    if (isMounted) setError(m)
                } finally {
                    if (isMounted) setIsLoading(false)
                }
            }
            loadPOs()
        }
        return () => {
            isMounted = false
        }
    }, [open, supplierId])

    const filteredPOs = pendingPOs.filter(po => 
        (po.purchase_order_no?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        String(po.id).toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleConfirm = () => {
        setIsProcessing(true)
        const selectedData = pendingPOs.filter(po => selectedPoIds.includes(po.id))

        setTimeout(() => {
            onConfirm(selectedData)
            setOpen(false)
            setIsProcessing(false)
        }, 300)
    }

    const handleSkip = () => {
        setIsProcessing(true)
        setTimeout(() => {
            onConfirm([])
            setOpen(false)
            setIsProcessing(false)
        }, 200)
    }

    const toggleSelectAll = () => {
        const activeList = filteredPOs.length > 0 ? filteredPOs : pendingPOs
        const activeIds = activeList.map(po => po.id)
        const allSelected = activeIds.every(id => selectedPoIds.includes(id))

        if (allSelected) {
            setSelectedPoIds(prev => prev.filter(id => !activeIds.includes(id)))
        } else {
            setSelectedPoIds(prev => Array.from(new Set([...prev, ...activeIds])))
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !isProcessing && setOpen(val)}>
            <DialogContent
                className="sm:max-w-[420px] rounded-md p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-950 transition-all duration-200">
                <div className="p-4 space-y-4">
                    <DialogHeader>
                        <div className="space-y-1 text-left">
                            <DialogTitle
                                className="text-base font-black flex items-center gap-2.5 text-slate-900 dark:text-slate-50">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                    <Package className="text-blue-600 dark:text-blue-400 w-4 h-4" />
                                </div>
                                In-Transit Purchase Orders
                            </DialogTitle>
                            <DialogDescription
                                className="font-bold text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Select active shipments to include in the calculations. Uncheck delayed orders.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="min-h-[180px] flex flex-col">
                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-2">
                                <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 w-8 h-8" />
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider animate-pulse">Scanning Active POs...</p>
                            </div>
                        ) : error ? (
                            <div
                                className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-md border border-dashed border-red-200">
                                <p className="text-[10px] font-bold text-red-600 uppercase">{error}</p>
                                <Button variant="ghost" size="sm" onClick={() => window.location.reload()}
                                        className="mt-2 h-7 text-[9px] font-black uppercase">Retry Sync</Button>
                            </div>
                        ) : pendingPOs.length > 0 ? (
                            <div className="space-y-3">
                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by PO Number..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-8 px-8 pr-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold uppercase"
                                    />
                                </div>

                                <div className="flex justify-between items-center px-0.5">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        {filteredPOs.length} of {pendingPOs.length} POs Displayed
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isProcessing}
                                        onClick={toggleSelectAll}
                                        className="h-6 px-2 text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                    >
                                        Toggle Selection
                                    </Button>
                                </div>

                                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                    {filteredPOs.map(po => {
                                        const isSelected = selectedPoIds.includes(po.id)
                                        return (
                                            <div
                                                key={po.id}
                                                onClick={() => !isProcessing && setSelectedPoIds(prev => isSelected ? prev.filter(i => i !== po.id) : [...prev, po.id])}
                                                className={cn(
                                                    "group flex items-center justify-between p-2.5 rounded-md border transition-all select-none",
                                                    isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]",
                                                    isSelected
                                                        ? "bg-blue-50 dark:bg-blue-950/20 border-blue-500 text-blue-700 dark:text-blue-300"
                                                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="shrink-0">
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-700" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-xs leading-none tracking-tight truncate">
                                                            {po.purchase_order_no}
                                                        </p>
                                                        <p className="text-[9px] mt-1 font-bold text-slate-400 uppercase tracking-wide">
                                                            ID: {po.id} <span className="mx-1 opacity-45">|</span> {po.date}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900/40 rounded-md border border-dashed border-slate-200 dark:border-slate-800">
                                <div
                                    className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-3">
                                    <Inbox className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter italic">Zero In-Transit</h3>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed uppercase">
                                    No active purchase orders found for this supplier.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-col gap-2 pt-1">
                        <Button
                            disabled={isLoading || isProcessing}
                            onClick={handleConfirm}
                            className="w-full h-10 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-wider transition-all active:scale-[0.98]"
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4.5 w-4.5 animate-spin" />
                                    Coupling Data...
                                </>
                            ) : (
                                <>
                                    {pendingPOs.length > 0 ? "Confirm & Load" : "Establish Dashboard"}
                                    <ArrowRight className="ml-2 w-3.5 h-3.5" />
                                </>
                            )}
                        </Button>

                        <div className="flex items-center gap-2 w-full">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setOpen(false)}
                                className="flex-1 h-9 rounded-md border border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50"
                            >
                                <Ban className="w-3.5 h-3.5 mr-1.5" /> Cancel
                            </Button>
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={handleSkip}
                                className={cn(
                                    "flex-1 text-[9px] font-black uppercase tracking-wider transition-colors text-center py-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-md border border-transparent",
                                    isProcessing ? "text-slate-200" : "text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400"
                                )}
                            >
                                {isProcessing ? "Wait..." : "Ignore Shipments"}
                            </button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}