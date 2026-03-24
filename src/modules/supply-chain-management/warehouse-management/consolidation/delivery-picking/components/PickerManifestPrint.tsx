interface PickerItem {
    productId: string | number;
    productName: string;
    supplierName?: string;
    brandName?: string;
    categoryName?: string;
    unit?: string;
    unitName?: string;
    quantity?: number;
    orderedQuantity?: number;
}

export const generatePickerPDF = async (groupedManifest: Record<string, PickerItem[]>, batchNo: string) => {

    // ✅ 2. Dynamically import libraries ONLY when the function runs
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || (jsPDFModule as any);

    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default || (autoTableModule as any);

    const doc = new jsPDF();

    Object.entries(groupedManifest).forEach(([rawPickerName, items], index) => {
        const isUnassigned = !rawPickerName ||
            rawPickerName.toLowerCase().includes("null") ||
            rawPickerName.includes("GENERAL");
        const pickerName = isUnassigned ? "GENERAL / UNASSIGNED" : rawPickerName;

        if (index > 0) doc.addPage();

        // --- 1. COMPACT MODERN HEADER ---
        doc.setFillColor(24, 24, 27);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16).setFont("helvetica", "bold").text("PICK LIST", 14, 12);
        doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(161, 161, 170);
        doc.text(`BATCH: ${batchNo}  |  DATE: ${new Date().toLocaleString()}`, 14, 20);

        doc.setFillColor(39, 39, 42);
        doc.roundedRect(145, 6, 50, 18, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6).text("ASSIGNED PICKER", 148, 11);
        doc.setFontSize(8).setFont("helvetica", "bold").text(pickerName.toUpperCase(), 148, 18);

        // --- 2. HIERARCHICAL DATA PROCESSING ---
        const tableRows: any[] = [];
        const supplierGroups = items.reduce((acc: any, item: PickerItem) => {
            const sKey = (item.supplierName || 'DIRECT').toUpperCase();
            const bKey = (item.brandName || 'NO BRAND').toUpperCase();
            const fullKey = `${sKey} | ${bKey}`;
            if (!acc[fullKey]) acc[fullKey] = {};
            const cKey = (item.categoryName || 'GENERAL').toUpperCase();
            if (!acc[fullKey][cKey]) acc[fullKey][cKey] = [];
            acc[fullKey][cKey].push(item);
            return acc;
        }, {});

        Object.entries(supplierGroups).forEach(([mainHeader, categories]: [string, any]) => {
            tableRows.push([
                { content: mainHeader, colSpan: 5, styles: { fillColor: [39, 39, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 2 } }
            ]);

            Object.entries(categories).forEach(([catName, catItems]: [string, any]) => {
                tableRows.push([
                    { content: `Category: ${catName}`, colSpan: 5, styles: { fillColor: [244, 244, 245], textColor: [82, 82, 91], fontStyle: 'bold', fontSize: 7, cellPadding: 1.5 } }
                ]);

                catItems.forEach((item: PickerItem) => {
                    tableRows.push([
                        "", // Checkbox
                        item.productName.toUpperCase(),
                        item.unit || item.unitName,
                        item.quantity || item.orderedQuantity,
                        "__________" // Picked Column
                    ]);
                });
            });
        });

        // --- 3. TABLE RENDER WITH DRAWN CHECKBOXES ---
        autoTable(doc, {
            startY: 35,
            head: [["", "PRODUCT DESCRIPTION", "UNIT", "TARGET", "PICKED"]],
            body: tableRows,
            theme: "plain",
            headStyles: { textColor: [113, 113, 122], fontStyle: "bold", fontSize: 7, cellPadding: 2 },
            styles: {
                fontSize: 8.5,
                cellPadding: 3,
                textColor: [24, 24, 27],
                lineColor: [228, 228, 231],
                lineWidth: 0.1,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                4: { cellWidth: 25, halign: 'center' }
            },
            didDrawCell: (data: any) => { // Added 'any' typing to data to prevent strict TS errors from the dynamic import
                // Draw square checkbox for product rows
                if (data.column.index === 0 && data.cell.section === 'body' && data.cell.raw === "") {
                    const size = 3.5;
                    const x = data.cell.x + (data.cell.width / 2) - (size / 2);
                    const y = data.cell.y + (data.cell.height / 2) - (size / 2);
                    doc.setLineWidth(0.2).setDrawColor(0).rect(x, y, size, size);
                }
            },
            didDrawPage: (data: any) => {
                doc.setFontSize(7).setTextColor(161, 161, 170);
                doc.text(`Batch: ${batchNo} | Page ${data.pageNumber}`, 14, doc.internal.pageSize.height - 8);
            }
        });

        // --- 4. FOOTER SIGNATURES ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        if (finalY > 275) doc.addPage();

        doc.setDrawColor(228, 228, 231);
        doc.line(14, finalY + 8, 70, finalY + 8);
        doc.setFontSize(6).setTextColor(113, 113, 122).text("PICKER CONFIRMATION", 14, finalY + 11);
        doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(24, 24, 27).text(pickerName, 14, finalY + 6);

        doc.line(130, finalY + 8, 186, finalY + 8);
        doc.text("VERIFICATION OFFICER", 130, finalY + 11);
    });

    doc.save(`PICKLIST_${batchNo}.pdf`);
};