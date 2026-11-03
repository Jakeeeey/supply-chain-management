import type { GroupedPhysicalInventoryChildRow, GroupedPhysicalInventoryRow, PhysicalInventoryHeaderRow } from "../types";

export type PrintAuditSheetArgs = {
    header: PhysicalInventoryHeaderRow;
    groupedRows: GroupedPhysicalInventoryRow[];
    branchName: string;
    supplierName: string;
    priceTypeName: string;
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fmtNumber(value: number): string {
    return value.toLocaleString("en-PH", {
        maximumFractionDigits: 0,
    });
}

export function printAuditSheet(args: PrintAuditSheetArgs): void {
    const { header, groupedRows, branchName, supplierName, priceTypeName } = args;

    // Group the groupedRows by brand_name
    const brandMap = new Map<string, GroupedPhysicalInventoryRow[]>();
    for (const row of groupedRows) {
        const brand = row.brand_name || "UNBRANDED";
        const bucket = brandMap.get(brand) ?? [];
        bucket.push(row);
        brandMap.set(brand, bucket);
    }

    const sortedBrands = Array.from(brandMap.keys()).sort((a, b) => a.localeCompare(b));

    let tablesHtml = "";

    for (const brand of sortedBrands) {
        const rows = brandMap.get(brand) || [];
        
        // Scan all rows in this brand to see which UOM columns are needed
        let hasBox = false;
        let hasPack = false;
        let hasTie = false;
        let hasPiece = false;

        const findUnit = (childRows: GroupedPhysicalInventoryChildRow[], keywords: string[], countOne?: boolean) => {
            return childRows.find(c => {
                const n = (c.unit_name || "").toUpperCase();
                const s = (c.unit_shortcut || "").toUpperCase();
                const matchesKeyword = keywords.some(k => n.includes(k) || s.includes(k));
                if (countOne && c.unit_count === 1) return true;
                return matchesKeyword;
            });
        };

        const processedRows = rows.map(row => {
            const boxUnit = findUnit(row.rows, ["BOX", "CASE"]);
            const packUnit = findUnit(row.rows, ["PACK", "IB", "INNER"]);
            const tieUnit = findUnit(row.rows, ["TIE"]);
            const pieceUnit = findUnit(row.rows, ["PIECE", "UNIT", "PCS"], true);

            if (boxUnit) hasBox = true;
            if (packUnit) hasPack = true;
            if (tieUnit) hasTie = true;
            if (pieceUnit) hasPiece = true;

            return {
                ...row,
                boxUnit,
                packUnit,
                tieUnit,
                pieceUnit
            };
        });

        const usedColumnCount = (hasBox ? 1 : 0) + (hasPack ? 1 : 0) + (hasTie ? 1 : 0) + (hasPiece ? 1 : 0);
        const inputColWidth = usedColumnCount > 0 ? (56 / usedColumnCount) : 0;

        tablesHtml += `
            <div class="brand-section">
                <div class="brand-header">${escapeHtml(brand)}</div>
                <table>
                    <thead>
                        <tr>
                            <th class="col-description" style="width: 30%">DESCRIPTION</th>
                            <th class="col-system" style="width: 14%">SYSTEM</th>
                            ${hasBox ? `<th style="width: ${inputColWidth}%">BOX</th>` : ""}
                            ${hasPack ? `<th style="width: ${inputColWidth}%">PACK</th>` : ""}
                            ${hasTie ? `<th style="width: ${inputColWidth}%">TIE</th>` : ""}
                            ${hasPiece ? `<th style="width: ${inputColWidth}%">PIECES</th>` : ""}
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const row of processedRows) {
            const systemDisplay = row.rows
                .filter(child => child.system_count !== 0)
                .map(child => {
                    const countStr = fmtNumber(child.system_count);
                    const unitStr = child.unit_shortcut || child.unit_name || "PCS";
                    return `<div class="system-line">${countStr} ${escapeHtml(unitStr)}</div>`;
                })
                .join("") || "0";

            const boxLabel = row.boxUnit ? (row.boxUnit.unit_shortcut || row.boxUnit.unit_name || "Box") : "";
            const packLabel = row.packUnit ? (row.packUnit.unit_shortcut || row.packUnit.unit_name || "Pack") : "";
            const tieLabel = row.tieUnit ? (row.tieUnit.unit_shortcut || row.tieUnit.unit_name || "Tie") : "";
            const pieceLabel = row.pieceUnit ? (row.pieceUnit.unit_shortcut || row.pieceUnit.unit_name || "Pieces") : "";

            tablesHtml += `
                <tr>
                    <td class="description-cell">${escapeHtml(row.base_product_name)}</td>
                    <td class="system-cell">${systemDisplay}</td>
                    ${hasBox ? `<td class="input-cell">${boxLabel ? `<span class="input-label">${escapeHtml(boxLabel)}</span>` : ""}</td>` : ""}
                    ${hasPack ? `<td class="input-cell">${packLabel ? `<span class="input-label">${escapeHtml(packLabel)}</span>` : ""}</td>` : ""}
                    ${hasTie ? `<td class="input-cell">${tieLabel ? `<span class="input-label">${escapeHtml(tieLabel)}</span>` : ""}</td>` : ""}
                    ${hasPiece ? `<td class="input-cell">${pieceLabel ? `<span class="input-label">${escapeHtml(pieceLabel)}</span>` : ""}</td>` : ""}
                </tr>
            `;
        }

        tablesHtml += `
                    </tbody>
                </table>
            </div>
        `;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Physical Inventory Audit Sheet</title>
    <style>
        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #000;
        }

        body {
            padding: 20px;
        }

        .header-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 2px;
            text-transform: uppercase;
        }

        .header-subtitle {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .meta-table td {
            border: 1px solid #ccc;
            padding: 4px 8px;
        }

        .meta-label {
            font-weight: bold;
            background-color: #f0f0f0;
            width: 100px;
        }

        .brand-section {
            margin-bottom: 20px;
            break-inside: avoid;
        }

        .brand-header {
            background-color: #222;
            color: #fff;
            padding: 4px 10px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background-color: #e0e0e0;
            border: 1px solid #999;
            padding: 6px 4px;
            font-size: 10px;
            text-align: center;
        }

        td {
            border: 1px solid #999;
            padding: 6px 8px;
            vertical-align: top;
        }

        .col-description { width: 30%; }
        .col-system { width: 14%; text-align: right; }
        .col-box { width: 14%; }
        .col-pack { width: 14%; }
        .col-tie { width: 14%; }
        .col-piece { width: 14%; }

        .description-cell {
            font-weight: bold;
        }

        .system-cell {
            text-align: right;
            font-weight: normal;
        }

        .system-line {
            white-space: nowrap;
        }

        .input-cell {
            position: relative;
            height: 40px;
        }

        .input-label {
            position: absolute;
            right: 4px;
            top: 2px;
            font-size: 8px;
            color: #888;
            font-style: italic;
        }

        .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            gap: 20px;
        }

        .sign-off {
            flex: 1;
        }

        .sign-off-label {
            font-size: 11px;
            margin-bottom: 30px;
        }

        .sign-off-line {
            border-top: 1px solid #000;
            width: 100%;
        }

        @media print {
            body {
                padding: 10px;
            }
            .brand-section {
                break-inside: auto;
            }
            tr {
                break-inside: avoid;
            }
            thead {
                display: table-header-group;
            }
        }
    </style>
</head>
<body>
    <div class="header-title">PHYSICAL INVENTORY AUDIT SHEET</div>
    <div class="header-subtitle">${escapeHtml(header.ph_no || `PH #${header.id}`)}</div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Branch:</td>
            <td style="width: 40%">${escapeHtml(branchName)}</td>
            <td class="meta-label">Stock Type:</td>
            <td>${escapeHtml(header.stock_type || "GOOD")}</td>
        </tr>
        <tr>
            <td class="meta-label">Supplier:</td>
            <td>${escapeHtml(supplierName)}</td>
            <td class="meta-label">Price Type:</td>
            <td>${escapeHtml(priceTypeName)}</td>
        </tr>
    </table>

    ${tablesHtml}

    <div class="footer">
        <div class="sign-off">
            <div class="sign-off-label">Counted By:</div>
            <div class="sign-off-line"></div>
        </div>
        <div class="sign-off">
            <div class="sign-off-label">Verified By:</div>
            <div class="sign-off-line"></div>
        </div>
        <div class="sign-off">
            <div class="sign-off-label">Posted By:</div>
            <div class="sign-off-line"></div>
        </div>
    </div>

</body>
</html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
        throw new Error("Unable to open print window. Please allow pop-ups for this site.");
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 400);
}
