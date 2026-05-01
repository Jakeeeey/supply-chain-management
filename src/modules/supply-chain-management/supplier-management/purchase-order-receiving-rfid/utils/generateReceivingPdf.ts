import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { CompanyData, PdfElementConfig } from "@/components/pdf-layout-design/types";
import { renderElement } from "@/components/pdf-layout-design/PdfGenerator";
import { pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
function formatMoney(amount: number) {
    return new Intl.NumberFormat("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(amount || 0));
}

function toNum(v: unknown): number {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown, fallback = "—") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

// ==========================================
// 2. SIGNATURE RENDERER
// ==========================================
function renderSignatures(doc: jsPDF, startY: number, receiverName: string) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const signatureWidth = 50;
    const spacing = 20;
    const totalWidth = signatureWidth * 2 + spacing;
    const startX = (pageWidth - totalWidth) / 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    // Received By
    const receivedByX = startX;
    doc.text("Received By:", receivedByX, startY);
    doc.setFont("helvetica", "bold");
    doc.text(receiverName || "—", receivedByX, startY + 4);

    doc.setDrawColor(150, 150, 150);
    doc.line(receivedByX, startY + 8, receivedByX + signatureWidth, startY + 8);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Signature", receivedByX, startY + 11);

    // Checked By
    const checkedByX = startX + signatureWidth + spacing;
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("Checked By:", checkedByX, startY);
    doc.line(checkedByX, startY + 8, checkedByX + signatureWidth, startY + 8);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("Signature", checkedByX, startY + 11);
}

// ==========================================
// 3. MAIN GENERATOR FUNCTION
// ==========================================

export type ReceivingPdfData = {
    poNumber: string;
    receiptNo: string;
    receiptDate: string;
    receiptType: string;
    supplierName: string;
    branchLabel: string;
    isFullyReceived: boolean;
    priceType: string;
    items: Array<{
        name: string;
        barcode: string;
        uom?: string;
        expectedQty: number;
        receivedQtyNow: number;
        unitPrice?: number;
        discountAmount?: number;
        batchNo?: string;
        lotId?: string;
        expiryDate?: string;
    }>;
};

export async function generateReceivingPdf(
    data: ReceivingPdfData,
    companyData: CompanyData
) {
    if (!data) return;

    const poNumber = safeStr(data.poNumber, "N/A");
    const receiptNo = safeStr(data.receiptNo, "N/A");
    const receiptDate = safeStr(data.receiptDate, "N/A");
    const receiptType = safeStr(data.receiptType, "N/A");
    const supplierName = safeStr(data.supplierName, "N/A");
    const branchLabel = safeStr(data.branchLabel, "N/A");

    // --- FIND BEST MATCH TEMPLATE ---
    const templates = await pdfTemplateService.fetchTemplates();
    const template = templates.find(t => t.name === "MEN2")
                 || templates.find(t => t.name.toLowerCase().includes("men2"))
                 || templates[0];
    const templateName = template?.name || "MEN2";

    // --- USE Unified PdfEngine ---
    const doc = await PdfEngine.generateWithFrame(templateName, companyData, (doc, startY, config) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Prepare Table Data
        const items = Array.isArray(data.items) ? data.items : [];
        let sumExpected = 0;
        let sumReceived = 0;
        let sumGross = 0;
        let sumDiscount = 0;
        let sumNet = 0;

        const tableBody = items.map((item) => {
            const name = safeStr(item.name);
            const uom = safeStr(item.uom);
            const barcode = safeStr(item.barcode);

            const expected = Math.max(0, toNum(item.expectedQty));
            const received = Math.max(0, toNum(item.receivedQtyNow));
            const price = Math.max(0, toNum(item.unitPrice));
            const discountAmount = Math.abs(toNum(item.discountAmount));
            const gross = received * price;
            const net = Math.max(0, gross - (received * discountAmount));

            sumExpected += expected;
            sumReceived += received;
            sumGross += gross;
            sumDiscount += (received * discountAmount);
            sumNet += net;

            return [name, barcode, uom, String(expected), String(received), formatMoney(price), formatMoney(received * discountAmount), formatMoney(net)];
        });

        // 2. Render Receipt Details (PO Number, Receipt No, Date, Supplier, Branch)
        const detailsY = startY + 5;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);

        // Title
        const statusText = data.isFullyReceived ? "FULLY RECEIVED" : "PARTIAL RECEIVING";
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(data.isFullyReceived ? 22 : 194, data.isFullyReceived ? 163 : 120, data.isFullyReceived ? 74 : 10);
        doc.text(`RECEIVING RECEIPT — ${statusText}`, pageWidth / 2, detailsY, { align: "center" });

        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);

        // Left Column: Supplier & Branch
        const infoY = detailsY + 8;
        doc.setFont("helvetica", "bold");
        doc.text("Supplier:", 10, infoY);
        doc.setFont("helvetica", "normal");
        doc.text(supplierName, 28, infoY);

        doc.setFont("helvetica", "bold");
        doc.text("Branch:", 10, infoY + 5);
        doc.setFont("helvetica", "normal");
        doc.text(branchLabel, 28, infoY + 5);

        // Right Column: PO#, Receipt#, Date, Type
        const rightMarginX = pageWidth - 10;
        doc.setFont("helvetica", "bold");
        doc.text("PO Number:", rightMarginX - 70, infoY);
        doc.setFont("helvetica", "normal");
        doc.text(poNumber, rightMarginX, infoY, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text("Receipt No:", rightMarginX - 70, infoY + 5);
        doc.setFont("helvetica", "normal");
        doc.text(receiptNo, rightMarginX, infoY + 5, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text("Date:", rightMarginX - 70, infoY + 10);
        doc.setFont("helvetica", "normal");
        doc.text(receiptDate, rightMarginX, infoY + 10, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text("Type:", rightMarginX - 70, infoY + 15);
        doc.setFont("helvetica", "normal");
        doc.text(receiptType, rightMarginX, infoY + 15, { align: "right" });

        // 3. Render Main Table
        autoTable(doc, {
            startY: infoY + 22,
            margin: { left: 10, right: 10 },
            head: [["Product", "Barcode", "UOM", "Expected", "Received", "Price", "Disc", "Net"]],
            body: tableBody,
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
            didDrawPage: (pageData) => {
                // Repeat header on subsequent pages
                if (pageData.pageNumber > 1 && config.elements) {
                    Object.values(config.elements).forEach(el => {
                        renderElement(doc, el as PdfElementConfig, companyData);
                    });
                }
            },
            styles: { cellPadding: 2, fontSize: 7, lineColor: [200, 200, 200] }
        });

        // 4. Financial Summary
        let finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        if (finalY + 60 > pageHeight) {
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
        renderSignatures(doc, finalY + lineHeight * 5 + 25, "");
    });

    doc.save(`Receiving_${receiptNo}.pdf`);
}
