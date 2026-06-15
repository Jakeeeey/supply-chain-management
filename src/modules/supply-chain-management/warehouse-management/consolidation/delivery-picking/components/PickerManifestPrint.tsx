export interface PickerItem {
    productId: string | number;
    productName: string;
    supplierName?: string;
    brandName?: string;
    categoryName?: string;
    unit?: string;
    unitName?: string;
    quantity?: number;
    orderedQuantity?: number;
    unitOrder?: number;
    dispatchNos?: string[] | string;
    drivers?: string[] | string; // 🚀 ADDED DRIVERS
}

// Type definitions to replace `any` in autoTable configurations
type TableCell = string | number | {
    content: string | number;
    colSpan?: number;
    styles?: Record<string, unknown>;
};

interface AutoTableCellData {
    column: { index: number };
    cell: {
        section: 'head' | 'body' | 'foot';
        raw: unknown;
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

interface AutoTablePageData {
    pageNumber: number;
}

export const generatePickerPDF = async (groupedManifest: Record<string, PickerItem[]>, batchNo: string) => {

    // ✅ Dynamically import libraries and use strict type casting
    const jsPDFModule = await import("jspdf");
    const JsPDFClass = (jsPDFModule.default || jsPDFModule.jsPDF) as unknown as typeof import("jspdf").jsPDF;

    const autoTableModule = await import("jspdf-autotable");
    const autoTable = (autoTableModule.default || autoTableModule) as unknown as typeof import("jspdf-autotable").default;

    const doc = new JsPDFClass();

    Object.entries(groupedManifest).forEach(([rawPickerName, items], index) => {
        const isUnassigned = !rawPickerName ||
            rawPickerName.toLowerCase().includes("null") ||
            rawPickerName.includes("GENERAL");
        const pickerName = isUnassigned ? "GENERAL / UNASSIGNED" : rawPickerName;

        if (index > 0) doc.addPage();

        // 🚀 1. PRE-CALCULATE DATA FOR THE HEADER
        const uomTotals: Record<string, number> = {};
        const uniquePdps = new Set<string>();
        const uniqueDrivers = new Set<string>(); // 🚀 NEW

        items.forEach(item => {
            // Aggregate UOMs
            const qty = item.quantity || item.orderedQuantity || 0;
            const uom = (item.unit || item.unitName || "UNITS").toUpperCase();
            uomTotals[uom] = (uomTotals[uom] || 0) + qty;

            // Aggregate unique PDPs
            if (item.dispatchNos) {
                const pdpString = Array.isArray(item.dispatchNos)
                    ? item.dispatchNos.join(", ")
                    : String(item.dispatchNos);

                if (pdpString.trim() !== "") {
                    pdpString.split(",").forEach(pdp => uniquePdps.add(pdp.trim()));
                }
            }

            // 🚀 Aggregate unique Drivers
            if (item.drivers) {
                const driverString = Array.isArray(item.drivers)
                    ? item.drivers.join(", ")
                    : String(item.drivers);

                if (driverString.trim() !== "") {
                    driverString.split(",").forEach(d => uniqueDrivers.add(d.trim()));
                }
            }
        });

        const summaryString = Object.entries(uomTotals)
            .map(([uom, total]) => `${total} ${uom}`)
            .join("   |   ");

        const pdpListString = Array.from(uniquePdps).join(", ");
        const driverListString = Array.from(uniqueDrivers).join(", ");


        // --- 2. MINIMALIST INK-SAVING HEADER WITH SUMMARIES ---
        doc.setFontSize(12).setFont("helvetica", "bold");
        doc.text(`${batchNo}`, 14, 12);

        doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(80, 80, 80);
        doc.text(new Date().toLocaleDateString(), 198, 12, { align: 'right' });

        doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(0, 0, 0);
        doc.text(`Picker:`, 14, 16);
        doc.setFont("helvetica", "normal");
        doc.text(`${pickerName.toUpperCase()}`, 25, 16);

        // Render PDPs in Header
        doc.setFont("helvetica", "bold").setTextColor(80, 80, 80);
        doc.text(`PDPs:`, 14, 20);
        doc.setFont("helvetica", "normal");
        const splitPdps = doc.splitTextToSize(pdpListString || "N/A", 160);
        doc.text(splitPdps, 23, 20);

        // Calculate next Y position based on how many lines the PDPs took
        let nextY = 20 + (splitPdps.length * 3.5);

        // 🚀 Render Drivers in Header
        doc.setFont("helvetica", "bold").setTextColor(80, 80, 80);
        doc.text(`Drivers:`, 14, nextY);
        doc.setFont("helvetica", "normal");
        const splitDrivers = doc.splitTextToSize(driverListString || "UNASSIGNED", 160);
        doc.text(splitDrivers, 25, nextY);

        nextY += (splitDrivers.length * 3.5);

        // Render UOM Totals in Header
        doc.setFont("helvetica", "bold").setTextColor(0, 0, 0);
        doc.text(`Totals:`, 14, nextY);
        doc.setFont("helvetica", "bold").setTextColor(10, 10, 10);
        const splitSummary = doc.splitTextToSize(summaryString || "N/A", 160);
        doc.text(splitSummary, 25, nextY);

        // Calculate dynamic start Y for the table so it doesn't overlap the header
        const tableStartY = nextY + (splitSummary.length * 3.5) + 2;


        // --- 3. HIERARCHICAL DATA PROCESSING ---
        const tableRows: TableCell[][] = [];
        const supplierGroups = items.reduce((acc: Record<string, Record<string, PickerItem[]>>, item: PickerItem) => {
            const sKey = (item.supplierName || 'DIRECT').toUpperCase();
            const bKey = (item.brandName || 'NO BRAND').toUpperCase();
            const fullKey = `${sKey} | ${bKey}`;

            if (!acc[fullKey]) acc[fullKey] = {};
            const cKey = (item.categoryName || 'GENERAL').toUpperCase();
            if (!acc[fullKey][cKey]) acc[fullKey][cKey] = [];

            acc[fullKey][cKey].push(item);
            return acc;
        }, {});

        Object.entries(supplierGroups).forEach(([mainHeader, categories]) => {
            tableRows.push([
                { content: mainHeader, colSpan: 4, styles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 3, bottom: 1, left: 1, right: 1 } } }
            ]);

            Object.entries(categories).forEach(([catName, catItems]) => {
                tableRows.push([
                    { content: `   CAT: ${catName}`, colSpan: 4, styles: { fillColor: false, textColor: [50, 50, 50], fontStyle: 'italic', fontSize: 6.5, cellPadding: 1 } }
                ]);

                catItems.forEach((item: PickerItem) => {
                    let unitStyle: Record<string, unknown> = { fontStyle: 'normal', textColor: [0, 0, 0] };

                    switch (item.unitOrder) {
                        case 1: unitStyle = { fontStyle: 'bold', textColor: [0, 0, 0] }; break;
                        case 2: unitStyle = { fontStyle: 'italic', textColor: [80, 80, 80] }; break;
                        case 3: unitStyle = { fontStyle: 'bolditalic', textColor: [50, 50, 50] }; break;
                        default: unitStyle = { fontStyle: 'normal', textColor: [100, 100, 100] }; break;
                    }

                    // Product description with PDPs appended below it
                    const productDesc = item.productName.toUpperCase();
                    tableRows.push([
                        "", // Checkbox
                        { content: productDesc, styles: { overflow: 'linebreak' } },
                        { content: item.unit || item.unitName || "-", styles: unitStyle },
                        item.quantity || item.orderedQuantity || 0
                    ]);
                });
            });
        });

        // --- 4. INK-EFFICIENT TABLE RENDER ---
        autoTable(doc, {
            startY: tableStartY, // Starts dynamically below the extended header
            head: [["", "PRODUCT DESCRIPTION", "UNIT", "QTY"]],
            body: tableRows,
            theme: "plain",
            headStyles: { textColor: [0, 0, 0], fontStyle: "bold", fontSize: 7, cellPadding: 1, lineWidth: { bottom: 0.2 }, lineColor: [0, 0, 0] },
            styles: {
                fontSize: 7.5,
                cellPadding: 1,
                textColor: [0, 0, 0],
                lineColor: [200, 200, 200],
                lineWidth: { bottom: 0.1 },
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 8 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }
            },
            didDrawCell: (data: AutoTableCellData) => {
                if (data.column.index === 0 && data.cell.section === 'body' && data.cell.raw === "") {
                    const size = 3;
                    const x = data.cell.x + (data.cell.width / 2) - (size / 2);
                    const y = data.cell.y + (data.cell.height / 2) - (size / 2);
                    doc.setLineWidth(0.1).setDrawColor(0).rect(x, y, size, size);
                }
            },
            didDrawPage: (data: AutoTablePageData) => {
                doc.setFontSize(7).setTextColor(161, 161, 170);
                doc.text(`Batch: ${batchNo} | Page ${data.pageNumber}`, 14, doc.internal.pageSize.height - 8);
            }
        });

        // --- 5. TIGHT FOOTER SIGNATURES ---
        const extendedDoc = doc as import("jspdf").jsPDF & { lastAutoTable: { finalY: number } };
        let finalY = extendedDoc.lastAutoTable.finalY + 10;

        if (finalY > 275) {
            doc.addPage();
            finalY = 20;
        }

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(14, finalY + 6, 70, finalY + 6);
        doc.setFontSize(6).setTextColor(50, 50, 50).text("PICKER CONFIRMATION", 14, finalY + 9);
        doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(0, 0, 0).text(pickerName, 14, finalY + 4);

        doc.line(130, finalY + 6, 186, finalY + 6);
        doc.setFontSize(6).setTextColor(50, 50, 50).text("VERIFICATION OFFICER", 130, finalY + 9);
    });

    doc.save(`PICKLIST_${batchNo}.pdf`);
};