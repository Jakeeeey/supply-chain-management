import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
}

export const generatePickerPDF = (groupedManifest: Record<string, PickerItem[]>, batchNo: string) => {
    const doc = new jsPDF();

    Object.entries(groupedManifest).forEach(([rawPickerName, items], index) => {
        const isUnassigned = !rawPickerName ||
            rawPickerName.toLowerCase().includes("null") ||
            rawPickerName.includes("GENERAL");
        const pickerName = isUnassigned ? "GENERAL / UNASSIGNED" : rawPickerName;

        if (index > 0) doc.addPage();

        // --- 1. MINIMALIST INK-SAVING HEADER ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14).setFont("helvetica", "bold").text("PICK LIST", 12, 10);
        doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(80, 80, 80);
        doc.text(`BTCH: ${batchNo} | ${new Date().toLocaleDateString()}`, 12, 14);

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.roundedRect(140, 4, 60, 11, 1, 1, 'S');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(6).text("ASSIGNED PICKER", 143, 8);
        doc.setFontSize(8).setFont("helvetica", "bold").text(pickerName.toUpperCase(), 143, 12.5);

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
                { content: mainHeader, colSpan: 5, styles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 3, bottom: 1, left: 1, right: 1 } } }
            ]);

            Object.entries(categories).forEach(([catName, catItems]: [string, any]) => {
                tableRows.push([
                    { content: `   CAT: ${catName}`, colSpan: 5, styles: { fillColor: false, textColor: [50, 50, 50], fontStyle: 'italic', fontSize: 6.5, cellPadding: 1 } }
                ]);

                catItems.forEach((item: PickerItem) => {
                    // --- DYNAMIC UNIT STYLING BASED ON `unitOrder` ---
                    let unitStyle = { fontStyle: 'normal', textColor: [0, 0, 0] };

                    // Customize these cases to match your database `order` values!
                    switch (item.unitOrder) {
                        case 1:
                            unitStyle = { fontStyle: 'bold', textColor: [0, 0, 0] }; // e.g., Pieces (High priority)
                            break;
                        case 2:
                            unitStyle = { fontStyle: 'italic', textColor: [80, 80, 80] }; // e.g., Boxes
                            break;
                        case 3:
                            unitStyle = { fontStyle: 'bolditalic', textColor: [50, 50, 50] }; // e.g., Pallets
                            break;
                        default:
                            unitStyle = { fontStyle: 'normal', textColor: [100, 100, 100] }; // Fallback
                            break;
                    }

                    tableRows.push([
                        "", // Checkbox
                        item.productName.toUpperCase(),
                        {
                            content: item.unit || item.unitName || "-",
                            styles: unitStyle // Inject the dynamic style here
                        },
                        item.quantity || item.orderedQuantity,
                        ""
                    ]);
                });
            });
        });

        // --- 3. INK-EFFICIENT TABLE RENDER ---
        autoTable(doc, {
            startY: 18,
            head: [["", "PRODUCT DESCRIPTION", "UNIT", "QTY", "DONE"]],
            body: tableRows,
            theme: "plain",
            headStyles: { textColor: [0, 0, 0], fontStyle: "bold", fontSize: 7, cellPadding: 1, lineWidth: { bottom: 0.2 }, lineColor: [0,0,0] },
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
                3: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
                4: { cellWidth: 15, halign: 'center' }
            },
            // Note: didParseCell is no longer needed for unit styling because we handle it directly in the row data!
            didDrawCell: (data) => {
                if (data.column.index === 0 && data.cell.section === 'body' && data.cell.raw === "") {
                    const size = 3;
                    const x = data.cell.x + (data.cell.width / 2) - (size / 2);
                    const y = data.cell.y + (data.cell.height / 2) - (size / 2);
                    doc.setLineWidth(0.1).setDrawColor(0).rect(x, y, size, size);
                }
            },
            didDrawPage: (data) => {
                doc.setFontSize(6).setTextColor(100, 100, 100);
                doc.text(`Batch: ${batchNo} | Page ${data.pageNumber}`, 14, doc.internal.pageSize.height - 5);
            }
        });

        // --- 4. TIGHT FOOTER SIGNATURES ---
        const finalY = (doc as any).lastAutoTable.finalY + 5;
        if (finalY > 282) doc.addPage();

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(14, finalY + 6, 70, finalY + 6);
        doc.setFontSize(6).setTextColor(50, 50, 50).text("PICKER CONFIRMATION", 14, finalY + 9);
        doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(0, 0, 0).text(pickerName, 14, finalY + 4);

        doc.line(130, finalY + 6, 186, finalY + 6);
        doc.text("VERIFICATION OFFICER", 130, finalY + 9);
    });

    doc.save(`PICKLIST_${batchNo}.pdf`);
};