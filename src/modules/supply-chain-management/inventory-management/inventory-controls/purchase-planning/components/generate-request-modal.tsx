"use client"

import { jsPDF } from "jspdf"
// 🚀 FIXED: Import autoTable directly
import autoTable from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Download, Printer, X } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface SuccessModalProps {
    isOpen: boolean
    onClose: () => void
    prNumber: string
    data?: any[]
}

export function PurchaseRequestSuccessModal({isOpen, onClose, prNumber, data = []}: SuccessModalProps) {

    const generatePDF = () => {
        const doc = new jsPDF()

        // Add Header
        doc.setFontSize(20)
        doc.text("PURCHASE ORDER", 105, 20, {align: "center"})

        doc.setFontSize(10)
        doc.text(`PO Number: ${prNumber}`, 14, 30)
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35)

        // Define Table Columns
        const tableColumn = ["Brand", "Product", "Qty", "Price", "Total"]
        const tableRows: any[] = []

        // Filter items that were actually ordered
        data.filter(item => item.orderQty > 0).forEach(item => {
            const rowData = [
                item.brand,
                item.product,
                item.orderQty,
                `P${item.price.toLocaleString()}`,
                `P${item.totalAmount.toLocaleString()}`
            ]
            tableRows.push(rowData)
        })

        // 🚀 FIXED: Pass 'doc' as the first argument to bypass the TypeScript error
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            headStyles: {fillColor: [41, 128, 185], textColor: 255} // Note: changed fillGray to fillColor
        })

        // Save the PDF
        doc.save(`${prNumber}.pdf`)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-[2rem]">
                <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div
                        className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500"/>
                    </div>

                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                            Order Confirmed!
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Purchase Order <span className="font-bold text-slate-900 dark:text-white">#{prNumber}</span> has
                        been successfully generated.
                    </p>

                    <div className="grid grid-cols-2 gap-3 w-full mt-8">
                        <Button
                            variant="outline"
                            onClick={generatePDF}
                            className="rounded-2xl font-bold gap-2"
                        >
                            <Download className="w-4 h-4"/>
                            Download
                        </Button>
                        <Button
                            onClick={onClose}
                            className="rounded-2xl font-bold bg-slate-900"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}