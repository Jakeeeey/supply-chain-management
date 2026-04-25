/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { renderElement } from "@/components/pdf-layout-design/PdfGenerator";
import { pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";
import { CompanyData, PdfElementConfig } from "@/components/pdf-layout-design/types";



type ReceiptData = {
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
        unitPrice?: number;
        discountAmount?: number;
        batchNo?: string;
        lotId?: string;
        expiryDate?: string;
        uom?: string;
        rfids: string[];
    }>;
    priceType: string;
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

            // 1. Prepare Table Data
            const items = Array.isArray(data.items) ? data.items : [];
            let sumExpected = 0;
            let sumReceived = 0;
            let sumGross = 0;
            let sumDiscount = 0;
            let sumNet = 0;

            const formatMoney = (amount: number) => {
                return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount || 0));
            };

            const toNum = (v: any) => {
                if (v === null || v === undefined) return 0;
                const n = Number(String(v).replace(/,/g, ""));
                return Number.isFinite(n) ? n : 0;
            };

            const tableRows: any[] = [];
            items.forEach((it: any) => {
                const name = (it.name || "—").trim();
                const uom = (it.uom || "—").trim();
                const expected = Math.max(0, toNum(it.expectedQty));
                const received = Math.max(0, toNum(it.receivedQtyNow));
                const price = Math.max(0, toNum(it.unitPrice));
                const discountAmount = Math.max(0, Math.abs(toNum(it.discountAmount)));
                
                const gross = received * price;
                const net = Math.max(0, gross - (received * discountAmount));

                sumExpected += expected;
                sumReceived += received;
                sumGross += gross;
                sumDiscount += (received * discountAmount);
                sumNet += net;

                const metaInfo = [
                    it.batchNo ? `Batch: ${it.batchNo}` : "",
                    it.lotId ? `Lot: ${it.lotId}` : "",
                    it.expiryDate ? `Exp: ${it.expiryDate}` : ""
                ].filter(Boolean).join(" | ");

                const barcodeStr = `${it.barcode || "—"}${metaInfo ? "\n" + metaInfo : ""}`;

                tableRows.push([
                   name,
                   barcodeStr,
                   uom,
                   String(expected),
                   String(received),
                   formatMoney(price),
                   formatMoney(received * discountAmount),
                   formatMoney(net)
                ]);
            });

            if (tableRows.length === 0) {
                tableRows.push([{ content: "No items recorded in this receipt summary.", colSpan: 8, styles: { halign: "center", fontStyle: "italic" } }]);
            }

            autoTable(doc, {
                startY: detailsY + 15,
                margin: { left: 10, right: 10 },
                head: [["Product", "Barcode", "UOM", "Expected", "Received", "Price", "Disc", "Net"]],
                body: tableRows,
                foot: [[
                    { content: "TOTALS", colSpan: 3, styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                    { content: String(sumExpected), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                    { content: String(sumReceived), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                    { content: "—", styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                    { content: formatMoney(sumDiscount), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                    { content: formatMoney(sumNet), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                ]],
                showFoot: "lastPage",
                theme: "grid",
                headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
                bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
                columnStyles: {
                    0: { cellWidth: "auto" },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 12 },
                    3: { halign: "right", cellWidth: 16 },
                    4: { halign: "right", cellWidth: 16 },
                    5: { halign: "right", cellWidth: 18 },
                    6: { halign: "right", cellWidth: 18 },
                    7: { halign: "right", cellWidth: 20, fontStyle: "bold" },
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

            // Financial Summary Block
            let finalY = (doc as any).lastAutoTable.finalY + 8;
            if (finalY + 70 > pageHeight) {
                doc.addPage();
                PdfEngine.applyTemplate(doc, templateName, companyData);
                finalY = (config?.bodyStart ?? 35) + 5;
            }

            const rightColX = pageWidth - 10;
            const labelX = pageWidth - 80;
            const lineHeight = 6;

            const isExclusive = data.priceType?.toUpperCase() === "VAT EXCLUSIVE";

            let vatAmount = 0;
            let whtAmount = 0;
            let grandTotal = 0;

            if (isExclusive) {
                vatAmount = sumNet * 0.12;
                whtAmount = sumNet * 0.01;
                grandTotal = sumNet;
            } else {
                // VAT Inclusive
                const vatableAmount = sumNet / 1.12;
                vatAmount = sumNet - vatableAmount;
                whtAmount = vatableAmount * 0.01;
                grandTotal = sumNet;
            }

            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "normal");
            doc.text("Gross Amount:", labelX, finalY);
            doc.text(formatMoney(sumGross), rightColX, finalY, { align: "right" });

            doc.text("Discount:", labelX, finalY + lineHeight);
            doc.setTextColor(150, 50, 50);
            doc.text(`-${formatMoney(sumDiscount)}`, rightColX, finalY + lineHeight, { align: "right" });

            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.5);
            doc.line(labelX, finalY + lineHeight + 3, rightColX, finalY + lineHeight + 3);

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("Net Total:", labelX, finalY + lineHeight * 2 + 3);
            doc.text(`${formatMoney(sumNet)}`, rightColX, finalY + lineHeight * 2 + 3, { align: "right" });

            // Add VAT and EWT
            doc.setFont("helvetica", "normal");
            doc.text("VAT Details:", labelX, finalY + lineHeight * 3 + 3);
            doc.text(`${isExclusive ? "+" : ""}${formatMoney(vatAmount)}`, rightColX, finalY + lineHeight * 3 + 3, { align: "right" });

            doc.text("EWT (1%):", labelX, finalY + lineHeight * 4 + 3);
            doc.setTextColor(150, 50, 50);
            doc.text(`-${formatMoney(whtAmount)}`, rightColX, finalY + lineHeight * 4 + 3, { align: "right" });

            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.5);
            doc.line(labelX, finalY + lineHeight * 4 + 5, rightColX, finalY + lineHeight * 4 + 5);

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Grand Total:", labelX, finalY + lineHeight * 5 + 6);
            doc.text(`PHP ${formatMoney(grandTotal)}`, rightColX, finalY + lineHeight * 5 + 6, { align: "right" });

            // Standardized Footnote
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text("Note: VAT and EWT figures are for reference and have not been deducted from the total.", labelX - 20, finalY + lineHeight * 5 + 12);

            // 5. Signatures
            const signatureWidth = 50;
            const spacing = 20;
            const totalWidth = signatureWidth * 2 + spacing;
            const startX = (pageWidth - totalWidth) / 2;
            const sigY = finalY + lineHeight * 5 + 25;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(15, 23, 42);

            // Received By
            const receivedByX = startX;
            doc.text("Received By:", receivedByX, sigY);
            doc.setFont("helvetica", "bold");
            doc.text("—", receivedByX, sigY + 4);

            doc.setDrawColor(150, 150, 150);
            doc.line(receivedByX, sigY + 8, receivedByX + signatureWidth, sigY + 8);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(150, 150, 150);
            doc.text("Signature", receivedByX, sigY + 11);

            // Checked By
            const checkedByX = startX + signatureWidth + spacing;
            doc.setFontSize(7);
            doc.setTextColor(15, 23, 42);
            doc.text("Checked By:", checkedByX, sigY);
            doc.line(checkedByX, sigY + 8, checkedByX + signatureWidth, sigY + 8);
            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.text("Signature", checkedByX, sigY + 11);

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
