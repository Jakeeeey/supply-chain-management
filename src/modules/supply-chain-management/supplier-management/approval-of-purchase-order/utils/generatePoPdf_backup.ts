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

function safeStr(v: unknown, fallback = "â€”") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

// ==========================================
// 2. MODULAR RENDERERS
// ==========================================

/**
 * Modular Header Renderer
 * Prepared to be easily swapped out or converted to a React-to-Canvas component later.
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

    // Company & Document Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(data.companyName, 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("PURCHASE ORDER", 14, 28);

    // PO Details (Top Right)
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`PO Number:`, pageWidth - 45, 22);
    doc.setFont("helvetica", "normal");
    doc.text(data.poNumber, pageWidth - 14, 22, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(`Date:`, pageWidth - 45, 28);
    doc.setFont("helvetica", "normal");
    doc.text(data.date, pageWidth - 14, 28, { align: "right" });

    // Divider Line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);

    // Supplier & Delivery Info
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    // Supplier
    doc.setFont("helvetica", "bold");
    doc.text("Supplier:", 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(data.supplierName, 32, 42);

    // Branch / Delivery
    doc.setFont("helvetica", "bold");
    doc.text("Deliver To:", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(data.branchLabel, 34, 48);

    // Return the Y-coordinate where the main content should start
    return 56;
}

/**
 * Modular Footer / Signature Renderer
 */
function renderSignatures(doc: jsPDF, startY: number) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    // Prepared By
    doc.text("Prepared By:", 14, startY);
    doc.setDrawColor(15, 23, 42);
    doc.line(14, startY + 12, 70, startY + 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Signature over printed name", 14, startY + 16);

    // Approved By
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Approved By:", 90, startY);
    doc.line(90, startY + 12, 150, startY + 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Signature over printed name", 90, startY + 16);
}

// ==========================================
// 3. MAIN GENERATOR FUNCTION
// ==========================================

export function generatePurchaseOrderPdf(po: any, branchLabel: string, supplierName: string) {
    if (!po) return;

    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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

    const items = Array.isArray(po?.items) ? po.items : [];

    let sumQty = 0;
    let sumGross = 0;
    let sumDiscount = 0;
    let sumNet = 0;

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

    // --- 3. RENDER TABLE WITH AUTOTABLE ---
    autoTable(doc, {
        startY,
        head: [["Brand", "Item", "UOM", "Qty", "Unit Price", "Gross", "Discount", "Net Amount"]],
        body: tableBody,
        // The 'foot' property natively handles the totals row
        foot: [[
            { content: "COLUMN TOTALS", colSpan: 3, styles: { halign: "right", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: String(sumQty), styles: { halign: "right", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: "â€”", styles: { halign: "right", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: formatMoney(sumGross), styles: { halign: "right", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: formatMoney(sumDiscount), styles: { halign: "right", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: formatMoney(sumNet), styles: { halign: "right", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        ]],
        showFoot: "lastPage", // Only show totals at the very end
        theme: "grid",
        headStyles: {
            fillColor: [51, 65, 85], // slate-700
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: "bold",
            halign: "center"
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: "auto" },
            2: { cellWidth: 15 },
            3: { halign: "right", cellWidth: 15 }, // Qty
            4: { halign: "right", cellWidth: 20 }, // Price
            5: { halign: "right", cellWidth: 22 }, // Gross
            6: { halign: "right", cellWidth: 22 }, // Discount
            7: { halign: "right", cellWidth: 25, fontStyle: "bold" }, // Net
        },
        // Add Page Numbers to the bottom of every page
        didDrawPage: function () {
            const str = `Page ${doc.getCurrentPageInfo().pageNumber}`;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(str, pageWidth / 2, pageHeight - 10, { align: "center" });
        },
    });

    // --- 4. FINANCIAL SUMMARY ---
    let finalY = (doc as any).lastAutoTable.finalY + 12;

    // Smart Pagination check: If summary + signatures won't fit, add a new page
    if (finalY + 60 > pageHeight) {
        doc.addPage();
        finalY = 20; // reset Y to top of new page
    }

    const grossDirect = toNum(po?.gross_amount ?? po?.grossAmount);
    const discountTotal = toNum(po?.discounted_amount ?? po?.discountAmount);
    const totalDirect = toNum(po?.total_amount ?? po?.total);

    const netAmount = grossDirect > 0 ? Math.max(0, grossDirect - discountTotal) : totalDirect;
    const grossAmount = grossDirect > 0 ? grossDirect : netAmount + discountTotal;
    const totalAmount = totalDirect > 0 ? totalDirect : netAmount;

    const rightColX = pageWidth - 14;
    const labelX = rightColX - 45;

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", labelX, finalY, { align: "left" });
    doc.text(formatMoney(grossAmount), rightColX, finalY, { align: "right" });

    doc.text("Total Discount:", labelX, finalY + 6, { align: "left" });
    doc.setTextColor(220, 38, 38); // red-600 for discount
    doc.text(`-${formatMoney(discountTotal)}`, rightColX, finalY + 6, { align: "right" });

    // Divider for Total
    doc.setDrawColor(226, 232, 240);
    doc.line(labelX, finalY + 10, rightColX, finalY + 10);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount:", labelX - 10, finalY + 16, { align: "left" });
    doc.text(`PHP ${formatMoney(totalAmount)}`, rightColX, finalY + 16, { align: "right" });

    // --- 5. SIGNATURES ---
    renderSignatures(doc, finalY + 35);

    // --- 6. SAVE PDF ---
    doc.save(`PO-${poNumber}.pdf`);
}