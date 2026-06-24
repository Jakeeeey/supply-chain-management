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
    Download,
    Ban,
    ClipboardList,
    MapPin,
    Boxes
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

interface Branch {
    id: string | number;
    branch_id?: string | number;
    branchName?: string;
    isActive?: boolean | number;
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
    const [allBranches, setAllBranches] = useState<Branch[]>([])
    const [targetBranchId, setTargetBranchId] = useState<string>("")

    useEffect(() => {
        if (isOpen) {
            fetchBranches()
                .then((data) => setAllBranches(data as Branch[]))
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
    }, [filteredBranches, targetBranchId])

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
        } catch (error: unknown) {
            const m = error instanceof Error ? error.message : String(error)
            toast.error("❌ Error: " + m);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={isSubmitting ? undefined : onClose}>
            {savedPoNumber ? (
                <DialogContent
                    className="sm:max-w-md rounded-md border border-slate-200 dark:border-slate-800 shadow-xl [&>button]:hidden bg-white dark:bg-slate-950 text-center p-5">
                    <div
                        className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500"/>
                    </div>
                    <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-50">Order Confirmed!</DialogTitle>
                    <DialogDescription className="text-slate-500 mt-2 text-xs">
                        PO <span className="font-bold text-slate-900 dark:text-white">{savedPoNumber}</span> has been
                        saved and transmitted successfully.
                    </DialogDescription>

                    <div className="grid grid-cols-2 gap-2.5 w-full mt-5">
                        <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="rounded-md font-bold gap-2 h-9">
                            <Download className="w-3.5 h-3.5"/> Download PDF
                        </Button>
                        <Button size="sm" onClick={() => {
                            onClose();
                            window.location.reload();
                        }} className="rounded-md font-black bg-emerald-600 text-white hover:bg-emerald-700 h-9">Done</Button>
                    </div>
                </DialogContent>
            ) : (
                <DialogContent
                    className="max-w-md w-[95vw] bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 shadow-xl [&>button]:hidden">
                    <div
                        className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-3">
                            <span
                                className="text-[9px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">Review Mode</span>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X
                                className="w-4 h-4"/></button>
                        </div>

                        <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 dark:text-slate-50">
                            <ClipboardList className="w-4 h-4 text-blue-500"/>
                            Purchase Order Review
                        </DialogTitle>
                        <DialogDescription className="sr-only">Review items and select receiving branch before submission.</DialogDescription>

                        <div className="grid grid-cols-3 gap-3 mt-3 text-left">
                            <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Ref</p>
                                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">DRAFT</span>
                            </div>
                            <div className="border-l pl-3">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Date</p>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currentDate}</span>
                            </div>
                            <div className="border-l pl-3">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Receiving Branch</p>
                                <Select value={targetBranchId} onValueChange={setTargetBranchId}
                                        disabled={isSubmitting}>
                                    <SelectTrigger
                                         className="h-7 px-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-md text-[9px] font-black uppercase focus:ring-0">
                                         <MapPin className="w-3 h-3 mr-1 text-blue-500 shrink-0"/>
                                         <SelectValue placeholder="Branch"/>
                                     </SelectTrigger>
                                    <SelectContent
                                        className="rounded-md border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                                        {filteredBranches.map((b) => (
                                            <SelectItem
                                                key={b.id || b.branch_id}
                                                value={String(b.id || b.branch_id)}
                                                className="text-[10px] font-bold uppercase py-2 text-slate-900 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-blue-600"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span>{b.branchName}</span>
                                                    {(b.isActive === false || b.isActive === 0) && (
                                                        <span className="px-1.5 py-0.5 text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 rounded font-black tracking-widest uppercase">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent> </Select>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 max-h-[160px] overflow-y-auto">
                            <table className="w-full text-left text-[10px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-3 py-1.5 text-[8px] text-slate-500 uppercase">Product</th>
                                    <th className="px-3 py-1.5 text-[8px] text-slate-500 uppercase text-center">Qty</th>
                                    <th className="px-3 py-1.5 text-[8px] text-slate-500 uppercase text-right">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2 font-bold uppercase truncate max-w-[150px] text-slate-700 dark:text-slate-300">{item.product_name}</td>
                                        <td className="px-3 py-2 text-center font-bold text-slate-600 dark:text-slate-400">{item.orderQty}</td>
                                        <td className="px-3 py-2 text-right font-black text-slate-900 dark:text-slate-50">₱{item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-50">
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Grand Total (PHP)</span>
                                <p className="text-lg font-black">₱{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>
                            <Boxes className="w-6 h-6 text-slate-400 dark:text-slate-600 opacity-50"/>
                        </div>

                        <div className="grid grid-cols-6 gap-2 pt-1">
                            <Button variant="outline" size="sm" onClick={onClose}
                                    className="col-span-1 h-10 rounded-md border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                                <Ban className="w-4 h-4"/>
                            </Button>
                            <Button size="sm" disabled={isSubmitting} onClick={handleConfirmSubmission}
                                    className="col-span-5 h-10 rounded-md font-bold bg-blue-600 text-white shadow-md flex gap-1.5 hover:bg-blue-700 items-center justify-center">
                                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> :
                                    <Send className="w-3.5 h-3.5"/>}
                                {isSubmitting ? "Generating..." : "Confirm & Create PO"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    )
}