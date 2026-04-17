"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Package, Inbox, CheckSquare, Square, ListChecks, Ban, ArrowRight, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// 🚀 IMPORT THE REFACTORED SERVICE
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
                try {
                    // ✅ USING THE SERVICE FUNCTION INSTEAD OF RAW FETCH
                    const result = await fetchInTransitPOs(supplierId) as PurchaseOrder[]

                    if (isMounted) {
                        // Mapping to ensure ID is a string for selection tracking
                        const sanitizedData = result.map((po: PurchaseOrder): PurchaseOrder => ({
                            ...po,
                            id: String(po.id)
                        }))

                        setPendingPOs(sanitizedData)
                        // Default to selecting all POs initially
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

    const handleConfirm = () => {
        setIsProcessing(true)
        const selectedData = pendingPOs.filter(po => selectedPoIds.includes(po.id))

        // Brief delay for better UX feedback during "Coupling"
        setTimeout(() => {
            onConfirm(selectedData)
            setOpen(false)
            setIsProcessing(false)
        }, 600)
    }

    const handleSkip = () => {
        setIsProcessing(true)
        setTimeout(() => {
            onConfirm([])
            setOpen(false)
            setIsProcessing(false)
        }, 400)
    }

    const toggleSelectAll = () => {
        if (selectedPoIds.length === pendingPOs.length) {
            setSelectedPoIds([])
        } else {
            setSelectedPoIds(pendingPOs.map(po => po.id))
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !isProcessing && setOpen(val)}>
            <DialogContent
                className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 transition-all duration-300">
                <div className="p-8 space-y-6">
                    <DialogHeader>
                        <div className="space-y-1 text-left">
                            <DialogTitle
                                className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-slate-50">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                    <Package className="text-blue-600 dark:text-blue-400 w-6 h-6" />
                                </div>
                                Select Active In-Transit Purchase Orders
                            </DialogTitle>
                            <DialogDescription
                                className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                Select which pending Purchase Orders should be included in the calculation. Uncheck POs
                                that are delayed or unreliable.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="min-h-[220px] flex flex-col">
                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 w-10 h-10" />
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse">Scanning
                                    Active POs...</p>
                            </div>
                        ) : error ? (
                            <div
                                className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-red-50 dark:bg-red-900/10 rounded-3xl border-2 border-dashed border-red-200">
                                <p className="text-xs font-bold text-red-600 uppercase">{error}</p>
                                <Button variant="ghost" size="sm" onClick={() => window.location.reload()}
                                        className="mt-2 text-[10px] font-black">Retry Sync</Button>
                            </div>
                        ) : pendingPOs.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                        {pendingPOs.length} Pending Delivery
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isProcessing}
                                        onClick={toggleSelectAll}
                                        className="h-7 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                    >
                                        {selectedPoIds.length === pendingPOs.length ? "Deselect All" : "Select All"}
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                                    {pendingPOs.map(po => {
                                        const isSelected = selectedPoIds.includes(po.id)
                                        return (
                                            <div
                                                key={po.id}
                                                onClick={() => !isProcessing && setSelectedPoIds(prev => isSelected ? prev.filter(i => i !== po.id) : [...prev, po.id])}
                                                className={cn(
                                                    "group flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                                    isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]",
                                                    isSelected
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                        : "bg-slate-50 dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-slate-600 dark:text-slate-300"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={cn("p-2 rounded-lg", isSelected ? "bg-white/20" : "bg-white dark:bg-slate-800 shadow-sm")}>
                                                        <ListChecks
                                                            className={cn("w-4 h-4", isSelected ? "text-white" : "text-blue-600")} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm leading-none tracking-tight">
                                                            {po.purchase_order_no}
                                                        </p>
                                                        <p className={cn("text-[10px] mt-1.5 font-bold uppercase tracking-wide", isSelected ? "text-blue-100" : "text-slate-400")}>
                                                            REF: {po.id} <span
                                                            className="mx-2 opacity-30">|</span> {po.date}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected ? <CheckSquare
                                                        className="w-5 h-5 animate-in zoom-in-75 duration-200" /> :
                                                    <Square className="w-5 h-5 opacity-20" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <div
                                    className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter italic">Zero
                                    In-Transit</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 max-w-[220px] leading-relaxed uppercase">
                                    No active purchase orders found for this supplier.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-col gap-3 pt-2">
                        <Button
                            disabled={isLoading || isProcessing}
                            onClick={handleConfirm}
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/30 transition-all active:scale-95"
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Coupling Data...
                                </>
                            ) : (
                                <>
                                    {pendingPOs.length > 0 ? "Confirm & Load" : "Establish Dashboard"}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </Button>

                        <div className="flex items-center gap-3 w-full">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setOpen(false)}
                                className="flex-1 h-12 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500"
                            >
                                <Ban className="w-3 h-3 mr-2" /> Cancel
                            </Button>
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={handleSkip}
                                className={cn(
                                    "flex-1 text-[10px] font-black uppercase tracking-widest transition-colors",
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