import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { PostDispatchApprovalDto } from "../types"

const formatPDFCurrency = (val: number) => `PHP ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const exportDispatchManifestPDF = (plan: PostDispatchApprovalDto) => {
    if (!plan) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ==========================================
    // 🌿 ECO-DRIVER MODE: Low Ink, High Data Density
    // ==========================================

    const driver = plan.staff?.find(s => s.role.toUpperCase() === 'DRIVER')?.name || "Unassigned";
    const helpers = plan.staff?.filter(s => s.role.toUpperCase() !== 'DRIVER').map(s => s.name).join(", ") || "None";
    const depTime = plan.estimatedTimeOfDispatch ? new Date(plan.estimatedTimeOfDispatch).toLocaleString() : 'TBD';

    // --- 1. COMPACT HEADER ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`MANIFEST: ${plan.docNo}`, 14, 16);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Driver: ${driver}  |  Helpers: ${helpers}`, 14, 22);
    doc.text(`Dispatch: ${depTime}  |  Distance: ${plan.totalDistance || '-'} km`, pageWidth - 14, 22, { align: "right" });

    let currentY = 26;

    // --- 2. ROUTE & CARGO TABLE ---
    const routeBody: any[] = [];

    // Aggregation variables for the footer
    const supplierSummary: Record<string, Record<string, number>> = {};
    const invoiceSummary: any[] = [];

    plan.stops?.forEach((stop) => {
        // Build Summaries
        if (stop.type === "DELIVERY") {
            invoiceSummary.push([stop.name, stop.documentNo !== 'N/A' ? stop.documentNo : '-', formatPDFCurrency(stop.documentAmount)]);
        }

        // Stop Header (NO shading, just a top border to separate)
        routeBody.push([
            {
                content: `[  ] ${stop.sequence}. ${stop.type} - ${stop.name.toUpperCase()} ${stop.documentNo !== 'N/A' ? `(Doc: ${stop.documentNo})` : ''}`,
                colSpan: 2,
                styles: { fontStyle: "bold", fontSize: 9, textColor: 0, lineWidth: { top: 0.5 }, cellPadding: { top: 3, bottom: 1, left: 2, right: 2 } }
            },
            {
                content: stop.documentAmount > 0 ? `COLLECT: ${formatPDFCurrency(stop.documentAmount)}` : "-",
                styles: { fontStyle: "bold", fontSize: 9, halign: "right", textColor: 0, lineWidth: { top: 0.5 }, cellPadding: { top: 3, bottom: 1, left: 2, right: 2 } }
            }
        ]);

        // Cargo Items
        if (stop.items && stop.items.length > 0) {
            stop.items.forEach(item => {
                // Populate Supplier Summary
                const sup = item.supplier || "UNKNOWN";
                const unit = item.unit || "PC";
                if (!supplierSummary[sup]) supplierSummary[sup] = {};
                if (!supplierSummary[sup][unit]) supplierSummary[sup][unit] = 0;
                supplierSummary[sup][unit] += item.quantity;

                routeBody.push([
                    { content: "", styles: { cellWidth: 5 } }, // Tiny indent
                    { content: `${item.quantity} ${item.unit} - ${item.name} ${item.brand && item.brand !== 'No Brand' ? `(${item.brand})` : ''}`, styles: { fontSize: 8, textColor: 20, cellPadding: 1 } },
                    { content: formatPDFCurrency(item.amount), styles: { halign: "right", fontSize: 8, textColor: 40, cellPadding: 1 } }
                ]);
            });
        } else {
            routeBody.push(["", { content: "No cargo items.", colSpan: 2, styles: { fontStyle: "italic", fontSize: 8, textColor: 100, cellPadding: 1 } }]);
        }

        // Compact Signature Line directly attached to the stop
        if (stop.type !== "OTHER") {
            routeBody.push([
                {
                    content: "Sign: ___________________________   Date: ______________",
                    colSpan: 3,
                    styles: { fontSize: 8, fontStyle: "italic", halign: "right", textColor: 50, cellPadding: { top: 1, bottom: 3 } }
                }
            ]);
        }
    });

    autoTable(doc, {
        startY: currentY,
        head: [["", "Destination & Cargo", "Amount"]],
        body: routeBody,
        theme: "plain",
        headStyles: { fillColor: false, textColor: 0, fontStyle: "bold", fontSize: 8, lineWidth: { bottom: 0.5 }, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 5 }, // Just for indentation
            1: { cellWidth: "auto" },
            2: { cellWidth: 40 }
        },
        styles: { font: "helvetica" }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // --- 3. FOOTER SUMMARIES (Side-by-Side to save paper) ---
    // Flatten Supplier Summary
    const suppBody: any[] = [];
    Object.entries(supplierSummary).sort(([a], [b]) => a.localeCompare(b)).forEach(([sup, units]) => {
        Object.entries(units).forEach(([unit, qty]) => {
            suppBody.push([{ content: sup, styles: { cellPadding: 1 } }, { content: `${qty} ${unit}`, styles: { halign: "right", cellPadding: 1 } }]);
        });
    });

    // Flatten Budget
    const budgetBody: any[] = plan.budgets && plan.budgets.length > 0
        ? plan.budgets.map(b => [{ content: b.remarks || 'Budget', styles: { cellPadding: 1 } }, { content: formatPDFCurrency(b.amount), styles: { halign: "right", cellPadding: 1 } }])
        : [[{ content: "No budget requested.", colSpan: 2, styles: { fontStyle: "italic", cellPadding: 1 } }]];

    const totalBudget = plan.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
    if (totalBudget > 0) {
        budgetBody.push([{ content: "TOTAL CASH", styles: { fontStyle: "bold", cellPadding: 1 } }, { content: formatPDFCurrency(totalBudget), styles: { fontStyle: "bold", halign: "right", cellPadding: 1 } }]);
    }

    // Page break protection for summaries
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
    }

    // A. Supplier Summary (Left Column)
    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: pageWidth / 2 + 5 },
        head: [["Supplier Cargo Summary", "Qty"]],
        body: suppBody.length > 0 ? suppBody : [["No supplier data.", ""]],
        theme: "plain",
        headStyles: { fillColor: false, textColor: 0, fontStyle: "bold", fontSize: 8, lineWidth: { bottom: 0.5 }, cellPadding: 2 },
        styles: { fontSize: 7, textColor: 0 }
    });

    const suppTableY = (doc as any).lastAutoTable.finalY;

    // B. Budget Summary (Right Column)
    autoTable(doc, {
        startY: currentY,
        margin: { left: pageWidth / 2 + 5, right: 14 },
        head: [["Trip Budget", "Amount"]],
        body: budgetBody,
        theme: "plain",
        headStyles: { fillColor: false, textColor: 0, fontStyle: "bold", fontSize: 8, lineWidth: { bottom: 0.5 }, cellPadding: 2 },
        styles: { fontSize: 7, textColor: 0 }
    });

    const budgetTableY = (doc as any).lastAutoTable.finalY;

    // C. Invoice/Receipts Summary (Spans full width below)
    currentY = Math.max(suppTableY, budgetTableY) + 6;

    if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
    }

    autoTable(doc, {
        startY: currentY,
        head: [["Customer Name", "Invoice No.", "Amount"]],
        body: invoiceSummary.length > 0 ? invoiceSummary : [["No deliveries logged.", "", ""]],
        theme: "plain",
        headStyles: { fillColor: false, textColor: 0, fontStyle: "bold", fontSize: 8, lineWidth: { bottom: 0.5 }, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: "auto" },
            1: { cellWidth: 50 },
            2: { cellWidth: 40, halign: "right" }
        },
        styles: { fontSize: 7, textColor: 0, cellPadding: 1.5 }
    });

    // --- 4. END OF TRIP SIGN-OFF ---
    currentY = (doc as any).lastAutoTable.finalY + 12;
    if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("END OF TRIP CLEARANCE", 14, currentY);
    doc.setFont("helvetica", "normal");
    doc.text("Driver: ___________________________", 14, currentY + 8);
    doc.text("Dispatcher: ___________________________", pageWidth / 2, currentY + 8);

    // --- 5. PAGINATION ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100);
        doc.text(`Page ${i} of ${pageCount}  |  ${plan.docNo}  |  Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 6, { align: "center" });
    }

    doc.save(`Manifest_${plan.docNo}.pdf`);
};