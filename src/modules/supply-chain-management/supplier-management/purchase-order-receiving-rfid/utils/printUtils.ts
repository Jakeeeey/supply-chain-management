/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { renderElement } from "@/components/pdf-layout-design/PdfGenerator";
import { pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";
import { CompanyData, PdfElementConfig } from "@/components/pdf-layout-design/types";



export type ReceiptData = {
    poNumber: string;
    supplierName: string;
    receiptNo: string;
    receiptType: string;
    receiptDate: string;
    isFullyReceived: boolean;
    items: Array<{
        name: string;
        barcode: string;
        expectedQty: number;
        receivedQtyAtStart: number;
        receivedQtyNow: number;
        rfids: string[];
        lotId?: string;
        batchNo?: string;
        expiryDate?: string;
    }>;
};

export async function generateOfficialSupplierReceiptV5(data: ReceiptData) {
    console.log("Generating Official PDF V5: ", data.receiptNo);

    if (!data || !data.items) {
        console.error("No data or items provided to generateReceiptPDF");
        return;
    }

    try {
        const response = await fetch("/api/pdf/company");
        let companyData: CompanyData | null = null;
        
        if (response.ok) {
            const body = await response.json();
            companyData = body?.data?.[0] || (Array.isArray(body?.data) ? null : body?.data);
        }
        
        if (!companyData) {
            companyData = {} as CompanyData;
        }

        const templates = await pdfTemplateService.fetchTemplates();
        const template = templates.find(t => t.name === "MEN2") || templates.find(t => t.name.toLowerCase().includes("men2")) || templates[0];
        const templateName = template?.name || "MEN2";

        const doc = await PdfEngine.generateWithFrame(templateName, companyData, (doc, startY, config) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Render PO Details (Supplier, Document Info)
            const detailsY = startY + 5;
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 50, 50);

            // Left Column
            doc.text("Supplier:", 10, detailsY);
            doc.setFont("helvetica", "normal");
            doc.text(data.supplierName || "—", 30, detailsY);

            doc.setFont("helvetica", "bold");
            doc.text("Receipt Type:", 10, detailsY + 5);
            doc.setFont("helvetica", "normal");
            doc.text(data.receiptType || "—", 30, detailsY + 5);

            doc.setFont("helvetica", "bold");
            doc.text("Status:", 10, detailsY + 10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(data.isFullyReceived ? 46 : 230, data.isFullyReceived ? 125 : 126, data.isFullyReceived ? 50 : 34);
            doc.text(data.isFullyReceived ? "FULLY RECEIVED" : "PARTIALLY RECEIVED", 30, detailsY + 10);
            doc.setTextColor(50, 50, 50);

            // Right Column
            const rightMarginX = pageWidth - 10;
            doc.setFont("helvetica", "bold");
            doc.text("PO Number:", rightMarginX - 70, detailsY);
            doc.setFont("helvetica", "normal");
            doc.text(data.poNumber || "—", rightMarginX, detailsY, { align: "right" });

            doc.setFont("helvetica", "bold");
            doc.text("Receipt No:", rightMarginX - 70, detailsY + 5);
            doc.setFont("helvetica", "normal");
            doc.text(data.receiptNo || "—", rightMarginX, detailsY + 5, { align: "right" });

            doc.setFont("helvetica", "bold");
            doc.text("Date:", rightMarginX - 70, detailsY + 10);
            doc.setFont("helvetica", "normal");
            doc.text(data.receiptDate || "—", rightMarginX, detailsY + 10, { align: "right" });

            // Items Table
            const tableRows: any[] = [];
            data.items.forEach((it: any) => {
                const now = it.receivedQtyNow ?? 0;
                const tot = it.expectedQty ?? 0;
                const isPending = now === 0;
                const rfids = it.rfids || [];

                const metaInfo = [
                    it.batchNo ? `Batch: ${it.batchNo}` : "",
                    it.lotId ? `Lot: ${it.lotId}` : "",
                    it.expiryDate ? `Exp: ${it.expiryDate}` : ""
                ].filter(Boolean).join(" | ");

                // First row for the item
                tableRows.push([
                    { 
                        content: it.name || "Unknown Product", 
                        styles: { fontStyle: isPending ? "italic" : "normal", textColor: isPending ? [150, 150, 150] : [0, 0, 0] } 
                    },
                    {
                        content: `${it.barcode || "—"}${metaInfo ? "\n" + metaInfo : ""}`,
                    },
                    {
                        content: String(tot),
                        styles: { halign: "right", fontStyle: "bold" }
                    },
                    {
                        content: String(now),
                        styles: { halign: "right", fontStyle: "bold" }
                    },
                    rfids[0] || (isPending ? "(Not Received)" : "—")
                ]);

                // Subsequent rows for additional RFIDs
                for (let i = 1; i < rfids.length; i++) {
                    tableRows.push(["", "", "", "", rfids[i]]);
                }
            });

            if (tableRows.length === 0) {
                tableRows.push([{ content: "No items recorded in this receipt summary.", colSpan: 5, styles: { halign: "center", fontStyle: "italic" } }]);
            }

            autoTable(doc, {
                startY: detailsY + 15,
                margin: { left: 10, right: 10 },
                head: [["Product Name", "SKU / Barcode", "Exp. Qty", "Recv. Qty", "Verified RFIDs"]],
                body: tableRows,
                theme: "grid",
                headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
                bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 20, halign: "right" },
                    3: { cellWidth: 20, halign: "right" },
                    4: { cellWidth: "auto", font: "courier" }
                },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1 && config.elements) {
                        Object.values(config.elements).forEach(el => {
                            renderElement(doc, el as PdfElementConfig, companyData as CompanyData);
                        });
                    }
                },
                styles: { cellPadding: 2, fontSize: 7, lineColor: [200, 200, 200] }
            });

            // Metadata tag at the very bottom
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setPage(pageCount);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 10, pageHeight - 10, { align: "right" });
        });

        doc.save(`Receipt_${data.receiptNo}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF", error);
    }
}

export async function generatePurchaseOrderPDF(data: {
    poNumber: string;
    poDate: string;
    supplierName: string;
    isInvoice?: boolean;
    items: Array<{
        name: string;
        brand: string;
        category: string;
        barcode: string;
        orderQty: number;
        uom: string;
        price: number;
        grossAmount: number;
        discountType: string;
        discountAmount: number;
        netAmount: number;
        branchName: string;
    }>;
    subtotal: number;
    discount: number;
    vat: number;
    ewt: number;
    total: number;
}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // PDF-safe currency formatter
    const formatMoney = (val: number) => {
        const formatted = new Intl.NumberFormat("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val);
        return `P${formatted}`;
    };

    // Title
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue
    // ✅ Updated: Always show "PURCHASE ORDER"
    const title = "PURCHASE ORDER";
    doc.text(title, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 15, 10, { align: "right" });

    // Header Info Box
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 30, pageWidth - 15, 30);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    // ✅ Updated label
    doc.text("Purchase Order Number:", 15, 40);
    doc.setFont("helvetica", "normal");
    doc.text(data.poNumber || "N/A", 65, 40); // Shifted a bit for longer label

    doc.setFont("helvetica", "bold");
    doc.text("Supplier:", 15, 47);
    doc.setFont("helvetica", "normal");
    doc.text(data.supplierName || "N/A", 65, 47);

    // ✅ Added Branch Info
    const uniqueBranches = Array.from(new Set(data.items.map(it => it.branchName).filter(Boolean)));
    const branchText = uniqueBranches.length > 0 ? uniqueBranches.join(", ") : "N/A";
    doc.setFont("helvetica", "bold");
    doc.text("Branch:", 15, 54);
    doc.setFont("helvetica", "normal");
    doc.text(branchText, 65, 54);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", 130, 40);
    doc.setFont("helvetica", "normal");
    doc.text(data.poDate || "N/A", 150, 40);

    doc.line(15, 60, pageWidth - 15, 60); // Adjusted line position

    // Items Table
    const tableRows = data.items.map(it => [
        it.brand || "—",
        it.category || "—",
        it.name,
        formatMoney(it.price).replace("P", ""),
        it.uom,
        it.orderQty,
    ]);

    autoTable(doc, {
        startY: 68,
        head: [["Brand", "Category", "Product Name", "Price", "UOM", "Qty"]],
        body: tableRows,
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 7, halign: 'left' },
        styles: { fontSize: 6.5, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 20 },
            2: { cellWidth: 105 },
            3: { cellWidth: 15, halign: "right" },
            4: { cellWidth: 12, halign: "center" },
            5: { cellWidth: 10, halign: "center" }
        }
    });


    doc.save(`PO_${data.poNumber}.pdf`);
}
