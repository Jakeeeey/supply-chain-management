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
    preparedBy?: string;
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

function fmtVariance(value: number): string {
    if (value < 0) {
        return `(${fmtNumber(Math.abs(value))})`;
    }
    return fmtNumber(value);
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
    if (value === 0) {
        return `
            <span class="money money-default" style="color: var(--muted); opacity: 0.6;">—</span>
        `;
    }

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

function renderFindingsRow(row: OffsettingSelectableRow): string {
    const varianceValue = row.variance_base ?? row.variance ?? 0;
    const diffCost = Math.abs(row.difference_cost ?? 0);

    return `
        <tr>
            <td>${escapeHtml(row.brand_name || "—")}</td>
            <td>${escapeHtml(row.category_name || "—")}</td>
            <td class="findings-product-cell">
                <div class="wrap-text">
                    ${escapeHtml(row.product_label)}
                </div>
            </td>
            <td>${escapeHtml(row.unit_shortcut || row.unit_name || "—")}</td>
            <td class="text-right number">${fmtNumber(row.unit_count)}</td>
            <td class="text-center audit-cell">
                <div class="audit-grid">
                    <div class="audit-counts">
                        <div class="audit-system"><span class="audit-label">SC</span>${fmtNumber(row.system_count * row.unit_count)}</div>
                        <div class="audit-divider"></div>
                        <div class="audit-physical"><span class="audit-label">PC</span>${fmtNumber(row.physical_count * row.unit_count)}</div>
                    </div>
                    <div class="audit-variance">
                        ${fmtVariance(varianceValue)}
                    </div>
                </div>
            </td>
            <td class="text-right">${moneyCell(diffCost, "default")}</td>
            <td class="text-right">${moneyCell(row.selection_amount, "default")}</td>
        </tr>
    `;
}

function renderFindingsSectionRows(
    allRows: OffsettingSelectableRow[],
    offsetGroups: PhysicalInventoryOffsetGroup[],
): string {
    // Collect all row_ids that appear in any offset group
    const offsetRowIds = new Set<number>();
    for (const group of offsetGroups) {
        for (const r of group.short_rows) offsetRowIds.add(r.row_id);
        for (const r of group.over_rows) offsetRowIds.add(r.row_id);
    }

    const notOffsetRows = allRows.filter((r) => !offsetRowIds.has(r.row_id));
    const offsetRows = allRows.filter((r) => offsetRowIds.has(r.row_id));

    let html = "";

    // --- Not Offset sub-group ---
    html += `<tr class="subgroup-header"><td colspan="8">Not Offset</td></tr>`;
    if (notOffsetRows.length === 0) {
        html += `<tr><td colspan="8" class="empty-cell">No records found.</td></tr>`;
    } else {
        html += notOffsetRows.map(renderFindingsRow).join("");
    }

    // --- Offset Products sub-group ---
    html += `<tr class="subgroup-header"><td colspan="8">Offset Products</td></tr>`;
    if (offsetRows.length === 0) {
        html += `<tr><td colspan="8" class="empty-cell">No records found.</td></tr>`;
    } else {
        html += offsetRows.map(renderFindingsRow).join("");
    }

    return html;
}

function renderOffsetGroupProduct(row: OffsettingSelectableRow | undefined): string {
    if (!row) {
        return `<span class="empty-inline">—</span>`;
    }

    return `
        <div class="product-item wrap-text" title="${escapeHtml(row.product_label)}">
            <span class="product-name">${escapeHtml(row.product_label)}</span>
            <span class="product-row-meta">
                <span class="product-variance">
                    (${fmtNumber(Math.abs(row.variance_base ?? row.variance ?? 0))} ${escapeHtml(row.unit_shortcut || row.unit_name || "PCS")})
                </span>
            </span>
        </div>
    `;
}

function renderOffsetGroupAmount(row: OffsettingSelectableRow | undefined): string {
    if (!row) {
        return `<span class="empty-inline">—</span>`;
    }

    return moneyCell(row.selection_amount, "offset");
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
            const rowCount = Math.max(group.short_rows.length, group.over_rows.length, 1);

            const detailRows = Array.from({ length: rowCount }, (_, rowIndex) => {
                const shortRow = group.short_rows[rowIndex];
                const overRow = group.over_rows[rowIndex];

                const offsetCell =
                    rowIndex === 0
                        ? `
                            <td class="offset-col" rowspan="${rowCount + 1}">
                                <div class="group-title">Offset ${index + 1}</div>
                                <div class="group-date">${fmtDate(group.created_at)}</div>
                            </td>
                        `
                        : "";

                const differenceCell =
                    rowIndex === 0
                        ? `
                            <td class="text-right offset-difference-cell" rowspan="${rowCount}">
                                ${moneyCell(group.difference, "offset")}
                            </td>
                        `
                        : "";

                return `
                    <tr class="offset-detail-row">
                        ${offsetCell}
                        <td class="offset-rows-cell">${renderOffsetGroupProduct(shortRow)}</td>
                        <td class="offset-rows-cell">${renderOffsetGroupProduct(overRow)}</td>
                        <td class="text-right">${renderOffsetGroupAmount(shortRow)}</td>
                        <td class="text-right">${renderOffsetGroupAmount(overRow)}</td>
                        ${differenceCell}
                    </tr>
                `;
            }).join("");

            return `
                ${detailRows}
                <tr class="offset-total-row">
                    <td class="text-right total-label" colspan="2">Totals</td>
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
        preparedBy,
    } = args;

    const totalShortAmount = sumRowAmounts(allShortRows);
    const totalOverAmount = sumRowAmounts(allOverRows);
    const unresolvedShortAmount = sumRowAmounts(unresolvedShortRows);
    const unresolvedOverAmount = sumRowAmounts(unresolvedOverRows);

    const groupedShortAmount = offsetGroups.reduce((acc, group) => acc + group.short_total, 0);
    const groupedOverAmount = offsetGroups.reduce((acc, group) => acc + group.over_total, 0);

    let adjustedUnresolvedShort = unresolvedShortAmount;
    let adjustedUnresolvedOver = unresolvedOverAmount;

    for (const group of offsetGroups) {
        if (group.difference < 0) {
            adjustedUnresolvedShort += group.difference;
        } else if (group.difference > 0) {
            adjustedUnresolvedOver += group.difference;
        }
    }

    const netUnresolvedAmount = Math.abs(adjustedUnresolvedShort - adjustedUnresolvedOver);

    const findingsNarrative = [
        `The reconciliation identified ${allShortRows.length} shortage row${allShortRows.length === 1 ? "" : "s"} with a total exposure of ₱ ${fmtMoney(totalShortAmount)}.`,
        `The reconciliation identified ${allOverRows.length} overage row${allOverRows.length === 1 ? "" : "s"} with a total value of ₱ ${fmtMoney(totalOverAmount)}.`,
        `A total of ${offsetGroups.length} manual offset group${offsetGroups.length === 1 ? "" : "s"} were created during review.`,
        `Remaining unresolved short findings total ₱ ${fmtMoney(adjustedUnresolvedShort)}, while unresolved over findings total ₱ ${fmtMoney(adjustedUnresolvedOver)}.`,
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
            font-size: 10.5px;
            line-height: 1.3;
            background: #ffffff;
        }

        body {
            padding: 24px 28px 48px; /* Increased bottom padding for footer */
        }

        .print-footer {
            display: none;
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
            padding: 2px 0;
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
            padding: 6px 8px;
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
            padding: 4px 6px;
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

.text-center {
    text-align: center;
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

        .page-break {
            page-break-before: always;
        }

        .truncate {
            display: block;
            width: 100%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            line-height: 1.35;
        }

        .product-item {
            padding: 4px 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .product-variance {
            color: var(--muted);
            font-size: 10px;
            font-weight: 400;
        }

        .product-row-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
        }

        .product-amount {
            font-size: 10px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: var(--text);
            white-space: nowrap;
        }

        .product-item + .product-item {
            border-top: 1px solid #e5e7eb;
        }

        .findings-product-cell {
            min-width: 280px;
        }

        .subgroup-header td {
            background: #e8eaed;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 5px 8px;
            color: #374151;
            border-bottom: 2px solid var(--border);
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
            margin-top: 32px;
        }

        .signoff-box {
            text-align: center;
        }

        .signoff-name {
            font-weight: 700;
            font-size: 13px;
            margin-bottom: 2px;
            min-height: 1.4em;
        }

        .signoff-line {
            border-top: 1px solid #111827;
        }

        .signoff-role {
            color: var(--muted);
            font-size: 11px;
            margin-top: 4px;
        }

        .w-brand { width: 9%; }
        .w-cat { width: 9%; }
        .w-uom { width: 4%; }
        .w-baseqty { width: 5%; }
        .w-merged { width: 10%; }
        .w-diff { width: 10%; }
        .w-amount { width: 10%; }

        .audit-cell {
    padding: 0 !important;
    height: 1px;
    vertical-align: middle;
}

.audit-grid {
    display: grid;
    grid-template-columns: minmax(64px, 1fr) minmax(48px, auto);
    grid-template-rows: 1fr 1fr;
    width: 100%;
    height: 100%;
    min-height: 40px;
}

.audit-counts {
    grid-column: 1;
    grid-row: 1 / span 2;
    display: grid;
    grid-template-rows: 1fr 1fr;
    height: 100%;
}

.audit-system,
.audit-physical {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 2px 8px 2px 4px;
    line-height: 1.1;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.audit-system {
    color: var(--muted);
    font-size: 8.5px;
    border-bottom: 1px solid #999;
}

.audit-physical {
    font-weight: normal;
    font-size: 9px;
}

.audit-divider {
    display: none;
}

.audit-variance {
    grid-column: 2;
    grid-row: 1 / span 2;
    border-left: 1px solid #999;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-weight: 700;
    min-width: 48px;
    height: 100%;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.audit-label {
    font-size: 7.5px;
    color: var(--muted);
    margin-right: 3px;
    font-weight: normal;
    font-variant-caps: all-small-caps;
}

.w-offset { width: 13%; }
.w-shortrows { width: 24%; }
.w-overrows { width: 24%; }
.w-shortamount { width: 13%; }
.w-overamount { width: 13%; }
.w-difference { width: 13%; }

.offset-detail-row td {
    vertical-align: top;
}

.offset-total-row td {
    background: #f8fafc;
    font-weight: 700;
    border-top: 2px solid var(--border);
}

.total-label {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 9.5px;
}

.empty-inline {
    color: var(--muted);
    opacity: 0.6;
}

.offset-difference-cell {
    vertical-align: middle !important;
    font-weight: 700;
    background: #ffffff;
}

.offset-difference-cell .money-offset {
    min-width: 100px;
}

        @media print {
            @page {
                margin: 15mm 15mm 20mm;
                @bottom-center {
                    content: "${escapeHtml(header.ph_no || `PH #${header.id}`)}  |  Page " counter(page) " of " counter(pages);
                    font-family: Arial, sans-serif;
                    font-size: 9px;
                    color: #6b7280;
                    border-top: 1px solid #d4d4d8;
                    width: 100%;
                    padding-top: 10px;
                }
            }

            body {
                padding: 0;
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
                    <div class="detail-label">PH NO</div>
                    <div class="detail-value">${escapeHtml(header.ph_no || String(header.id))}</div>
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
                    <th class="w-brand">Brand</th>
                    <th class="w-cat">Category</th>
                    <th>Product</th>
                    <th class="w-uom">UOM</th>
                    <th class="w-baseqty text-right">Base Qty</th>
                    <th class="w-merged text-center">Audit / Variance</th>
                    <th class="w-diff text-right">Diff Cost</th>
                    <th class="w-amount text-right">Short Amount</th>
                </tr>
            </thead>
            <tbody>
                ${renderFindingsSectionRows(allShortRows, offsetGroups)}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3 class="section-title">Over Findings</h3>
        <table class="findings-table">
            <thead>
                <tr>
                    <th class="w-brand">Brand</th>
                    <th class="w-cat">Category</th>
                    <th>Product</th>
                    <th class="w-uom">UOM</th>
                    <th class="w-baseqty text-right">Base Qty</th>
                    <th class="w-merged text-center">Audit / Variance</th>
                    <th class="w-diff text-right">Diff Cost</th>
                    <th class="w-amount text-right">Over Amount</th>
                </tr>
            </thead>
            <tbody>
                ${renderFindingsSectionRows(allOverRows, offsetGroups)}
            </tbody>
        </table>
    </div>

    <div class="section page-break">
        <h3 class="section-title">Manual Offsetting Summary</h3>
        <table class="offset-table">
            <thead>
    <tr>
        <th class="w-offset">Offset</th>
        <th class="w-shortrows">Short Rows</th>
        <th class="w-overrows">Over Rows</th>
        <th class="w-shortamount text-right">Short Amount</th>
        <th class="w-overamount text-right">Over Amount</th>
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
            <div class="signoff-name">${escapeHtml(preparedBy || "")}</div>
            <div class="signoff-line"></div>
            <div class="signoff-role">Prepared By</div>
        </div>
        <div class="signoff-box">
            <div class="signoff-name"></div>
            <div class="signoff-line"></div>
            <div class="signoff-role">Reviewed By</div>
        </div>
        <div class="signoff-box">
            <div class="signoff-name"></div>
            <div class="signoff-line"></div>
            <div class="signoff-role">Approved By</div>
        </div>
    </div>
    <div class="print-footer">
        ${escapeHtml(header.ph_no || `PH #${header.id}`)} &nbsp; | &nbsp; <span class="page-number"></span>
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