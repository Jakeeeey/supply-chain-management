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
    drivers?: string[] | string;
    totalAmount?: number;
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

export const generatePickerPDF = async (
    groupedManifest: Record<string, PickerItem[]>,
    batchNo: string,
    totalSalesOrderAmount?: number
) => {

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
        const uniqueDrivers = new Set<string>();

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

            // Aggregate unique Drivers
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

        // Render Drivers in Header
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

        nextY += (splitSummary.length * 3.5);

        // Render Total Sales Order Amount in Header
        if (totalSalesOrderAmount !== undefined) {
            doc.setFont("helvetica", "bold").setTextColor(0, 0, 0);
            doc.text(`Consolidation Total:`, 14, nextY);
            doc.setFont("helvetica", "normal");
            const formattedTotal = `PHP ${totalSalesOrderAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            doc.text(formattedTotal, 45, nextY);
            nextY += 4;
        }

        // Calculate dynamic start Y for the table so it doesn't overlap the header
        const tableStartY = nextY + 2;


        // --- 3. FLAT DATA PROCESSING WITH SPACE OPTIMIZATIONS ---
        const tableRows: TableCell[][] = [];

        // Sort items by Category, Brand, and Name for organized picking
        const sortedItems = [...items].sort((a, b) => {
            const catA = (a.categoryName || "").toUpperCase();
            const catB = (b.categoryName || "").toUpperCase();
            if (catA !== catB) return catA.localeCompare(catB);

            const brandA = (a.brandName || "").toUpperCase();
            const brandB = (b.brandName || "").toUpperCase();
            if (brandA !== brandB) return brandA.localeCompare(brandB);

            return (a.productName || "").toUpperCase().localeCompare((b.productName || "").toUpperCase());
        });

        sortedItems.forEach((item: PickerItem) => {
            let unitStyle: Record<string, unknown> = { fontStyle: 'normal', textColor: [0, 0, 0] };

            switch (item.unitOrder) {
                case 1: unitStyle = { fontStyle: 'bold', textColor: [0, 0, 0] }; break;
                case 2: unitStyle = { fontStyle: 'italic', textColor: [80, 80, 80] }; break;
                case 3: unitStyle = { fontStyle: 'bolditalic', textColor: [50, 50, 50] }; break;
                default: unitStyle = { fontStyle: 'normal', textColor: [100, 100, 100] }; break;
            }

            const qty = item.quantity || item.orderedQuantity || 0;
            const amt = item.totalAmount || 0;
            const formattedAmt = `PHP ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            tableRows.push([
                "", // Checkbox
                (item.categoryName || "GENERAL").toUpperCase(),
                (item.brandName || "NO BRAND").toUpperCase(),
                item.productName.toUpperCase(),
                { content: item.unit || item.unitName || "-", styles: unitStyle },
                qty,
                formattedAmt
            ]);
        });

        // --- 4. TIGHT SPACE-OPTIMIZED TABLE RENDER ---
        autoTable(doc, {
            startY: tableStartY, // Starts dynamically below the extended header
            head: [["", "CATEGORY", "BRAND", "DESCRIPTION", "UNIT", "QTY", "TOTAL AMOUNT"]],
            body: tableRows,
            theme: "plain",
            headStyles: { textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6.5, cellPadding: 0.6, lineWidth: { bottom: 0.2 }, lineColor: [0, 0, 0] },
            styles: {
                fontSize: 6.5,
                cellPadding: 0.6,
                textColor: [0, 0, 0],
                lineColor: [220, 220, 220],
                lineWidth: { bottom: 0.1 },
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 6 },
                1: { cellWidth: 20 },
                2: { cellWidth: 20 },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 12, halign: 'center' },
                5: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
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