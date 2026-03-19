"use client"

import React, {useState, useEffect, useMemo} from "react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    CheckCircle2,
    X,
    Send,
    Loader2,
    Hash,
    Boxes,
    FileSearch,
    Download,
    Ban,
    ClipboardList,
    Calendar,
    MapPin
} from "lucide-react"
import {Button} from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {toast} from "sonner"

// 🚀 IMPORT YOUR API SERVICES
import {submitPurchaseOrder, fetchBranches} from "../services/purchase-planning-api"

interface SuccessModalProps {
    isOpen: boolean
    onClose: () => void
    supplierId: string
    branchIds: string[]
    prNumber: string
    items: {
        product_id: string
        brand: string
        product_name: string
        orderQty: number
        suggestedOrderBox: number
        lastCost: number
        boxMultiplier: number
        total: number
    }[]
}

export function PurchaseRequestSuccessModal({
                                                isOpen,
                                                onClose,
                                                supplierId,
                                                branchIds = [],
                                                prNumber,
                                                items,
                                            }: SuccessModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [savedPoNumber, setSavedPoNumber] = useState<string | null>(null)
    const [allBranches, setAllBranches] = useState<any[]>([])
    const [targetBranchId, setTargetBranchId] = useState<string>("")

    useEffect(() => {
        if (isOpen) {
            fetchBranches()
                .then((data) => setAllBranches(data))
                .catch((err) => console.error("Error fetching branches:", err))
        }
    }, [isOpen])

    const filteredBranches = useMemo(() => {
        if (allBranches.length === 0) return []
        if (branchIds.length > 0) {
            return allBranches.filter(b =>
                branchIds.includes(String(b.id || b.branch_id))
            )
        }
        return allBranches
    }, [allBranches, branchIds])

    useEffect(() => {
        if (filteredBranches.length > 0 && !targetBranchId) {
            setTargetBranchId(String(filteredBranches[0].id || filteredBranches[0].branch_id))
        }
    }, [filteredBranches])

    const grandTotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100
    const currentDate = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    const generatePDFBlob = () => {
        const doc = new jsPDF()
        const displayId = savedPoNumber ? savedPoNumber : prNumber
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 40, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("PURCHASE ORDER", 15, 20)
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("SUPPLY CHAIN MANAGEMENT SYSTEM", 15, 28)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text("REFERENCE NUMBER:", 15, 55)
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(displayId, 15, 62)

        autoTable(doc, {
            startY: 75,
            head: [['BRAND', 'PRODUCT DESCRIPTION', 'QTY', 'TOTAL AMOUNT']],
            body: items.map(item => [
                item.brand.toUpperCase(),
                item.product_name.toUpperCase(),
                item.orderQty.toLocaleString(),
                `P${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}`
            ]),
            theme: 'striped',
            headStyles: {fillColor: [15, 23, 42]},
        })
        return doc
    }

    const handleDownloadPDF = () => {
        const doc = generatePDFBlob()
        doc.save(`${savedPoNumber || 'PO-Draft'}.pdf`)
    }

    const handleConfirmSubmission = async () => {
        if (!targetBranchId) {
            toast.error("Please select a receiving branch");
            return;
        }
        setIsSubmitting(true);
        try {
            const payloadItems = items.map(item => ({
                productId: parseInt(item.product_id),
                orderQty: item.orderQty,
                unitCost: Number(item.lastCost) * Number(item.boxMultiplier)
            }));
            const response = await submitPurchaseOrder({
                supplierId: parseInt(supplierId),
                branchId: parseInt(targetBranchId),
                remarks: "System Generated via VOS Planning Engine",
                items: payloadItems
            });
            setSavedPoNumber(response.poNumber);
            toast.success(`✅ Success: ${response.poNumber} generated!`);
        } catch (error: any) {
            toast.error("❌ Error: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={isSubmitting ? undefined : onClose}>
            {savedPoNumber ? (
                <DialogContent
                    className="sm:max-w-md rounded-[2rem] border-none shadow-2xl [&>button]:hidden bg-white dark:bg-slate-950 text-center p-8">
                    <div
                        className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 mx-auto">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500"/>
                    </div>
                    {/* 🚀 FIX 1: Success Title */}
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">Order Confirmed!</DialogTitle>
                    <DialogDescription className="text-slate-500 mt-3 text-sm">
                        PO <span className="font-bold text-slate-900 dark:text-white">{savedPoNumber}</span> has been
                        saved and transmitted successfully.
                    </DialogDescription>

                    <div className="grid grid-cols-2 gap-3 w-full mt-8">
                        <Button variant="outline" onClick={handleDownloadPDF} className="rounded-2xl font-bold gap-2">
                            <Download className="w-4 h-4"/> Download PDF
                        </Button>
                        <Button onClick={() => {
                            onClose();
                            window.location.reload();
                        }} className="rounded-2xl font-black bg-emerald-600 text-white">Done</Button>
                    </div>
                </DialogContent>
            ) : (
                <DialogContent
                    className="max-w-md w-[95vw] bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden rounded-[1.5rem] border-none shadow-2xl [&>button]:hidden">
                    <div
                        className="bg-white dark:bg-slate-900 px-6 py-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <span
                                className="text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest">Review Mode</span>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X
                                className="w-4 h-4"/></button>
                        </div>

                        {/* 🚀 FIX 2: Added DialogTitle here */}
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-blue-500"/>
                            Purchase Order Review
                        </DialogTitle>
                        <DialogDescription className="sr-only">Review items and select receiving branch before
                            submission.</DialogDescription>

                        <div className="grid grid-cols-3 gap-4 mt-4 text-left">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Ref</p>
                                <span className="text-xs font-mono font-bold">DRAFT</span>
                            </div>
                            <div className="border-l pl-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Date</p>
                                <span className="text-xs font-bold">{currentDate}</span>
                            </div>
                            <div className="border-l pl-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Receiving Branch</p>
                                <Select value={targetBranchId} onValueChange={setTargetBranchId}
                                        disabled={isSubmitting}>
                                    <SelectTrigger
                                        className="h-6 px-2 py-0 border-none bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black uppercase focus:ring-0">
                                        <MapPin className="w-3 h-3 mr-1 text-blue-500"/>
                                        <SelectValue placeholder="Branch"/>
                                    </SelectTrigger>
                                    <SelectContent
                                        className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
                                        {filteredBranches.map((b) => (
                                            <SelectItem
                                                key={b.id || b.branch_id}
                                                value={String(b.id || b.branch_id)}
                                                // 🚀 ADD THESE CLASSES:
                                                className="text-[11px] font-bold uppercase py-3 text-slate-900 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-blue-600"
                                            >
                                                {b.branchName || b.branchName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent> </Select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border max-h-[200px] overflow-y-auto">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-[9px] text-slate-500 uppercase">Product</th>
                                    <th className="px-4 py-2 text-[9px] text-slate-500 uppercase text-center">Qty</th>
                                    <th className="px-4 py-2 text-[9px] text-slate-500 uppercase text-right">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 font-bold uppercase truncate max-w-[150px]">{item.product_name}</td>
                                        <td className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-400">{item.orderQty}</td>
                                        <td className="px-4 py-3 text-right font-black">₱{item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-between items-center p-5 bg-slate-900 rounded-2xl text-white">
                            <div>
                                <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest">Grand Total (PHP)</span>
                                <p className="text-2xl font-black">₱{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>
                            <Boxes className="w-8 h-8 opacity-20"/>
                        </div>

                        <div className="grid grid-cols-6 gap-2 mt-6">
                            <Button variant="outline" onClick={onClose}
                                    className="col-span-1 h-12 rounded-xl border-slate-200 text-rose-500"><Ban
                                className="w-4 h-4"/></Button>
                            <Button disabled={isSubmitting} onClick={handleConfirmSubmission}
                                    className="col-span-5 h-12 rounded-xl font-bold bg-blue-600 text-white shadow-lg flex gap-2 hover:bg-blue-700">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> :
                                    <Send className="w-4 h-4"/>}
                                {isSubmitting ? "Generating..." : "Confirm & Create PO"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    )
}