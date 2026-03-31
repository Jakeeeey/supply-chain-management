import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    const margin = 10; // Reduced from 14
    const rightColX = pageWidth - margin;

    // Compact header - single line for company and PO info
    doc.setFontSize(14); // Reduced from 20
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.companyName, margin, 15);

    doc.setFontSize(8); // Reduced from 12
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("PURCHASE ORDER", margin, 20);

    // PO Details - compact single line
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`PO: ${data.poNumber} | Date: ${data.date}`, rightColX, 15, { align: "right" });

    // Compact divider
    doc.setDrawColor(200, 200, 200); // Lighter color to save ink
    doc.setLineWidth(0.3); // Thinner line
    doc.line(margin, 23, pageWidth - margin, 23);

    // Supplier & Delivery - compact single line each
    doc.setFontSize(7); // Smaller font
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("Supplier:", margin, 28);
    doc.setFont("helvetica", "normal");
    doc.text(data.supplierName, margin + 20, 28);

    doc.setFont("helvetica", "bold");
    doc.text("Deliver To:", margin, 32);
    doc.setFont("helvetica", "normal");
    doc.text(data.branchLabel, margin + 20, 32);

    return 36; // Reduced start position
}

/**
 * Compact Signature Renderer - minimal space usage
 */
function renderSignatures(doc: jsPDF, startY: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const signatureWidth = 50; // Reduced from 60
    const spacing = 20; // Reduced from 30
    const totalWidth = signatureWidth * 2 + spacing;
    const startX = (pageWidth - totalWidth) / 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7); // Smaller font
    doc.setTextColor(15, 23, 42);

    // Prepared By
    const preparedByX = startX;
    doc.text("Prepared:", preparedByX, startY);
    doc.setDrawColor(150, 150, 150); // Lighter color
    doc.line(preparedByX, startY + 8, preparedByX + signatureWidth, startY + 8);
    doc.setFontSize(6); // Even smaller for helper text
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generatePurchaseOrderPdf(po: any, branchLabel: string, supplierName: string) {
    if (!po) return;

    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10; // Reduced margins

    const poNumber = safeStr(po?.purchase_order_no ?? po?.poNumber, "N/A");
    const date = safeStr(po?.date ?? po?.date_encoded, "N/A");

    // --- 1. RENDER HEADER ---
    const startY = renderHeader(doc, {
        companyName: "MEN2 MARKETING CORPORATION",
        poNumber,
        date,
        supplierName: safeStr(supplierName),
        branchLabel: safeStr(branchLabel)
    });

    // --- 2. PREPARE TABLE DATA & ACCUMULATE TOTALS ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = Array.isArray(po?.items) ? po.items : [];

    let sumQty = 0;
    let sumGross = 0;
    let sumDiscount = 0;
    let sumNet = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableBody = items.map((it: any) => {
        const name = safeStr(it?.item_name ?? it?.name ?? it?.product_name);
        const brand = safeStr(it?.brand);
        const uom = safeStr(it?.uom ?? it?.unit);

        const qty = Math.max(0, toNum(it?.qty ?? it?.quantity ?? 0));
        const price = Math.max(0, toNum(it?.unit_price ?? it?.price ?? 0));
        const gross = toNum(it?.gross) || Math.max(0, qty * price);
        const discountAmount = Math.abs(toNum(it?.discount_amount ?? 0));
        const net = toNum(it?.net) || Math.max(0, gross - discountAmount);

        // Accumulate for table footer
        sumQty += qty;
        sumGross += gross;
        sumDiscount += discountAmount;
        sumNet += net;

        return [
            brand,
            name,
            uom,
            String(qty),
            formatMoney(price),
            formatMoney(gross),
            formatMoney(discountAmount),
            formatMoney(net),
        ];
    });

    // --- 3. RENDER COMPACT TABLE ---
    autoTable(doc, {
        startY,
        head: [["Brand", "Item", "UOM", "Qty", "Price", "Gross", "Disc", "Net"]], // Shorter headers
        body: tableBody,
        foot: [[
            { content: "TOTALS", colSpan: 3, styles: { halign: "right", fillColor: [245, 245, 245], textColor: [50, 50, 50], fontSize: 7 } },
            { content: String(sumQty), styles: { halign: "right", fillColor: [245, 245, 245], textColor: [50, 50, 50], fontSize: 7 } },
            { content: "—", styles: { halign: "right", fillColor: [245, 245, 245], textColor: [50, 50, 50], fontSize: 7 } },
            { content: formatMoney(sumGross), styles: { halign: "right", fillColor: [245, 245, 245], textColor: [50, 50, 50], fontSize: 7 } },
            { content: formatMoney(sumDiscount), styles: { halign: "right", fillColor: [245, 245, 245], textColor: [50, 50, 50], fontSize: 7 } },
            { content: formatMoney(sumNet), styles: { halign: "right", fillColor: [245, 245, 245], textColor: [50, 50, 50], fontSize: 7 } },
        ]],
        showFoot: "lastPage",
        theme: "grid",
        headStyles: {
            fillColor: [100, 100, 100], // Darker gray instead of color to save ink
            textColor: [255, 255, 255],
            fontSize: 7, // Smaller font
            fontStyle: "bold",
            halign: "center"
        },
        bodyStyles: {
            fontSize: 7, // Smaller font
            textColor: [50, 50, 50] // Darker gray instead of black
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250] // Very light gray
        },
        columnStyles: {
            0: { cellWidth: 18 }, // Reduced widths
            1: { cellWidth: "auto" },
            2: { cellWidth: 12 },
            3: { halign: "right", cellWidth: 12 },
            4: { halign: "right", cellWidth: 18 },
            5: { halign: "right", cellWidth: 20 },
            6: { halign: "right", cellWidth: 18 },
            7: { halign: "right", cellWidth: 20, fontStyle: "bold" },
        },
        // Compact page numbers
        didDrawPage: function (data) {
            const str = `${doc.getCurrentPageInfo().pageNumber}`;
            doc.setFontSize(6); // Smaller font
            doc.setTextColor(150, 150, 150); // Lighter color
            doc.text(str, pageWidth / 2, pageHeight - 8, { align: "center" });
        },
        // Reduced row height
        styles: {
            cellPadding: 2, // Reduced padding
            fontSize: 7,
            lineColor: [200, 200, 200] // Lighter grid lines
        }
    });

    // --- 4. COMPACT FINANCIAL SUMMARY ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalY = (doc as any).lastAutoTable.finalY + 8; // Reduced spacing

    // Smart pagination with less space
    if (finalY + 50 > pageHeight) {
        doc.addPage();
        finalY = 15; // Less margin on new page
    }

    const grossDirect = toNum(po?.gross_amount ?? po?.grossAmount);
    const discountTotal = toNum(po?.discounted_amount ?? po?.discountAmount);
    const totalDirect = toNum(po?.total_amount ?? po?.total);

    const netAmount = grossDirect > 0 ? Math.max(0, grossDirect - discountTotal) : totalDirect;
    const grossAmount = grossDirect > 0 ? grossDirect : netAmount + discountTotal;
    const totalAmount = totalDirect > 0 ? totalDirect : netAmount;

    // Ultra-compact financial summary - no box to save ink
    const rightColX = pageWidth - margin;
    const labelX = pageWidth - 80; // Compact positioning

    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);

    // Single line spacing
    const lineHeight = 6;

    // Subtotal
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", labelX, finalY);
    doc.text(formatMoney(grossAmount), rightColX, finalY, { align: "right" });

    // Discount
    doc.text("Discount:", labelX, finalY + lineHeight);
    doc.setTextColor(150, 50, 50); // Lighter red
    doc.text(`-${formatMoney(discountTotal)}`, rightColX, finalY + lineHeight, { align: "right" });

    // Simple divider
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(labelX, finalY + lineHeight + 3, rightColX, finalY + lineHeight + 3);

    // Total - compact but emphasized
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", labelX, finalY + lineHeight * 2 + 3);
    doc.text(`PHP ${formatMoney(totalAmount)}`, rightColX, finalY + lineHeight * 2 + 3, { align: "right" });

    // --- 5. COMPACT SIGNATURES ---
    renderSignatures(doc, finalY + 35); // Reduced spacing

    // --- 6. SAVE PDF ---
    doc.save(`PO-${poNumber}.pdf`);
}
