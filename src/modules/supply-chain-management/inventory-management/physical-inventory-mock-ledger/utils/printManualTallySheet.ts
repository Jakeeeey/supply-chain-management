import type { GroupedPhysicalInventoryRow, MockLedgerHeaderRow } from "../types";

export type PrintManualTallySheetArgs = {
    header: MockLedgerHeaderRow;
    groupedRows: GroupedPhysicalInventoryRow[];
    branchName: string;
    supplierName: string;
    warehousemanName?: string;
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

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

export function printManualTallySheet(args: PrintManualTallySheetArgs): void {
    const { header, groupedRows, branchName, supplierName, warehousemanName } = args;

    // Calculate max length of Category name (in characters)
    let maxCategoryChars = 8; // length of "Category"
    for (const group of groupedRows) {
        const catText = group.category_name ?? "";
        if (catText.length > maxCategoryChars) {
            maxCategoryChars = catText.length;
        }
    }
    // Assume roughly 0.75% width per character (7.5pt/Arial style)
    const categoryPct = Math.max(6, maxCategoryChars * 0.75);

    // Calculate max length of Unit (in characters)
    const maxUnitChars = Math.max(4, "Pieces".length); // "Pieces" is 6 characters
    const unitPct = Math.max(5, maxUnitChars * 0.75);

    // Remaining layout percentages (Phys Qty and TOTAL removed, 12 tally columns)
    const tallyColsPct = 61.2; // 5.1% each (12 columns)

    const descriptionPct = Math.max(20, 100 - categoryPct - unitPct - tallyColsPct);

    let tableRowsHtml = "";

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
        const categoryCell = escapeHtml(group.category_name || "");
        const descCell = escapeHtml(group.base_product_name || "");

        tableRowsHtml += `
            <tr>
                <td class="category-cell" rowspan="2">${categoryCell}</td>
                <td class="desc-cell" rowspan="2">${descCell}</td>
                <td class="unit-cell">Box</td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
            </tr>
            <tr>
                <td class="unit-cell">Pieces</td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
                <td class="tally-cell"></td>
            </tr>
        `;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Mock Ledger Manual Tally Sheet</title>
    <style>
        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #000;
        }

        body {
            padding: 8px;
        }

        .header-subtitle {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 15px;
            text-transform: uppercase;
            text-decoration: underline;
        }

        .meta-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-bottom: 15px;
            font-size: 10px;
        }

        .meta-field {
            white-space: nowrap;
        }

        .meta-field strong {
            font-weight: bold;
            margin-right: 4px;
        }

        table.tally-table {
            width: 100%;
            border-collapse: collapse;
        }

        table.tally-table th {
            background-color: #e0e0e0;
            border: 1px solid #666;
            padding: 4px 6px;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
        }

        table.tally-table td {
            border: 1px solid #666;
            padding: 1px 4px;
            vertical-align: middle;
            height: 11px;
        }

        .category-cell {
            width: ${categoryPct}%;
            white-space: nowrap;
            font-size: 9px;
        }

        .desc-cell {
            width: ${descriptionPct}%;
            font-weight: normal;
        }

        .unit-cell {
            width: ${unitPct}%;
            text-align: left;
        }

        .tally-cell {
            width: 5.1%;
        }

        .total-cell {
            width: 7%;
            background-color: #fafafa;
        }

        .slash-header {
            position: relative;
            width: 5.1%;
            padding: 0 !important;
            height: 25px;
        }

        .slash-header::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to top right, transparent calc(50% - 0.5px), #666, transparent calc(50% + 0.5px));
            pointer-events: none;
        }

        tr.print-header-row th {
            background-color: transparent !important;
            border: none !important;
            padding: 0 0 10px 0 !important;
        }

        .page-number-value::after {
            content: counter(page);
        }

        @media print {
            @page {
                size: 13in 8.5in;
                margin: 10mm;
            }
            body {
                padding: 5px;
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
    <table class="tally-table">
        <thead>
            <!-- Repeating header metadata row inside thead so browser prints it on every page -->
            <tr class="print-header-row">
                <th colspan="15">
                    <div class="header-subtitle">MOCK LEDGER - MANUAL TALLY SHEET</div>
                    <div class="meta-container">
                        <div class="meta-field"><strong>Control No:</strong> <span>${escapeHtml(header.ph_no || "")}</span></div>
                        <div class="meta-field"><strong>Branch:</strong> <span>${escapeHtml(branchName)}</span></div>
                        <div class="meta-field"><strong>Supplier:</strong> <span>${escapeHtml(supplierName)}</span></div>
                        <div class="meta-field"><strong>Warehouseman:</strong> <span>${escapeHtml(warehousemanName || "")}</span></div>
                        <div class="meta-field"><strong>Cut-off Date:</strong> <span>${formatDateString(header.cutOff_date)}</span></div>
                        <div class="meta-field"><strong>Page:</strong> <span class="page-number-value"></span></div>
                    </div>
                </th>
            </tr>
            <!-- Main column headers -->
            <tr>
                <th style="width: ${categoryPct}%;">Category</th>
                <th style="width: ${descriptionPct}%;">Description</th>
                <th style="width: ${unitPct}%;">Unit</th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
                <th class="slash-header"></th>
            </tr>
        </thead>
        <tbody>
            ${tableRowsHtml}
        </tbody>
    </table>
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
