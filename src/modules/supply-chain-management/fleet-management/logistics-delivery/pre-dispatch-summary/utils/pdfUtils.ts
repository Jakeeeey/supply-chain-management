"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GroupedDispatchData, VPreDispatchPlanDetailedDto } from "../types";

export const generateManifestPDF = (
    groupedData: GroupedDispatchData,
    activeStatus: string
) => {
    const doc = new jsPDF("l", "pt", "a4");

    const today = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric' // Shorter date format
    });

    Object.entries(groupedData).forEach(([dispatchNo, drivers], index) => {
        if (index > 0) doc.addPage();

        // 📉 SHRUNK HEADER MARGINS (Moved closer to the top edge)
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${today} - ${activeStatus} BATCH`, 20, 30);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Pre-Dispatch No: ${dispatchNo}`, doc.internal.pageSize.getWidth() - 20, 30, { align: "right" });

        doc.setLineWidth(0.5);
        doc.line(20, 35, doc.internal.pageSize.getWidth() - 20, 35);

        // --- DEEP RE-GROUPING ---
        const allItems: VPreDispatchPlanDetailedDto[] = [];
        Object.values(drivers).forEach(customers => {
            Object.values(customers).forEach(items => allItems.push(...items));
        });

        const pdfGroups: any = {};
        let pdpTotalAmount = 0;

        allItems.forEach(item => {
            const driver = item.driverName || "NO DRIVER";
            const plate = (item as any).plateNumber || "N/A";
            const prov = item.customerProvince || "UNKNOWN PROVINCE";
            const city = item.customerCity || "UNKNOWN CITY";
            const outlet = item.customerName || "UNKNOWN OUTLET";
            const amt = item.dispatchAmount || 0;

            pdpTotalAmount += amt;

            if (!pdfGroups[driver]) pdfGroups[driver] = { plate, total: 0, provinces: {} };
            pdfGroups[driver].total += amt;

            if (!pdfGroups[driver].provinces[prov]) pdfGroups[driver].provinces[prov] = { total: 0, cities: {} };
            pdfGroups[driver].provinces[prov].total += amt;

            if (!pdfGroups[driver].provinces[prov].cities[city]) pdfGroups[driver].provinces[prov].cities[city] = { total: 0, outlets: {} };
            pdfGroups[driver].provinces[prov].cities[city].total += amt;

            if (!pdfGroups[driver].provinces[prov].cities[city].outlets[outlet]) {
                pdfGroups[driver].provinces[prov].cities[city].outlets[outlet] = [];
            }
            pdfGroups[driver].provinces[prov].cities[city].outlets[outlet].push(item);
        });

        const tableBody: any[] = [];

        Object.entries(pdfGroups).forEach(([driver, dData]: [string, any]) => {

            // 🚚 DRIVER HEADER (Compact padding, smaller font)
            tableBody.push([{
                content: `DRIVER: ${driver}  |  PLATE: ${dData.plate}  |  TOTAL: P ${dData.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                colSpan: 4,
                styles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5, cellPadding: 3 }
            }]);

            Object.entries(dData.provinces).forEach(([prov, pData]: [string, any]) => {

                // 📍 PROVINCE HEADER (Tighter left indent)
                tableBody.push([{
                    content: `${prov.toUpperCase()} (P ${pData.total.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
                    colSpan: 4,
                    styles: { fillColor: [220, 220, 220], fontStyle: "bold", textColor: [0, 0, 0], cellPadding: { left: 6, top: 2, bottom: 2, right: 2 } }
                }]);

                Object.entries(pData.cities).forEach(([city, cData]: [string, any]) => {

                    // 🏢 CITY HEADER (Tighter left indent)
                    tableBody.push([{
                        content: `${city.toUpperCase()} (P ${cData.total.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
                        colSpan: 4,
                        styles: { fillColor: [245, 245, 245], fontStyle: "bold", textColor: [50, 50, 50], cellPadding: { left: 14, top: 2, bottom: 2, right: 2 } }
                    }]);

                    // 🛍️ OUTLETS (Tighter left indent, minimal vertical padding)
                    Object.entries(cData.outlets).forEach(([outlet, oItems]: [string, any]) => {
                        oItems.forEach((item: VPreDispatchPlanDetailedDto) => {
                            let outletText = `• ${outlet}`;
                            if (item.dispatchRemarks) outletText += `\n  * ${item.dispatchRemarks}`; // Shorter remark tag

                            tableBody.push([
                                { content: outletText, styles: { cellPadding: { left: 22, top: 2, bottom: 2, right: 2 } } },
                                { content: item.orderNo || "-", styles: { valign: "middle", fontStyle: "bold" } },
                                { content: item.dispatchAmount ? `P ${item.dispatchAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-", styles: { halign: "right", valign: "middle", fontStyle: "italic" } },
                                { content: "", styles: { valign: "middle" } } // Manpower
                            ]);
                        });
                    });
                });
            });
        });

        // 📈 GRAND TOTAL FOR ENTIRE PDP
        tableBody.push([{
            content: `GRAND TOTAL FOR ${dispatchNo}`,
            colSpan: 2,
            styles: { halign: "right", fontStyle: "bold", fillColor: [200, 200, 200], fontSize: 9, cellPadding: 4 }
        }, {
            content: `P ${pdpTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            styles: { halign: "right", fontStyle: "bold", fillColor: [200, 200, 200], fontSize: 9, cellPadding: 4 }
        }, {
            content: "", styles: { fillColor: [200, 200, 200] }
        }]);

        // --- DRAW ULTRA-COMPACT TABLE ---
        autoTable(doc, {
            startY: 45, // 📉 Moved table way up to save top-page space
            head: [["Location / Outlet", "Order No.", "Amount", "Manpower / Notes"]],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", valign: "middle", cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: "auto" }, // Expands to maximum width to prevent word-wrap
                1: { cellWidth: 80 },     // 📉 Squeezed from 100
                2: { cellWidth: 70 },     // 📉 Squeezed from 100
                3: { cellWidth: 100 }     // 📉 Squeezed from 150
            },
            // 📉 GLOBAL ROW COMPRESSION SETTINGS
            styles: {
                fontSize: 7.5,      // Smaller font allows tighter rows
                cellPadding: 2,     // Absolute minimal padding
                lineColor: [0, 0, 0],
                lineWidth: 0.5
            },
            // 📉 PAGE MARGIN COMPRESSION
            margin: { top: 45, left: 20, right: 20, bottom: 40 } // Stretches table to page edges
        });

        // --- FOOTER SIGNATURES ---
        const finalY = (doc as any).lastAutoTable.finalY + 30; // 📉 Moved signatures closer to table

        if (finalY < doc.internal.pageSize.getHeight() - 40) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");

            doc.line(20, finalY, 140, finalY);
            doc.text("Logistics Manager", 80, finalY + 10, { align: "center" });

            const rightEdge = doc.internal.pageSize.getWidth() - 20;
            doc.line(rightEdge - 120, finalY, rightEdge, finalY);
            doc.text("Approver", rightEdge - 60, finalY + 10, { align: "center" });
        }
    });

    doc.save(`Dispatch-Manifest-${activeStatus}.pdf`);
};