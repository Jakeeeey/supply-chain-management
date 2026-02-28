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
import { Product, Category, Unit, BundleItem } from "../types";
import { getBundleItems } from "../providers/fetchProviders";

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
                Product Name, SKU Code, Category, Barcode &amp; Type
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

function getUnitName(product: Product): string {
  if (
    typeof product.unit_of_measurement === "object" &&
    product.unit_of_measurement
  ) {
    return (product.unit_of_measurement as Unit).unit_name || "";
  }
  return "";
}

function getTypeBadge(product: Product): string {
  return product.record_type === "bundle" ? "Bundle" : "Regular";
}

function getBarcodeJsFormat(product: Product): string {
  if (product.barcode_type_id?.name?.includes("EAN")) return "EAN13";
  return "CODE128";
}

function getBarcodeTypeName(product: Product): string {
  return product.barcode_type_id?.name || "–";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Build barcode cell with type label ---

function buildBarcodeCell(product: Product): string {
  const barcodeValue = product.barcode || "";
  const barcodeFormat = getBarcodeJsFormat(product);
  const typeName = escapeHtml(getBarcodeTypeName(product));

  if (!barcodeValue) {
    return `<span style="color:#999;font-style:italic;">–</span>`;
  }

  return `
    <div>
      <svg class="barcode-svg" data-value="${escapeHtml(barcodeValue)}" data-format="${barcodeFormat}"></svg>
      <div style="text-align:center;font-size:10px;color:#64748b;margin-top:2px;">${typeName}</div>
    </div>
  `;
}

// --- Build Product Name cell content ---

function buildProductNameContent(
  product: Product,
  items: BundleItem[],
): string {
  const name = escapeHtml(product.description || product.product_name || "");
  const type = escapeHtml(getTypeBadge(product));
  const uom = escapeHtml(getUnitName(product));

  // Name line: Product Name (Type) (UOM)
  let nameHtml = `<span style="font-weight:600;">${name}</span>`;
  if (type) {
    nameHtml += ` <span style="font-size:10px;color:#64748b;">(${type})</span>`;
  }
  if (uom) {
    nameHtml += ` <span style="font-size:10px;color:#64748b;">(${uom})</span>`;
  }

  // For bundles, append components list
  if (product.record_type === "bundle" && items.length > 0) {
    const componentsList = items
      .map(
        (item) =>
          `${item.quantity}x ${escapeHtml(item.product_name)} <span style="font-family:monospace;font-size:11px;color:#64748b;">${escapeHtml(item.product_code)}</span>`,
      )
      .join("<br/>");

    nameHtml += `
      <div style="margin-top:6px;font-size:11px;color:#475569;">
        <div style="font-weight:600;margin-bottom:2px;">Components:</div>
        ${componentsList}
      </div>
    `;
  } else if (product.record_type === "bundle" && items.length === 0) {
    nameHtml += `
      <div style="margin-top:4px;font-size:11px;color:#999;font-style:italic;">No components</div>
    `;
  }

  return nameHtml;
}

// --- Build rows ---

/**
 * SIMPLE format row (same for all):
 * SKU Code | Description | Barcode
 */
function buildSimpleRow(p: Product): string {
  const sku = escapeHtml(p.product_code || "");
  const desc = escapeHtml(p.description || p.product_name || "");
  const barcodeValue = p.barcode || "";
  const barcodeFormat = getBarcodeJsFormat(p);

  const typeName = escapeHtml(getBarcodeTypeName(p));

  const barcodeCell = barcodeValue
    ? `<div><svg class="barcode-svg" data-value="${escapeHtml(barcodeValue)}" data-format="${barcodeFormat}"></svg><div style="text-align:center;font-size:10px;color:#64748b;margin-top:2px;">${typeName}</div></div>`
    : `<span style="color:#999;font-style:italic;">–</span>`;

  return `
    <tr>
      <td style="font-weight:500;white-space:nowrap;">${sku}</td>
      <td>${desc}</td>
      <td class="barcode-cell">${barcodeCell}</td>
    </tr>
  `;
}

/**
 * DETAILED format row (unified for regular + bundle):
 * Product Name | SKU Code | Category | Barcode + Type
 */
function buildDetailedRow(
  p: Product,
  items: BundleItem[],
): string {
  const productName = buildProductNameContent(p, items);
  const sku = escapeHtml(p.product_code || "");
  const category = escapeHtml(getCategoryName(p));
  const barcodeCell = buildBarcodeCell(p);

  return `
    <tr>
      <td style="vertical-align:top;">${productName}</td>
      <td style="font-weight:500;white-space:nowrap;vertical-align:top;">${sku}</td>
      <td style="text-align:center;vertical-align:top;">${category}</td>
      <td class="barcode-cell" style="vertical-align:top;">${barcodeCell}</td>
    </tr>
  `;
}

// --- Main function (async to fetch bundle items) ---

export async function openPrintTab(
  products: Product[],
  format: "simple" | "detailed",
) {
  const isDetailed = format === "detailed";
  const orientation = isDetailed ? "landscape" : "portrait";
  const title = isDetailed ? "Product Barcode Report" : "Barcode Label Export";
  const dateStr = new Date().toLocaleDateString();
  const itemCount = products.length;

  // Pre-fetch bundle items for all bundles in detailed mode
  const bundleItemsMap = new Map<string, BundleItem[]>();
  if (isDetailed) {
    const bundleProducts = products.filter(
      (p) => p.record_type === "bundle",
    );
    const results = await Promise.all(
      bundleProducts.map(async (p) => {
        try {
          const items = await getBundleItems(p.product_id);
          return { id: p.product_id, items };
        } catch {
          return { id: p.product_id, items: [] };
        }
      }),
    );
    results.forEach((r) => bundleItemsMap.set(r.id, r.items));
  }

  // Build headers based on format
  const headers = isDetailed
    ? `
    <th>Product Name</th>
    <th>SKU Code</th>
    <th style="text-align:center;">Category</th>
    <th style="text-align:center;">Barcode</th>
  `
    : `
    <th>SKU Code</th>
    <th>Description</th>
    <th style="text-align:center;">Barcode</th>
  `;

  // Build table rows
  const rows = products
    .map((p) => {
      if (!isDetailed) {
        return buildSimpleRow(p);
      }
      const items = bundleItemsMap.get(p.product_id) || [];
      return buildDetailedRow(p, items);
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
        ${headers}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <script>
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

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
