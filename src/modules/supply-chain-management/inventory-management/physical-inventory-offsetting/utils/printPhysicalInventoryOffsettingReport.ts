import type { PhysicalInventoryHeaderRow } from "../../physical-inventory-management/types";
import type {
    OffsettingSelectableRow,
    PhysicalInventoryOffsetGroup,
    PhysicalInventoryOffsettingReportMeta,
} from "../types";

type PrintArgs = {
    header: PhysicalInventoryHeaderRow;
    reportMeta: PhysicalInventoryOffsettingReportMeta;
    allShortRows: OffsettingSelectableRow[];
    allOverRows: OffsettingSelectableRow[];
    unresolvedShortRows: OffsettingSelectableRow[];
    unresolvedOverRows: OffsettingSelectableRow[];
    offsetGroups: PhysicalInventoryOffsetGroup[];
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fmtMoney(value: number): string {
    return value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtNumber(value: number): string {
    return value.toLocaleString("en-PH", {
        maximumFractionDigits: 0,
    });
}

function fmtDate(value: string | null): string {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
    });
}

function sumRowAmounts(rows: OffsettingSelectableRow[]): number {
    return rows.reduce((acc, row) => acc + row.selection_amount, 0);
}

function moneyCell(value: number, variant: "default" | "offset" = "default"): string {
    if (variant === "offset") {
        return `
            <span class="money money-offset">
                ₱ ${fmtMoney(value)}
            </span>
        `;
    }

    return `
        <span class="money money-default">₱ ${fmtMoney(value)}</span>
    `;
}

function renderFindingsRows(rows: OffsettingSelectableRow[]): string {
    if (!rows.length) {
        return `
            <tr>
                <td colspan="5" class="empty-cell">No records found.</td>
            </tr>
        `;
    }

    return rows
        .map((row) => {
            const varianceValue = Math.abs(row.variance_base ?? row.variance ?? 0);
            const diffCost = Math.abs(row.difference_cost ?? 0);

            return `
                <tr>
                    <td class="findings-product-cell">
                        <div class="wrap-text">
                            ${escapeHtml(row.product_label)}
                        </div>
                    </td>
                    <td>${escapeHtml(String(row.detail_id || row.product_id))}</td>
                    <td class="text-right number">${fmtNumber(varianceValue)}</td>
                    <td class="text-right">${moneyCell(diffCost, "default")}</td>
                    <td class="text-right">${moneyCell(row.selection_amount, "default")}</td>
                </tr>
            `;
        })
        .join("");
}

function renderOffsetGroups(groups: PhysicalInventoryOffsetGroup[]): string {
    if (!groups.length) {
        return `
            <tr>
                <td colspan="6" class="empty-cell">No offset groups created.</td>
            </tr>
        `;
    }

    return groups
        .map((group, index) => {
            const shortLabels = group.short_rows
                .map(
                    (row) => `
                        <div class="truncate" title="${escapeHtml(row.product_label)}">
                            ${escapeHtml(row.product_label)}
                        </div>
                    `,
                )
                .join("");

            const overLabels = group.over_rows
                .map(
                    (row) => `
                        <div class="truncate" title="${escapeHtml(row.product_label)}">
                            ${escapeHtml(row.product_label)}
                        </div>
                    `,
                )
                .join("");

            return `
                <tr>
                    <td class="offset-col">
                        <div class="group-title">Offset ${index + 1}</div>
                        <div class="group-date">${fmtDate(group.created_at)}</div>
                    </td>
                    <td class="offset-rows-cell">${shortLabels}</td>
                    <td class="offset-rows-cell">${overLabels}</td>
                    <td class="text-right">${moneyCell(group.short_total, "offset")}</td>
                    <td class="text-right">${moneyCell(group.over_total, "offset")}</td>
                    <td class="text-right">${moneyCell(group.difference, "offset")}</td>
                </tr>
            `;
        })
        .join("");
}

export function printPhysicalInventoryOffsettingReport(args: PrintArgs): void {
    const {
        header,
        reportMeta,
        allShortRows,
        allOverRows,
        unresolvedShortRows,
        unresolvedOverRows,
        offsetGroups,
    } = args;

    const totalShortAmount = sumRowAmounts(allShortRows);
    const totalOverAmount = sumRowAmounts(allOverRows);
    const unresolvedShortAmount = sumRowAmounts(unresolvedShortRows);
    const unresolvedOverAmount = sumRowAmounts(unresolvedOverRows);

    const groupedShortAmount = offsetGroups.reduce((acc, group) => acc + group.short_total, 0);
    const groupedOverAmount = offsetGroups.reduce((acc, group) => acc + group.over_total, 0);
    const netUnresolvedAmount = unresolvedShortAmount - unresolvedOverAmount;

    const findingsNarrative = [
        `The reconciliation identified ${allShortRows.length} shortage row${allShortRows.length === 1 ? "" : "s"} with a total exposure of ₱ ${fmtMoney(totalShortAmount)}.`,
        `The reconciliation identified ${allOverRows.length} overage row${allOverRows.length === 1 ? "" : "s"} with a total value of ₱ ${fmtMoney(totalOverAmount)}.`,
        `A total of ${offsetGroups.length} manual offset group${offsetGroups.length === 1 ? "" : "s"} were created during review.`,
        `Remaining unresolved short findings total ₱ ${fmtMoney(unresolvedShortAmount)}, while unresolved over findings total ₱ ${fmtMoney(unresolvedOverAmount)}.`,
        `The current net unresolved variance is ₱ ${fmtMoney(netUnresolvedAmount)} and remains subject to further warehouse validation where applicable.`,
    ];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Physical Inventory Reconciliation Report</title>
    <style>
        :root {
            --border: #d4d4d8;
            --muted: #6b7280;
            --text: #111827;
            --bg-soft: #f8fafc;
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            color: var(--text);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            line-height: 1.45;
            background: #ffffff;
        }

        body {
            padding: 24px 28px 32px;
        }

        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }

        .company-block h1 {
            margin: 0;
            font-size: 20px;
            line-height: 1.2;
        }

        .company-block p {
            margin: 4px 0 0;
            color: var(--muted);
            font-size: 11px;
        }

        .report-meta {
            text-align: right;
            min-width: 240px;
        }

        .report-meta h2 {
            margin: 0;
            font-size: 18px;
            line-height: 1.2;
        }

        .report-meta p {
            margin: 4px 0 0;
            color: var(--muted);
        }

        .section {
            margin-top: 16px;
        }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            margin: 0 0 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--border);
        }

        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 6px;
        }

        .detail-line {
            display: flex;
            gap: 8px;
            padding: 3px 0;
            border-bottom: 1px dotted #e5e7eb;
        }

        .detail-label {
            width: 110px;
            flex: 0 0 110px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--muted);
        }

        .detail-value {
            flex: 1;
            font-weight: 600;
            word-break: break-word;
        }

        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }

        .summary-table td {
            border: 1px solid var(--border);
            padding: 8px 10px;
            vertical-align: top;
        }

        .summary-label {
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--muted);
            margin-bottom: 3px;
        }

        .summary-value {
            font-size: 13px;
            font-weight: 700;
        }

        .findings-box {
            border: 1px solid var(--border);
            background: var(--bg-soft);
            padding: 10px 12px;
        }

        .findings-box ol {
            margin: 0;
            padding-left: 18px;
        }

        .findings-box li + li {
            margin-top: 6px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            border: 1px solid var(--border);
            padding: 7px 8px;
            vertical-align: top;
        }

        th {
            background: #f4f4f5;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .findings-table {
            table-layout: auto;
        }

        .offset-table {
            table-layout: fixed;
        }

.text-right {
    text-align: right;
    white-space: nowrap;
}

.number {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.money {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.money-default {
    display: inline-block;
    text-align: right;
}

.money-offset {
    display: inline-block;
    min-width: 96px;
    text-align: right;
}

.offset-table td.text-right,
.offset-table th.text-right {
    text-align: right;
    padding-right: 10px;
    white-space: nowrap;
}
     

        .wrap-text {
            white-space: normal;
            word-break: break-word;
            line-height: 1.35;
        }

        .truncate {
            display: block;
            width: 100%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            line-height: 1.35;
        }

        .findings-product-cell {
            min-width: 320px;
        }

        .offset-col {
            width: 13%;
        }

        .offset-rows-cell {
            width: 100%;
            overflow: hidden;
        }

        .offset-table td.text-right,
        .offset-table th.text-right {
            padding-right: 10px;
        }

        .empty-cell {
            text-align: center;
            color: var(--muted);
            padding: 14px;
        }

        .group-title {
            font-weight: 700;
        }

        .group-date {
            color: var(--muted);
            font-size: 10px;
            margin-top: 2px;
        }

        .signoff-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
            margin-top: 28px;
        }

        .signoff-box {
            text-align: center;
            padding-top: 28px;
        }

        .signoff-line {
            border-top: 1px solid #111827;
            padding-top: 6px;
            font-weight: 700;
        }

        .signoff-role {
            color: var(--muted);
            font-size: 11px;
            margin-top: 2px;
        }

        .w-id { width: 10%; }
        .w-var { width: 11%; }
        .w-diff { width: 15%; }
        .w-amount { width: 16%; }

        .w-offset { width: 13%; }
        .w-shortrows { width: 18%; }
        .w-overrows { width: 18%; }
        .w-shorttotal { width: 16%; }
        .w-overtotal { width: 16%; }
        .w-difference { width: 15%; }

        @media print {
            body {
                padding: 16px 18px 20px;
            }

            .section,
            .details-grid,
            .summary-table {
                break-inside: avoid;
            }

            table {
                break-inside: auto;
            }

            tr {
                break-inside: avoid;
                break-after: auto;
            }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <div class="company-block">
            <h1>Physical Inventory Reconciliation Report</h1>
            <p>Supply Chain Management • Physical Inventory Offsetting Summary</p>
        </div>

        <div class="report-meta">
            <h2>${escapeHtml(header.ph_no || `PI #${header.id}`)}</h2>
            <p>Printed: ${fmtDate(new Date().toISOString())}</p>
        </div>
    </div>

    <div class="section">
        <h3 class="section-title">Physical Inventory Details</h3>
        <div class="details-grid">
            <div>
                <div class="detail-line">
                    <div class="detail-label">Branch</div>
                    <div class="detail-value">${escapeHtml(reportMeta.branch_name || String(header.branch_id ?? "-"))}</div>
                </div>
                <div class="detail-line">
                    <div class="detail-label">Supplier</div>
                    <div class="detail-value">${escapeHtml(reportMeta.supplier_name || String(header.supplier_id ?? "-"))}</div>
                </div>
                <div class="detail-line">
                    <div class="detail-label">Category</div>
                    <div class="detail-value">${escapeHtml(reportMeta.category_name || String(header.category_id ?? "-"))}</div>
                </div>
                <div class="detail-line">
                    <div class="detail-label">Stock Type</div>
                    <div class="detail-value">${escapeHtml(header.stock_type || "-")}</div>
                </div>
            </div>

            <div>
                <div class="detail-line">
                    <div class="detail-label">Start Date</div>
                    <div class="detail-value">${escapeHtml(fmtDate(header.starting_date))}</div>
                </div>
                <div class="detail-line">
                    <div class="detail-label">Cut Off Date</div>
                    <div class="detail-value">${escapeHtml(fmtDate(header.cutOff_date))}</div>
                </div>
                <div class="detail-line">
                    <div class="detail-label">Remarks</div>
                    <div class="detail-value">${escapeHtml(header.remarks || "-")}</div>
                </div>
                <div class="detail-line">
                    <div class="detail-label">Record ID</div>
                    <div class="detail-value">${escapeHtml(String(header.id))}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h3 class="section-title">Executive Summary</h3>
        <table class="summary-table">
            <tr>
                <td>
                    <span class="summary-label">Total Short</span>
                    <span class="summary-value">₱ ${fmtMoney(totalShortAmount)}</span>
                </td>
                <td>
                    <span class="summary-label">Total Over</span>
                    <span class="summary-value">₱ ${fmtMoney(totalOverAmount)}</span>
                </td>
                <td>
                    <span class="summary-label">Offset Groups</span>
                    <span class="summary-value">${offsetGroups.length}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="summary-label">Grouped Short</span>
                    <span class="summary-value">₱ ${fmtMoney(groupedShortAmount)}</span>
                </td>
                <td>
                    <span class="summary-label">Grouped Over</span>
                    <span class="summary-value">₱ ${fmtMoney(groupedOverAmount)}</span>
                </td>
                <td>
                    <span class="summary-label">Net Unresolved</span>
                    <span class="summary-value">₱ ${fmtMoney(netUnresolvedAmount)}</span>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h3 class="section-title">Findings Summary</h3>
        <div class="findings-box">
            <ol>
                ${findingsNarrative.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
            </ol>
        </div>
    </div>

    <div class="section">
        <h3 class="section-title">Short Findings</h3>
        <table class="findings-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th class="w-id">Detail ID</th>
                    <th class="w-var text-right">Variance</th>
                    <th class="w-diff text-right">Diff Cost</th>
                    <th class="w-amount text-right">Short Amount</th>
                </tr>
            </thead>
            <tbody>
                ${renderFindingsRows(allShortRows)}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3 class="section-title">Over Findings</h3>
        <table class="findings-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th class="w-id">Detail ID</th>
                    <th class="w-var text-right">Variance</th>
                    <th class="w-diff text-right">Diff Cost</th>
                    <th class="w-amount text-right">Over Amount</th>
                </tr>
            </thead>
            <tbody>
                ${renderFindingsRows(allOverRows)}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3 class="section-title">Manual Offsetting Summary</h3>
        <table class="offset-table">
            <thead>
                <tr>
                    <th class="w-offset">Offset</th>
                    <th class="w-shortrows">Short Rows</th>
                    <th class="w-overrows">Over Rows</th>
                    <th class="w-shorttotal text-right">Short Total</th>
                    <th class="w-overtotal text-right">Over Total</th>
                    <th class="w-difference text-right">Difference</th>
                </tr>
            </thead>
            <tbody>
                ${renderOffsetGroups(offsetGroups)}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3 class="section-title">Remaining Unresolved Findings</h3>
        <table class="summary-table">
            <tr>
                <td>
                    <span class="summary-label">Unresolved Short</span>
                    <span class="summary-value">₱ ${fmtMoney(unresolvedShortAmount)}</span>
                </td>
                <td>
                    <span class="summary-label">Unresolved Over</span>
                    <span class="summary-value">₱ ${fmtMoney(unresolvedOverAmount)}</span>
                </td>
                <td>
                    <span class="summary-label">Open Short Rows</span>
                    <span class="summary-value">${unresolvedShortRows.length}</span>
                </td>
                <td>
                    <span class="summary-label">Open Over Rows</span>
                    <span class="summary-value">${unresolvedOverRows.length}</span>
                </td>
            </tr>
        </table>
    </div>

    <div class="signoff-grid">
        <div class="signoff-box">
            <div class="signoff-line">Prepared By</div>
            <div class="signoff-role">Inventory Personnel</div>
        </div>
        <div class="signoff-box">
            <div class="signoff-line">Reviewed By</div>
            <div class="signoff-role">Warehouse Supervisor</div>
        </div>
        <div class="signoff-box">
            <div class="signoff-line">Approved By</div>
            <div class="signoff-role">Department Manager</div>
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