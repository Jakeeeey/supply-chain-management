import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { CompanyData } from "@/components/pdf-layout-design/types";
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
// 2. MODULAR RENDERERS
// ==========================================

/**
 * Compact Header Renderer - optimized for space saving
 */
function renderHeader(
    doc: jsPDF,
    data: {
        companyName: string;
        poNumber: string;
        date: string;
        supplierName: string;
        branchLabel: string;
    }
) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const rightColX = pageWidth - margin;

    // Compact header - single line for company and PO info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.companyName, margin, 15);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("PURCHASE ORDER", margin, 20);

    // PO Details - compact single line
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`PO: ${data.poNumber} | Date: ${data.date}`, rightColX, 15, { align: "right" });

    // Compact divider
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, 23, pageWidth - margin, 23);

    // Supplier & Delivery - compact single line each
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("Supplier:", margin, 28);
    doc.setFont("helvetica", "normal");
    doc.text(data.supplierName, margin + 20, 28);

    doc.setFont("helvetica", "bold");
    doc.text("Deliver To:", margin, 32);
    doc.setFont("helvetica", "normal");
    doc.text(data.branchLabel, margin + 20, 32);

    return 36;
}

/**
 * Compact Signature Renderer - minimal space usage
 */
function renderSignatures(doc: jsPDF, startY: number, preparerName: string) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const signatureWidth = 50;
    const spacing = 20;
    const totalWidth = signatureWidth * 2 + spacing;
    const startX = (pageWidth - totalWidth) / 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    // Prepared By
    const preparedByX = startX;
    doc.text("Prepared:", preparedByX, startY);
    doc.setFont("helvetica", "bold underline");
    doc.text(preparerName || "—", preparedByX, startY + 4);
    
    doc.setDrawColor(150, 150, 150);
    doc.line(preparedByX, startY + 8, preparedByX + signatureWidth, startY + 8);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Signature", preparedByX, startY + 11);

    // Approved By
    const approvedByX = startX + signatureWidth + spacing;
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("Approved:", approvedByX, startY);
    doc.line(approvedByX, startY + 8, approvedByX + signatureWidth, startY + 8);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("Signature", approvedByX, startY + 11);
}

// ==========================================
// 3. MAIN GENERATOR FUNCTION
// ==========================================

export async function generatePurchaseOrderPdf(
    po: Record<string, unknown> | null, 
    branchLabel: string, 
    supplierName: string,
    companyData: CompanyData
) {
    if (!po) return;

    const poNumber = safeStr(po.purchase_order_no ?? po.poNumber, "N/A");
    const date = safeStr(po.date ?? po.date_encoded, "N/A");
    const preparerName = safeStr(po.preparer_name ?? "—");

    // --- FIND BEST MATCH TEMPLATE (Robust fallback to match pdf-test) ---
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
        const items = Array.isArray(po.items) ? po.items : [];
        let sumQty = 0;
        let sumGross = 0;
        let sumDiscount = 0;
        let sumNet = 0;

        const tableBody = items.map((item: unknown) => {
            const it = item as Record<string, unknown>;
            const name = safeStr(it.item_name ?? it.name ?? it.product_name);
            const brand = safeStr(it.brand);
            const uom = safeStr(it.uom ?? it.unit);

            const qty = Math.max(0, toNum(it.qty ?? it.quantity ?? 0));
            const price = Math.max(0, toNum(it.unit_price ?? it.price ?? 0));
            const gross = toNum(it.gross) || Math.max(0, qty * price);
            const discountAmount = Math.abs(toNum(it.discount_amount ?? 0));
            const net = toNum(it.net) || Math.max(0, gross - discountAmount);

            sumQty += qty;
            sumGross += gross;
            sumDiscount += discountAmount;
            sumNet += net;

            return [brand, name, uom, String(qty), formatMoney(price), formatMoney(gross), formatMoney(discountAmount), formatMoney(net)];
        });

        // 2. Render PO Details (PO Number, Date, Supplier, Branch)
        const detailsY = startY + 5;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);

        // Left Column: Supplier & Branch
        doc.text("Supplier:", 10, detailsY);
        doc.setFont("helvetica", "normal");
        doc.text(supplierName, 25, detailsY);

        doc.setFont("helvetica", "bold");
        doc.text("Branch:", 10, detailsY + 5);
        doc.setFont("helvetica", "normal");
        doc.text(branchLabel, 25, detailsY + 5);

        // Right Column: PO# & Date (Aligned to Right Margin)
        const rightMarginX = pageWidth - 10;
        doc.setFont("helvetica", "bold");
        doc.text("PO Number:", rightMarginX - 70, detailsY);
        doc.setFont("helvetica", "normal");
        doc.text(poNumber, rightMarginX, detailsY, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text("Date:", rightMarginX - 70, detailsY + 5);
        doc.setFont("helvetica", "normal");
        doc.text(date, rightMarginX, detailsY + 5, { align: "right" });

        // 3. Render Main Table
        autoTable(doc, {
            startY: detailsY + 12,
            margin: { left: 10, right: 10 },
            head: [["Brand", "Item", "UOM", "Qty", "Price", "Gross", "Disc", "Net"]],
            body: tableBody,
            foot: [[
                { content: "TOTALS", colSpan: 3, styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                { content: String(sumQty), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                { content: "—", styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                { content: formatMoney(sumGross), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                { content: formatMoney(sumDiscount), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
                { content: formatMoney(sumNet), styles: { halign: "right", fillColor: [245, 245, 245], fontSize: 7, textColor: [50, 50, 50], fontStyle: "bold" } },
            ]],
            showFoot: "lastPage",
            theme: "grid",
            headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
            bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: "auto" },
                2: { cellWidth: 12 },
                3: { halign: "right", cellWidth: 12 },
                4: { halign: "right", cellWidth: 18 },
                5: { halign: "right", cellWidth: 20 },
                6: { halign: "right", cellWidth: 18 },
                7: { halign: "right", cellWidth: 20, fontStyle: "bold" },
            },
            didDrawPage: (data) => {
                // Repeat header on subsequent pages
                if (data.pageNumber > 1 && config.elements) {
                    Object.values(config.elements).forEach(el => {
                        renderElement(doc, el as any, companyData);
                    });
                }
            },
            styles: { cellPadding: 2, fontSize: 7, lineColor: [200, 200, 200] }
        });

        // 3. Compact Financial Summary
        let finalY = (doc as any).lastAutoTable.finalY + 8;
        if (finalY + 60 > pageHeight) {
            doc.addPage();
            PdfEngine.applyTemplate(doc, templateName, companyData); // Re-apply header to new page using resolved name
            finalY = (config?.bodyStart ?? 35) + 5;
        }

        const grossDirect = toNum(po.gross_amount ?? po.grossAmount);
        const discountTotal = toNum(po.discounted_amount ?? po.discountAmount);
        const totalDirect = toNum(po.total_amount ?? po.total);
        const netAmount = grossDirect > 0 ? Math.max(0, grossDirect - discountTotal) : totalDirect;
        const grossAmount = grossDirect > 0 ? grossDirect : netAmount + discountTotal;
        const totalAmount = totalDirect > 0 ? totalDirect : netAmount;

        const rightColX = pageWidth - 10;
        const labelX = pageWidth - 80;
        const lineHeight = 6;

        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "normal");
        doc.text("Subtotal:", labelX, finalY);
        doc.text(formatMoney(grossAmount), rightColX, finalY, { align: "right" });

        doc.text("Discount:", labelX, finalY + lineHeight);
        doc.setTextColor(150, 50, 50);
        doc.text(`-${formatMoney(discountTotal)}`, rightColX, finalY + lineHeight, { align: "right" });

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.line(labelX, finalY + lineHeight + 3, rightColX, finalY + lineHeight + 3);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Total:", labelX, finalY + lineHeight * 2 + 3);
        doc.text(`PHP ${formatMoney(totalAmount)}`, rightColX, finalY + lineHeight * 2 + 3, { align: "right" });

        // 4. Compact Signatures
        renderSignatures(doc, finalY + 40, preparerName);
    });

    const poNumberStr = String(poNumber);
    doc.save(`PO-${poNumberStr}.pdf`);
}
