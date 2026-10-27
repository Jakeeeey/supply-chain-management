import jsPDF from "jspdf";
import autoTable, { type Styles } from "jspdf-autotable";
import type { GroupedPhysicalInventoryChildRow, GroupedPhysicalInventoryRow, MockLedgerHeaderRow } from "../types";

export type GenerateAuditReportPdfArgs = {
    header: MockLedgerHeaderRow;
    groupedRows: GroupedPhysicalInventoryRow[];
    branchName: string;
    supplierName: string;
    priceTypeName: string;
};

function fmtNumber(value: number): string {
    return value.toLocaleString("en-PH", {
        maximumFractionDigits: 0,
    });
}

export function generateAuditReportPdf(args: GenerateAuditReportPdfArgs): jsPDF {
    const { header, groupedRows, branchName, supplierName, priceTypeName } = args;

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    // 1. Title Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MOCK LEDGER AUDIT REPORT", 105, 18, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(header.ph_no || `ML #${header.id}`, 105, 24, { align: "center" });

    // 2. Metadata Table
    const metaBody = [
        [
            { content: "Branch:", styles: { fontStyle: "bold" as const, fillColor: [240, 240, 240] as [number, number, number] } },
            branchName,
            { content: "Stock Type:", styles: { fontStyle: "bold" as const, fillColor: [240, 240, 240] as [number, number, number] } },
            header.stock_type || "GOOD",
        ],
        [
            { content: "Supplier:", styles: { fontStyle: "bold" as const, fillColor: [240, 240, 240] as [number, number, number] } },
            supplierName,
            { content: "Price Type:", styles: { fontStyle: "bold" as const, fillColor: [240, 240, 240] as [number, number, number] } },
            priceTypeName,
        ]
    ];

    autoTable(doc, {
        startY: 28,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 65 },
            2: { cellWidth: 25 },
            3: { cellWidth: 67 }
        },
        body: metaBody,
    });

    let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    let totalBoxesPhysical = 0;
    for (const row of groupedRows) {
        const boxUnit = row.rows.find(c => {
            const n = (c.unit_name || "").toUpperCase();
            const s = (c.unit_shortcut || "").toUpperCase();
            return ["BOX", "CASE"].some(k => n.includes(k) || s.includes(k));
        });
        if (boxUnit) {
            totalBoxesPhysical += (boxUnit.physical_count || 0);
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Boxes: ${fmtNumber(totalBoxesPhysical)}`, 14, currentY + 2);
    
    currentY += 8;

    // 3. Group products by brand_name
    const brandMap = new Map<string, GroupedPhysicalInventoryRow[]>();
    for (const row of groupedRows) {
        const brand = row.brand_name || "UNBRANDED";
        const bucket = brandMap.get(brand) ?? [];
        bucket.push(row);
        brandMap.set(brand, bucket);
    }

    const sortedBrands = Array.from(brandMap.keys()).sort((a, b) => a.localeCompare(b));

    const findUnit = (childRows: GroupedPhysicalInventoryChildRow[], keywords: string[], countOne?: boolean) => {
        return childRows.find(c => {
            const n = (c.unit_name || "").toUpperCase();
            const s = (c.unit_shortcut || "").toUpperCase();
            const matchesKeyword = keywords.some(k => n.includes(k) || s.includes(k));
            if (countOne && c.unit_count === 1) return true;
            return matchesKeyword;
        });
    };

    for (const brand of sortedBrands) {
        const rows = brandMap.get(brand) || [];

        // Check page overflow before drawing brand section
        if (currentY > 260) {
            doc.addPage();
            currentY = 15;
        }

        // Draw brand section header
        doc.setFillColor(34, 34, 34);
        doc.rect(14, currentY, 182, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(brand.toUpperCase(), 18, currentY + 4.5);
        currentY += 6;

        // Scan rows in this brand to see which UOM columns are needed
        let hasBox = false;
        let hasPack = false;
        let hasTie = false;
        let hasPiece = false;

        const processedRows = rows.map(row => {
            const boxUnit = findUnit(row.rows, ["BOX", "CASE"]);
            const packUnit = findUnit(row.rows, ["PACK", "IB", "INNER"]);
            const tieUnit = findUnit(row.rows, ["TIE"]);
            const pieceUnit = findUnit(row.rows, ["PIECE", "UNIT", "PCS"], true);

            if (boxUnit) hasBox = true;
            if (packUnit) hasPack = true;
            if (tieUnit) hasTie = true;
            if (pieceUnit) hasPiece = true;

            return { ...row, boxUnit, packUnit, tieUnit, pieceUnit };
        });

        // Build Table Headers
        const headers = ["DESCRIPTION", "SYSTEM"];
        if (hasBox) headers.push("BOX");
        if (hasPack) headers.push("PACK");
        if (hasTie) headers.push("TIE");
        if (hasPiece) headers.push("PIECES");

        // Build Table Body
        const tableBody = processedRows.map(row => {
            const systemDisplay = row.rows
                .filter(child => child.system_count !== 0)
                .map(child => {
                    const countStr = fmtNumber(child.system_count);
                    const unitStr = child.unit_shortcut || child.unit_name || "PCS";
                    return `${countStr} ${unitStr}`;
                })
                .join("\n") || "0";

            const rowData: (string | { content: string; styles: { halign: "center" | "right" | "left"; textColor?: [number, number, number] } })[] = [row.base_product_name, systemDisplay];

            const formatCell = (unit: GroupedPhysicalInventoryChildRow | undefined) => {
                if (!unit) return { content: "-", styles: { halign: "center" as const, textColor: [180, 180, 180] as [number, number, number] } };
                if (unit.physical_count == null) return { content: "", styles: { halign: "right" as const } };
                return { content: fmtNumber(unit.physical_count), styles: { halign: "right" as const } };
            };

            if (hasBox) rowData.push(formatCell(row.boxUnit));
            if (hasPack) rowData.push(formatCell(row.packUnit));
            if (hasTie) rowData.push(formatCell(row.tieUnit));
            if (hasPiece) rowData.push(formatCell(row.pieceUnit));

            return rowData;
        });

        // Determine column widths
        const activeUomCount = (hasBox ? 1 : 0) + (hasPack ? 1 : 0) + (hasTie ? 1 : 0) + (hasPiece ? 1 : 0);
        const remainingWidth = 182 - 70 - 25; // 182 total printable width minus Description and System
        const uomWidth = activeUomCount > 0 ? remainingWidth / activeUomCount : 0;

        const colStyles: { [key: string]: Partial<Styles> } = {
            "0": { cellWidth: 70, fontStyle: "bold" as const },
            "1": { cellWidth: 25, halign: "right" as const }
        };

        let colIdx = 2;
        if (hasBox) { colStyles[String(colIdx)] = { cellWidth: uomWidth }; colIdx++; }
        if (hasPack) { colStyles[String(colIdx)] = { cellWidth: uomWidth }; colIdx++; }
        if (hasTie) { colStyles[String(colIdx)] = { cellWidth: uomWidth }; colIdx++; }
        if (hasPiece) { colStyles[String(colIdx)] = { cellWidth: uomWidth }; colIdx++; }

        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
            rowPageBreak: "avoid",
            head: [headers],
            body: tableBody,
            columnStyles: colStyles,
            didDrawCell: (data) => {
                // Draw little UOM watermark label in top-right of blank input cells
                if (data.row.section === "body" && data.column.index >= 2) {
                    const colHeader = headers[data.column.index];
                    const label = colHeader === "PIECES" ? "PCS" : colHeader === "PACK" ? "PCK" : colHeader;
                    
                    const isCellEmpty = (data.cell.raw as { content?: string })?.content === "";
                    if (isCellEmpty) {
                        const cellX = data.cell.x;
                        const cellY = data.cell.y;
                        const cellW = data.cell.width;
                        
                        doc.setFontSize(6);
                        doc.setFont("helvetica", "italic");
                        doc.setTextColor(150, 150, 150);
                        doc.text(label.toLowerCase(), cellX + cellW - 5, cellY + 2.5);
                    }
                }
            }
        });

        currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    }

    // 4. Sign-off Footer
    if (currentY > 240) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);

    const footerYLine = currentY + 15;
    const footerYText = currentY + 20;

    // Counted By
    doc.text("Counted By:", 14, currentY + 5);
    doc.line(14, footerYLine, 64, footerYLine);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature over Printed Name", 14, footerYText);

    // Verified By
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Verified By:", 80, currentY + 5);
    doc.line(80, footerYLine, 130, footerYLine);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature over Printed Name", 80, footerYText);

    // Posted By
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Posted By:", 146, currentY + 5);
    doc.line(146, footerYLine, 196, footerYLine);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature over Printed Name", 146, footerYText);

    return doc;
}
