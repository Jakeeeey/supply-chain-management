import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { PostDispatchApprovalDto } from "../types"

// Uses "PHP " to prevent jsPDF Unicode errors while printing
const formatPDFCurrency = (val: number) => `PHP ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const exportDispatchManifestPDF = (plan: PostDispatchApprovalDto) => {
    if (!plan) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ==========================================
    // 🌿 ECO-MODE: Minimal ink, tight spacing
    // ==========================================

    // --- 1. COMPACT HEADER ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Pure black ink
    doc.text(`DISPATCH MANIFEST: ${plan.docNo}`, 14, 16);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const depTime = plan.estimatedTimeOfDispatch ? new Date(plan.estimatedTimeOfDispatch).toLocaleString() : 'TBD';
    doc.text(`Departure: ${depTime}   |   Distance: ${plan.totalDistance} km`, 14, 21);

    let currentY = 25; // Pulling everything up higher on the page

    // --- 2. ITINERARY & CARGO SECTION ---
    const routeBody: any[] = [];

    plan.stops?.forEach((stop) => {
        // Stop Header Row: No background fill, just a thin top border line to separate stops
        routeBody.push([
            {
                content: `[${stop.sequence}] ${stop.type} - ${stop.name} ${stop.documentNo !== 'N/A' ? `(Doc: ${stop.documentNo})` : ''}`,
                colSpan: 2,
                styles: { fontStyle: "bold", textColor: 0, lineWidth: { top: 0.5, bottom: 0 }, lineColor: 0, paddingTop: 3 }
            },
            {
                content: formatPDFCurrency(stop.documentAmount),
                styles: { fontStyle: "bold", halign: "right", textColor: 0, lineWidth: { top: 0.5, bottom: 0 }, lineColor: 0, paddingTop: 3 }
            }
        ]);

        // Cargo Items Rows: Compressed padding, bullet point simulated indent
        if (stop.items && stop.items.length > 0) {
            stop.items.forEach(item => {
                routeBody.push([
                    { content: `   • ${item.name}` },
                    { content: `${item.quantity} ${item.unit}`, styles: { halign: "center" } },
                    { content: formatPDFCurrency(item.amount), styles: { halign: "right" } }
                ]);
            });
        } else {
            routeBody.push([
                { content: "   No specific cargo items logged.", colSpan: 3, styles: { fontStyle: "italic", textColor: 80 } }
            ]);
        }
    });

    autoTable(doc, {
        startY: currentY,
        head: [["Description / Cargo", "Qty / Unit", "Amount"]],
        body: routeBody,
        theme: "plain", // 🌿 Strips all default background colors
        headStyles: { fillColor: false, textColor: 0, fontStyle: "bold", lineWidth: { bottom: 0.5 }, lineColor: 0 },
        columnStyles: {
            0: { cellWidth: "auto" },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 }
        },
        styles: {
            fontSize: 8,       // Smaller font saves space
            cellPadding: 1,    // 🌿 Drastically reduced padding saves vertical height
            textColor: 0       // Pure black ink
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8; // Tighter gap between tables

    // --- 3. CREW & BUDGET SECTION (Side-by-side) ---

    // 🚀 FIX: Explicitly type as any[] to satisfy TS
    const budgetBody: any[] = plan.budgets && plan.budgets.length > 0
        ? plan.budgets.map(b => [b.remarks, { content: formatPDFCurrency(b.amount), styles: { halign: "right" } }])
        : [["None", ""]];

    const totalBudget = plan.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
    if (totalBudget > 0) {
        budgetBody.push([{ content: "TOTAL", styles: { fontStyle: "bold" } }, { content: formatPDFCurrency(totalBudget), styles: { fontStyle: "bold", halign: "right" } }]);
    }

    // 🚀 FIX: Explicitly type as any[] to satisfy TS
    const crewBody: any[] = plan.staff && plan.staff.length > 0
        ? plan.staff.map(s => [s.name, s.role])
        : [["None", ""]];

    // Left Table: Crew
    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: pageWidth / 2 + 3 },
        head: [["Assigned Crew", "Role"]],
        body: crewBody,
        theme: "plain",
        headStyles: { fillColor: false, textColor: 0, fontStyle: "bold", lineWidth: { bottom: 0.5 }, lineColor: 0 },
        styles: { fontSize: 8, cellPadding: 1, textColor: 0 }
    });

    // Right Table: Budget
    autoTable(doc, {
        startY: currentY,
        margin: { left: pageWidth / 2 + 3, right: 14 },
        head: [["Budget Request", "Amount"]],
        body: budgetBody,
        theme: "plain",
        headStyles: { fillColor: false, textColor: 0, fontStyle: "bold", lineWidth: { bottom: 0.5 }, lineColor: 0 },
        styles: { fontSize: 8, cellPadding: 1, textColor: 0 }
    });

    // --- 4. PAGINATION & FOOTER ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100); // Lighter gray for footer

        const footerText = `Page ${i} of ${pageCount}   |   ${plan.docNo}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: "center" });
    }

    // --- 5. SAVE ---
    doc.save(`Manifest_${plan.docNo}.pdf`);
};