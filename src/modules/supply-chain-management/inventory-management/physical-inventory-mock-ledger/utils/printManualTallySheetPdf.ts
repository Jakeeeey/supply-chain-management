import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GroupedPhysicalInventoryRow, MockLedgerHeaderRow } from "../types";

export type GenerateManualTallySheetPdfArgs = {
    header: MockLedgerHeaderRow;
    groupedRows: GroupedPhysicalInventoryRow[];
    branchName: string;
    supplierName: string;
    warehousemanName?: string;
};

function formatDateString(value: string | null | undefined): string {
    if (!value) return "";
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return value;
    }
}

export async function generateManualTallySheetPdf(args: GenerateManualTallySheetPdfArgs): Promise<jsPDF> {
    const { header, groupedRows, branchName, supplierName, warehousemanName } = args;

    // Initialize landscape Government Legal size jsPDF directly (8.5in x 13in = 215.9mm x 330.2mm)
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [215.9, 330.2],
    });

    const pageMargin = 10; // mm
    const pageWidth = doc.internal.pageSize.getWidth(); // 330.2 mm
    const contentWidth = pageWidth - pageMargin * 2;    // 310.2 mm

    // Subtitle position
    const subtitleY = 12;

    // Underline subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const subWidth = doc.getTextWidth("MOCK LEDGER - MANUAL TALLY SHEET");

    // Dynamic Metadata Row Drawing with Mathematically Even Spacing
    const drawHeaderFields = (pageNumber: number, yPos: number) => {
        // 1. Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("MOCK LEDGER - MANUAL TALLY SHEET", pageWidth / 2, subtitleY, { align: "center" });

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(pageWidth / 2 - subWidth / 2, subtitleY + 1, pageWidth / 2 + subWidth / 2, subtitleY + 1);

        // 2. Fields list
        const fields = [
            { label: "Control No: ", value: header.ph_no || "" },
            { label: "Branch: ", value: branchName },
            { label: "Supplier: ", value: supplierName },
            { label: "Warehouseman: ", value: warehousemanName || "" },
            { label: "Cut-off Date: ", value: formatDateString(header.cutOff_date) },
            { label: "Page: ", value: String(pageNumber) }
        ];

        // Measure all fields
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        const measured = fields.map(f => {
            doc.setFont("helvetica", "bold");
            const labelW = doc.getTextWidth(f.label);
            doc.setFont("helvetica", "normal");
            const valueW = doc.getTextWidth(f.value);
            return {
                label: f.label,
                value: f.value,
                labelW,
                valueW,
                totalW: labelW + Math.max(12, valueW) // Min line width for values
            };
        });

        const totalFieldsWidth = measured.reduce((sum, f) => sum + f.totalW, 0);
        const remainingWidth = contentWidth - totalFieldsWidth;
        const gap = remainingWidth / (fields.length - 1); // 5 equal gaps between 6 fields

        let currentX = pageMargin;
        measured.forEach((f, idx) => {
            // Draw label (Bold)
            doc.setFont("helvetica", "bold");
            doc.text(f.label, currentX, yPos);

            // Draw value (Normal)
            doc.setFont("helvetica", "normal");
            doc.text(f.value, currentX + f.labelW, yPos);

            currentX += f.totalW + (idx < fields.length - 1 ? gap : 0);
        });
    };

    // Draw header on Page 1
    drawHeaderFields(1, subtitleY + 7);

    const tableStartY = subtitleY + 11;

    type AutoTableCell = string | { content: string; rowSpan?: number; styles?: { valign: "middle" | "top" | "bottom" } };
    const tableBody: AutoTableCell[][] = [];
    const lastRowIndices = new Set<number>();
    const firstRowIndices = new Set<number>();
    let rowIndex = 0;

    const sortedGroups = [...groupedRows].sort((a, b) => {
        const catA = a.category_name ?? "";
        const catB = b.category_name ?? "";
        const catCompare = catA.localeCompare(catB);
        if (catCompare !== 0) return catCompare;

        const nameA = a.base_product_name ?? "";
        const nameB = b.base_product_name ?? "";
        return nameA.localeCompare(nameB);
    });

    for (const group of sortedGroups) {
        firstRowIndices.add(rowIndex);

        const categoryCell = group.category_name || "";
        const descCell = group.base_product_name || "";

        // Row 1: Box
        tableBody.push([
            { content: categoryCell, rowSpan: 2, styles: { valign: "middle" as const } },
            { content: descCell, rowSpan: 2, styles: { valign: "middle" as const } },
            "Box",
            "", "", "", "", "", "", "", "", "", "", "", "" // 12 tally columns
        ]);
        rowIndex++;

        // Row 2: Pieces
        tableBody.push([
            "Pieces",
            "", "", "", "", "", "", "", "", "", "", "" // 12 tally columns
        ]);
        lastRowIndices.add(rowIndex);
        rowIndex++;
    }

    // Headers (Phys Qty and TOTAL removed, Beginning label removed, 12 columns)
    const headers = [
        "Category", "Description", "Unit",
        "", "", "", "", "", "", "", "", "", "", "", "" // 12 tally columns
    ];

    // Set font style/size for measurement
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);

    // 1. Calculate Category max width (with 2mm padding on each side = 4mm total)
    let maxCategoryWidth = doc.getTextWidth("Category");
    for (const group of sortedGroups) {
        const catText = group.category_name ?? "";
        const w = doc.getTextWidth(catText);
        if (w > maxCategoryWidth) {
            maxCategoryWidth = w;
        }
    }
    const categoryColWidth = Math.max(15, maxCategoryWidth + 4);

    // 2. Calculate Unit max width (with 2mm padding on each side = 4mm total)
    let maxUnitWidth = doc.getTextWidth("Unit");
    const wBox = doc.getTextWidth("Box");
    const wPieces = doc.getTextWidth("Pieces");
    maxUnitWidth = Math.max(maxUnitWidth, wBox, wPieces);
    const unitColWidth = Math.max(12, maxUnitWidth + 4);

    // 3. Allocate remaining width to Description (Tally columns expanded to 17mm each, budget is Government Legal contentWidth, 12 tally columns)
    const totalBudget = contentWidth;
    const tallyColSingleWidth = 17;
    const tallyColsWidth = tallyColSingleWidth * 12;

    const descriptionColWidth = Math.max(
        50,
        totalBudget - categoryColWidth - unitColWidth - tallyColsWidth
    );

    autoTable(doc, {
        startY: tableStartY,
        margin: { top: 25, left: 10, right: 10 },
        theme: "grid",
        styles: {
            fontSize: 7.5,
            cellPadding: [0.5, 2],
            lineColor: [102, 102, 102],
            lineWidth: 0.15,
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
            minCellHeight: 17 // Increased header height
        },
        bodyStyles: {
            minCellHeight: 2.5,
            valign: "middle"
        },
        rowPageBreak: "avoid",
        head: [headers],
        body: tableBody,
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                drawHeaderFields(data.pageNumber, subtitleY + 7);
            }
        },
        columnStyles: {
            0: { cellWidth: categoryColWidth }, // Category (Dynamic)
            1: { cellWidth: descriptionColWidth }, // Description (Dynamic remaining)
            2: { cellWidth: unitColWidth, halign: "left" }, // Unit (Dynamic)
            3: { cellWidth: tallyColSingleWidth },
            4: { cellWidth: tallyColSingleWidth },
            5: { cellWidth: tallyColSingleWidth },
            6: { cellWidth: tallyColSingleWidth },
            7: { cellWidth: tallyColSingleWidth },
            8: { cellWidth: tallyColSingleWidth },
            9: { cellWidth: tallyColSingleWidth },
            10: { cellWidth: tallyColSingleWidth },
            11: { cellWidth: tallyColSingleWidth },
            12: { cellWidth: tallyColSingleWidth },
            13: { cellWidth: tallyColSingleWidth },
            14: { cellWidth: tallyColSingleWidth }
        },
        didDrawCell: (data) => {
            // Diagonal lines removed from tally headers as requested

            // Draw thick, dark bottom border for the table header row
            if (data.row.section === "head") {
                const cellX = data.cell.x;
                const cellY = data.cell.y;
                const cellW = data.cell.width;
                const cellH = data.cell.height;

                doc.setDrawColor(50, 50, 50);
                doc.setLineWidth(0.5);
                doc.line(cellX, cellY + cellH, cellX + cellW, cellY + cellH);
            }

            // Draw thick, dark top border for the first row of each product family
            if (data.row.section === "body" && firstRowIndices.has(data.row.index)) {
                const cellX = data.cell.x;
                const cellY = data.cell.y;
                const cellW = data.cell.width;

                doc.setDrawColor(50, 50, 50);
                doc.setLineWidth(0.5);
                doc.line(cellX, cellY, cellX + cellW, cellY);
            }

            // Draw thick, dark bottom border for the last row of each product family
            if (data.row.section === "body" && lastRowIndices.has(data.row.index)) {
                const cellX = data.cell.x;
                const cellY = data.cell.y;
                const cellW = data.cell.width;
                const cellH = data.cell.height;

                doc.setDrawColor(50, 50, 50);
                doc.setLineWidth(0.5);
                doc.line(cellX, cellY + cellH, cellX + cellW, cellY + cellH);
            }
        }
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // 4. Footer sign-offs (Legal height is 215.9mm, so check overflow > 170mm)
    if (finalY > 175) {
        doc.addPage();
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);

    const labelY = (finalY > 175 ? 20 : finalY) + 4;
    const footerYLine = labelY + 10;
    const footerYText = footerYLine + 4;

    // Divide content width into 3 equal footer sections
    const sectionWidth = contentWidth / 3;
    const col1X = pageMargin;
    const col1EndX = pageMargin + sectionWidth - 5;
    const col2X = pageMargin + sectionWidth;
    const col2EndX = pageMargin + sectionWidth * 2 - 5;
    const col3X = pageMargin + sectionWidth * 2;
    const col3EndX = pageMargin + contentWidth;

    // Counted By
    doc.text("Counted By:", col1X, labelY);
    doc.line(col1X, footerYLine, col1EndX, footerYLine);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature over Printed Name", col1X, footerYText);

    // Verified By
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Verified By:", col2X, labelY);
    doc.line(col2X, footerYLine, col2EndX, footerYLine);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature over Printed Name", col2X, footerYText);

    // Posted By
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Posted By:", col3X, labelY);
    doc.line(col3X, footerYLine, col3EndX, footerYLine);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature over Printed Name", col3X, footerYText);

    return doc;
}
