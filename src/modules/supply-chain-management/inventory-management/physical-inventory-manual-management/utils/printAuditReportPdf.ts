import jsPDF from "jspdf";
import autoTable, { type Styles } from "jspdf-autotable";
import type { GroupedPhysicalInventoryChildRow, GroupedPhysicalInventoryRow, PhysicalInventoryHeaderRow } from "../types";

export type GenerateAuditReportPdfArgs = {
    header: PhysicalInventoryHeaderRow;
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
    doc.text("PHYSICAL INVENTORY AUDIT REPORT", 105, 18, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(header.ph_no || `PI #${header.id}`, 105, 24, { align: "center" });

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
        ],
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
            3: { cellWidth: 65 },
        },
        body: metaBody,
    });

    // Calculate Total Boxes Across All Rows
    let totalBoxes = 0;
    for (const group of groupedRows) {
        for (const child of group.rows) {
            const uName = (child.unit_name || child.unit_shortcut || "").toUpperCase();
            if (uName.includes("BOX") || uName.includes("CASE") || uName.includes("BX")) {
                totalBoxes += child.physical_count || 0;
            }
        }
    }

    let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

    // Total Boxes Label
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Boxes: ${fmtNumber(totalBoxes)}`, 14, currentY);
    currentY += 4;

    // 3. Group by Brand
    const brandMap = new Map<string, GroupedPhysicalInventoryRow[]>();
    for (const row of groupedRows) {
        const brand = row.brand_name || "UNBRANDED";
        const bucket = brandMap.get(brand) ?? [];
        bucket.push(row);
        brandMap.set(brand, bucket);
    }

    const sortedBrands = Array.from(brandMap.keys()).sort((a, b) => a.localeCompare(b));

    const findUomChild = (children: GroupedPhysicalInventoryChildRow[], keywords: string[]) => {
        return children.find((c) => {
            const name = (c.unit_name || c.unit_shortcut || "").toUpperCase();
            return keywords.some((k) => name.includes(k));
        });
    };

    for (const brand of sortedBrands) {
        const brandRows = brandMap.get(brand) || [];

        // Check which UOM columns exist for this brand
        let brandHasBox = false;
        let brandHasPack = false;
        let brandHasTie = false;
        let brandHasPiece = false;

        for (const group of brandRows) {
            for (const child of group.rows) {
                const uName = (child.unit_name || child.unit_shortcut || "").toUpperCase();
                if (uName.includes("BOX") || uName.includes("CASE") || uName.includes("BX")) brandHasBox = true;
                else if (uName.includes("PACK") || uName.includes("PCK") || uName.includes("PK")) brandHasPack = true;
                else if (uName.includes("TIE")) brandHasTie = true;
                else brandHasPiece = true;
            }
        }

        const brandHeaders = ["DESCRIPTION", "SYSTEM"];
        if (brandHasBox) brandHeaders.push("BOX");
        if (brandHasPack) brandHeaders.push("PACK");
        if (brandHasTie) brandHeaders.push("TIE");
        if (brandHasPiece) brandHeaders.push("PIECES");

        const tableBody: Array<Array<{ content: string; styles?: Partial<Styles> }>> = [];

        for (const group of brandRows) {
            // Find base row or highest system count
            let maxSysRow = group.rows[0];
            for (const r of group.rows) {
                if ((r.system_count || 0) > (maxSysRow?.system_count || 0)) {
                    maxSysRow = r;
                }
            }

            const baseUom = (maxSysRow?.unit_shortcut || maxSysRow?.unit_name || "PCS").toUpperCase();
            const sysDisplay = `${fmtNumber(maxSysRow?.system_count || 0)} ${baseUom}`;

            const boxChild = brandHasBox ? findUomChild(group.rows, ["BOX", "CASE", "BX"]) : null;
            const packChild = brandHasPack ? findUomChild(group.rows, ["PACK", "PCK", "PK"]) : null;
            const tieChild = brandHasTie ? findUomChild(group.rows, ["TIE"]) : null;
            const pieceChild = brandHasPiece ? group.rows.find((c) => {
                const u = (c.unit_name || c.unit_shortcut || "").toUpperCase();
                return !u.includes("BOX") && !u.includes("CASE") && !u.includes("BX") &&
                       !u.includes("PACK") && !u.includes("PCK") && !u.includes("PK") &&
                       !u.includes("TIE");
            }) : null;

            const formatPhysicalVal = (child: GroupedPhysicalInventoryChildRow | null | undefined) => {
                if (!child) return "-";
                return fmtNumber(child.physical_count || 0);
            };

            const rowData: Array<{ content: string; styles?: Partial<Styles> }> = [
                {
                    content: group.base_product_name,
                    styles: { halign: "left", fontStyle: "bold" },
                },
                {
                    content: sysDisplay,
                    styles: { halign: "center" },
                },
            ];

            if (brandHasBox) rowData.push({ content: formatPhysicalVal(boxChild), styles: { halign: "center" } });
            if (brandHasPack) rowData.push({ content: formatPhysicalVal(packChild), styles: { halign: "center" } });
            if (brandHasTie) rowData.push({ content: formatPhysicalVal(tieChild), styles: { halign: "center" } });
            if (brandHasPiece) rowData.push({ content: formatPhysicalVal(pieceChild), styles: { halign: "center" } });

            tableBody.push(rowData);
        }

        const dynamicColStyles: Record<number, { cellWidth?: number; halign?: "left" | "center" | "right" }> = {
            0: { halign: "left" },
            1: { cellWidth: 26, halign: "center" },
        };

        const uomCount = brandHeaders.length - 2;
        const uomWidth = uomCount > 0 ? Math.min(22, Math.floor(75 / uomCount)) : 20;

        for (let i = 2; i < brandHeaders.length; i++) {
            dynamicColStyles[i] = { cellWidth: uomWidth, halign: "center" };
        }

        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            head: [
                [
                    {
                        content: brand.toUpperCase(),
                        colSpan: brandHeaders.length,
                        styles: {
                            halign: "left",
                            fillColor: [30, 30, 30],
                            textColor: [255, 255, 255],
                            fontStyle: "bold",
                            fontSize: 9,
                        },
                    },
                ],
                brandHeaders,
            ],
            body: tableBody,
            theme: "grid",
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                fontSize: 8,
                halign: "center",
                lineWidth: 0.1,
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 2,
                overflow: "linebreak",
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
            },
            columnStyles: dynamicColStyles,
            didParseCell: (data) => {
                if (data.section === "body" && data.column.index >= 2) {
                    const colHeader = brandHeaders[data.column.index];
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
            },
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

