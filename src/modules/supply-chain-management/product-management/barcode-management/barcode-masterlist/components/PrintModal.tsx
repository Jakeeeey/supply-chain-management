"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { QrCode, FileText } from "lucide-react";
import { Product, Category } from "../types";

// =============================================================================
// MODAL: SELECT FORMAT
// =============================================================================

interface PrintFormatModalProps {
  open: boolean;
  onClose: () => void;
  onSelectFormat: (format: "simple" | "detailed") => void;
  count: number;
}

export function PrintFormatModal({
  open,
  onClose,
  onSelectFormat,
  count,
}: PrintFormatModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Print Format</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card
            className="flex items-center gap-4 p-4 cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
            onClick={() => onSelectFormat("simple")}
          >
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold">Barcode Only</h4>
              <p className="text-sm text-muted-foreground">
                Table format: SKU Code, Description, Barcode
              </p>
            </div>
          </Card>

          <Card
            className="flex items-center gap-4 p-4 cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
            onClick={() => onSelectFormat("detailed")}
          >
            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold">Barcode with Details</h4>
              <p className="text-sm text-muted-foreground">
                Table format: includes CBM (L×W×H), Weight, Category
              </p>
            </div>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {count} item{count !== 1 ? "s" : ""} selected for printing
        </p>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// NEW TAB PRINT — opens a blank tab and writes the printable HTML directly
// =============================================================================

// --- Helpers ---

function getCategoryName(product: Product): string {
  if (
    typeof product.product_category === "object" &&
    product.product_category
  ) {
    return (product.product_category as Category).category_name;
  }
  if (typeof product.product_category === "string") {
    return product.product_category;
  }
  return "–";
}

function getBarcodeJsFormat(product: Product): string {
  if (product.barcode_type_id?.name?.includes("EAN")) return "EAN13";
  return "CODE128";
}

function formatDecimal(value: number | null | undefined): string {
  if (value == null) return "–";
  return Number(value).toFixed(2);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Main function ---

export function openPrintTab(
  products: Product[],
  format: "simple" | "detailed",
) {
  const isDetailed = format === "detailed";
  const orientation = isDetailed ? "landscape" : "portrait";
  const title = isDetailed ? "Product Barcode Report" : "Barcode Label Export";
  const dateStr = new Date().toLocaleDateString();
  const itemCount = products.length;

  // Build table header
  const baseHeaders = `
    <th>SKU Code</th>
    <th>Description</th>
    <th style="text-align:center;">Barcode</th>
  `;

  const detailedHeaders = isDetailed
    ? `
    <th style="text-align:center;">CBM (L)</th>
    <th style="text-align:center;">CBM (W)</th>
    <th style="text-align:center;">CBM (H)</th>
    <th style="text-align:center;">Weight</th>
    <th style="text-align:center;">Category</th>
  `
    : "";

  // Build table rows
  const rows = products
    .map((p) => {
      const sku = escapeHtml(p.product_code || "");
      const desc = escapeHtml(p.description || p.product_name || "");
      const barcodeValue = p.barcode || "";
      const barcodeFormat = getBarcodeJsFormat(p);

      const barcodeCell = barcodeValue
        ? `<svg class="barcode-svg" data-value="${escapeHtml(barcodeValue)}" data-format="${barcodeFormat}"></svg>`
        : `<span style="color:#999;font-style:italic;">–</span>`;

      let detailedCells = "";
      if (isDetailed) {
        const cbmUnit = p.cbm_unit_id?.code || p.cbm_unit_id?.name || "";
        const weightUnit = p.weight_unit_id?.code || p.weight_unit_id?.name || "";

        const cbmL = p.cbm_length != null ? `${formatDecimal(p.cbm_length)} ${cbmUnit}` : "–";
        const cbmW = p.cbm_width != null ? `${formatDecimal(p.cbm_width)} ${cbmUnit}` : "–";
        const cbmH = p.cbm_height != null ? `${formatDecimal(p.cbm_height)} ${cbmUnit}` : "–";
        const weightDisplay = p.weight != null ? `${Number(p.weight).toFixed(2)} ${weightUnit}` : "–";

        detailedCells = `
          <td style="text-align:center;">${escapeHtml(cbmL)}</td>
          <td style="text-align:center;">${escapeHtml(cbmW)}</td>
          <td style="text-align:center;">${escapeHtml(cbmH)}</td>
          <td style="text-align:center;">${escapeHtml(weightDisplay)}</td>
          <td style="text-align:center;">${escapeHtml(getCategoryName(p))}</td>
        `;
      }

      return `
        <tr>
          <td style="font-weight:500;white-space:nowrap;">${sku}</td>
          <td>${desc}</td>
          <td class="barcode-cell">${barcodeCell}</td>
          ${detailedCells}
        </tr>
      `;
    })
    .join("");

  // Build full HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      background: #f8fafc;
      padding: 24px 32px;
    }

    .print-controls {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #1e40af;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .print-btn:hover { background: #1e3a8a; }

    .print-btn svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .report-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
    }

    .report-header h1 {
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .report-header p {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      ${isDetailed ? "table-layout: fixed;" : ""}
    }

    thead th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      white-space: nowrap;
    }

    tbody td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      vertical-align: middle;
      overflow: hidden;
    }

    .barcode-cell {
      text-align: center;
      overflow: hidden;
      max-width: 0;
    }

    .barcode-svg {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      height: auto;
    }

    @media print {
      @page {
        size: ${orientation};
        margin: 10mm;
      }

      body {
        background: white;
        padding: 0;
      }

      .print-controls {
        display: none !important;
      }

      table {
        width: 100% !important;
        ${isDetailed ? "table-layout: fixed;" : ""}
      }
    }
  </style>
</head>
<body>
  <div class="print-controls">
    <button class="print-btn" onclick="window.print()">
      <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print Now
    </button>
  </div>

  <div class="report-header">
    <h1>${escapeHtml(title)}</h1>
    <p>Generated on ${escapeHtml(dateStr)} &middot; ${itemCount} item${itemCount !== 1 ? "s" : ""}</p>
  </div>

  <table>
    <thead>
      <tr>
        ${baseHeaders}
        ${detailedHeaders}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <script>
    // Initialize all barcodes after page loads
    document.querySelectorAll('.barcode-svg').forEach(function(el) {
      try {
        JsBarcode(el, el.dataset.value, {
          format: el.dataset.format,
          width: ${isDetailed ? 1 : 1.2},
          height: ${isDetailed ? 35 : 45},
          fontSize: ${isDetailed ? 10 : 12},
          margin: 0,
          displayValue: true,
        });
      } catch (e) {
        el.outerHTML = '<span style="color:#999;font-style:italic;">Invalid barcode</span>';
      }
    });
  <\/script>
</body>
</html>`;

  // Open new tab and write the content
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
