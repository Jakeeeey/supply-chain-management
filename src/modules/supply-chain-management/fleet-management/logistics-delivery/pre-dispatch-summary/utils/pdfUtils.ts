"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GroupedDispatchData, VPreDispatchPlanDetailedDto } from "../types";

export const generateManifestPDF = (
    groupedData: GroupedDispatchData,
    activeStatus: string
) => {
    // PORTRAIT MODE
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerLine = pageWidth / 2;

    const today = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    Object.entries(groupedData).forEach(([dispatchNo, drivers], index) => {

        const isLeft = index % 2 === 0;

        // Add new page every 2 PDPs
        if (isLeft && index > 0) doc.addPage();

        // 📐 PERFECT 50/50 SPLIT MARGINS
        const startX = isLeft ? 15 : centerLine + 10;
        const safeRightMargin = isLeft ? centerLine + 10 : 15;
        const columnWidth = pageWidth - startX - safeRightMargin;

        // --- 🎨 HEADER TITLE ---
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 60, 120);
        doc.text(`PDP No: ${dispatchNo}`, startX, 30);

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`${today} - ${activeStatus}`, startX + columnWidth, 30, { align: "right" });

        // --- 🔄 FLATTEN & AGGREGATE ---
        const allItems: VPreDispatchPlanDetailedDto[] = [];
        Object.values(drivers).forEach(customers => {
            Object.values(customers).forEach(items => allItems.push(...items));
        });

        const pdfGroups: any = {};
        let pdpTotalAmount = 0;

        allItems.forEach(item => {
            const driver = item.driverName || "NO DRIVER";
            const plate = (item as any).plateNumber || "N/A";
            const cluster = item.clusterName || "___________";
            const prov = item.customerProvince || "UNKNOWN PROV";
            const city = item.customerCity || "UNKNOWN CITY";
            const outlet = item.customerName || "UNKNOWN OUTLET";
            const amt = item.dispatchAmount || 0;

            pdpTotalAmount += amt;

            if (!pdfGroups[driver]) pdfGroups[driver] = { plate, cluster, total: 0, provinces: {} };
            pdfGroups[driver].total += amt;

            if (!pdfGroups[driver].provinces[prov]) pdfGroups[driver].provinces[prov] = { total: 0, cities: {} };
            pdfGroups[driver].provinces[prov].total += amt;

            if (!pdfGroups[driver].provinces[prov].cities[city]) pdfGroups[driver].provinces[prov].cities[city] = { total: 0, outlets: {} };
            pdfGroups[driver].provinces[prov].cities[city].total += amt;

            if (!pdfGroups[driver].provinces[prov].cities[city].outlets[outlet]) {
                pdfGroups[driver].provinces[prov].cities[city].outlets[outlet] = {
                    totalAmt: 0,
                    remarks: new Set<string>()
                };
            }

            pdfGroups[driver].provinces[prov].cities[city].outlets[outlet].totalAmt += amt;
            if (item.dispatchRemarks) {
                pdfGroups[driver].provinces[prov].cities[city].outlets[outlet].remarks.add(item.dispatchRemarks);
            }
        });

        const tableBody: any[] = [];

        Object.entries(pdfGroups).forEach(([driver, dData]: [string, any]) => {
            // 🚚 DRIVER HEADER
            tableBody.push([{
                content: `TRUCK: ${driver} | PLATE: ${dData.plate}\nCLUSTER: ${dData.cluster}\nMANPOWER: ______________________`,
                colSpan: 2,
                styles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: "bold", cellPadding: 4, fontSize: 7 }
            }]);

            Object.entries(dData.provinces).forEach(([prov, pData]: [string, any]) => {
                // 📍 PROVINCE HEADER (Removed Emojis!)
                tableBody.push([{
                    content: prov.toUpperCase(),
                    colSpan: 2,
                    styles: { fillColor: [200, 200, 200], fontStyle: "bold", textColor: [0, 0, 0], cellPadding: 3 }
                }]);

                Object.entries(pData.cities).forEach(([city, cData]: [string, any]) => {
                    // 🏢 CITY HEADER (Removed Emojis, added indent)
                    tableBody.push([{
                        content: `  ${city.toUpperCase()}`,
                        colSpan: 2,
                        styles: { fillColor: [235, 235, 235], fontStyle: "bold", textColor: [40, 40, 40], cellPadding: 3 }
                    }]);

                    // 🛍️ OUTLETS
                    Object.entries(cData.outlets).forEach(([outlet, oData]: [string, any]) => {
                        let outletText = `    • ${outlet}`; // Clean text indent
                        if (oData.remarks.size > 0) {
                            outletText += `\n      * ${Array.from(oData.remarks).join(" | ")}`;
                        }

                        tableBody.push([
                            { content: outletText, styles: { cellPadding: { top: 3, bottom: 3, right: 2 } } },
                            { content: oData.totalAmt ? `P ${oData.totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-", styles: { halign: "right", valign: "middle", fontStyle: "bold" } }
                        ]);
                    });

                    // 💰 CITY SUBTOTAL ROW (Shortened to prevent wrapping)
                    tableBody.push([
                        { content: `City Subtotal:`, styles: { halign: "right", fontStyle: "italic", textColor: [60, 60, 60], cellPadding: 3, fontSize: 6.5 } },
                        { content: `P ${cData.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { halign: "right", fontStyle: "bold", textColor: [60, 60, 60], cellPadding: 3, fontSize: 6.5 } }
                    ]);
                });

                // 💰 PROVINCE SUBTOTAL ROW (Shortened to prevent wrapping)
                tableBody.push([
                    { content: `Provincial Subtotal:`, styles: { halign: "right", fontStyle: "italic", fillColor: [245, 245, 245], cellPadding: 4, fontSize: 7 } },
                    { content: `P ${pData.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245], cellPadding: 4, fontSize: 7 } }
                ]);
            });
        });

        // 📈 GRAND TOTAL
        tableBody.push([{
            content: `GRAND TOTAL FOR ${dispatchNo}`,
            styles: { halign: "right", fontStyle: "bold", fillColor: [180, 180, 180], cellPadding: 5, fontSize: 8 }
        }, {
            content: `P ${pdpTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            styles: { halign: "right", fontStyle: "bold", fillColor: [180, 180, 180], cellPadding: 5, fontSize: 8 }
        }]);

        // --- 🖨️ DRAW STRICTLY BOUNDED COLUMN TABLE ---
        autoTable(doc, {
            startY: 40,
            margin: { left: startX, right: safeRightMargin, bottom: 40 }, // Added bottom margin for signatures
            head: [["Outlet / Location", "Amount"]],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: [150, 150, 150], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", cellPadding: 4, fontSize: 7.5 },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { cellWidth: 70 } // Locked width for the Amount column
            },
            styles: { fontSize: 7, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.5 }
        });

        // --- ✍️ ABSOLUTE SIGNATURES (Outside the table) ---
        const finalY = (doc as any).lastAutoTable.finalY + 25;

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);

        // Left Signature (Prepared By)
        doc.text("Prepared By: __________________", startX, finalY);

        // Right Signature (Approved By)
        doc.text("Approved By: __________________", startX + columnWidth, finalY, { align: "right" });
    });

    doc.save(`Dispatch-Manifest-${activeStatus}.pdf`);
};