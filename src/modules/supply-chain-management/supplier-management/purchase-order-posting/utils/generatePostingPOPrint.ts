import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, DiscountType } from '../types';
import { money } from '../utils/format';

export interface PrintData {
  po: PurchaseOrder;
  discountTypes: DiscountType[];
}

// jsPDF core fonts don't support the Peso sign (₱) out of the box (they print as ±).
// We'll replace it with "PHP" text for the PDF output.
const safeMoney = (val: number, currency = "PHP") => {
    return money(val, currency).replace(/₱/g, "PHP ");
};

export function generatePostingPOPrint(data: PrintData): jsPDF {
  const { po, discountTypes } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  /* ── Header ─────────────────────────────────────────────── */
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('VOS WEB — SUPPLY CHAIN MANAGEMENT', pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('POSTING OF PO DETAILS', pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(po.poNumber || 'Unknown PO', pageW / 2, y, { align: 'center' });
  y += 5;

  /* ── Divider ─────────────────────────────────────────────── */
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  /* ── Info Grid (2 columns) ───────────────────────────────── */
  const col1x = margin;
  const col2x = pageW / 2 + 4;

  // Row 1: Supplier | Status
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('SUPPLIER', col1x, y);
  doc.text('STATUS', col2x, y);
  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(po.supplier?.name || "Unknown Supplier", col1x, y);

  const isReceived = po.status?.toLowerCase() === 'received' || po.status?.toLowerCase() === 'closed';
  const badgeText = po.status || 'Unknown';
  const badgePad = { x: 3, y: 1.5 };
  const badgeW = doc.getTextWidth(badgeText) + badgePad.x * 2;
  const badgeH = 6;
  const badgeX = col2x;
  const badgeY = y - 1;

  doc.setFillColor(isReceived ? 209 : 254, isReceived ? 250 : 249, isReceived ? 229 : 195);
  doc.setDrawColor(isReceived ? 6 : 113, isReceived ? 95 : 63, isReceived ? 70 : 18);
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(isReceived ? 6 : 113, isReceived ? 95 : 63, isReceived ? 70 : 18);
  doc.text(badgeText, badgeX + badgePad.x, badgeY + badgeH - 1.8);
  
  y += 8;

  // Row 2: Date
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('CREATED DATE', col1x, y);
  doc.text('CURRENCY', col2x, y);
  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-PH') : "—", col1x, y);
  doc.text(po.currency || "PHP", col2x, y);
  y += 8;

  /* ── Items Tables (Per Branch) ───────────────────────────── */
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("Allocations Breakdown", margin, y);
  y += 4;

  (po.allocations || []).forEach(alloc => {
    if (!alloc.items.length) return;
    
    y += 4;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(`Branch: ${alloc.branch?.name || "Unknown"}`, margin, y);
    y += 2;


    const rows = alloc.items.map((item, i) => {
        const uprice = item.unitPrice || 0;
        const qty = item.expectedQty || 0;
        const gross = item.grossAmount || (uprice * qty);

        let discountDisplay = "—";
        let discAmtVal = 0;

        if (item.discountTypeId && item.discountTypeId !== "null") {
            const dt = discountTypes.find(d => String(d.id) === String(item.discountTypeId) || String(d.name) === String(item.discountTypeId));
            if (dt) {
                discAmtVal = (dt.percent / 100) * gross;
                discountDisplay = `${dt.name} ${safeMoney(discAmtVal, po.currency || "PHP")}`;
            } else {
                const nums = (item.discountTypeId.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 100);
                if (nums.length) {
                    const factor = nums.reduce((a, p) => a * (1 - p / 100), 1);
                    discAmtVal = gross * (1 - factor);
                    discountDisplay = `${item.discountTypeId} ${safeMoney(discAmtVal, po.currency || "PHP")}`;
                } else {
                    discountDisplay = String(item.discountTypeId);
                }
            }
        }

        const netTotal = gross - discAmtVal;

        return [
            String(i + 1),
            item.barcode || "—",
            item.name || "—",
            String(qty),
            safeMoney(uprice, po.currency || "PHP"),
            discountDisplay.replace(/₱/g, "PHP "),
            safeMoney(netTotal, po.currency || "PHP")
        ];
    });

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'SKU/Barcode', 'Product Name', 'Qty', 'Unit Price', 'Discount', 'Net Total']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [220, 220, 220] },
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 25, fontStyle: 'bold' },
            2: { cellWidth: 40 },
            3: { cellWidth: 15, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 35, halign: 'right', textColor: [80, 80, 80] },
            6: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY + 4;
  });

  /* ── Financial Summary ─────────────────────────────────── */
  y += 4;
  const summaryX = pageW - margin - 70; // align right block
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const cur = po.currency || "PHP";
  
  const addLine = (label: string, value: number, isLast = false, isDiscount = false) => {
    doc.text(label, summaryX, y);
    doc.setFont('helvetica', isLast ? 'bold' : 'normal');
    if (isDiscount) doc.setTextColor(220, 38, 38);
    else if (isLast) doc.setTextColor(0, 0, 0);
    else doc.setTextColor(50, 50, 50);
    
    // add minus sign for discount
    const valPrefix = isDiscount ? "-" : "";
    const valStr = `${valPrefix}${safeMoney(value, cur)}`;
    doc.text(valStr, pageW - margin, y, { align: 'right' });
    y += 5;
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
  };

  // Compute total discount similar to dashboard
  const computedTotalDiscount = (po.allocations || []).reduce((sum, alloc) => {
      return sum + alloc.items.reduce((itemSum, it) => {
          const uprice = it.unitPrice || 0;
          const qty = it.expectedQty || 0;
          const gross = uprice * qty;
          
          if (!it.discountTypeId || it.discountTypeId === "null") return itemSum;
          const dt = discountTypes.find(d => String(d.id) === String(it.discountTypeId) || String(d.name) === String(it.discountTypeId));
          if (dt) return itemSum + ((dt.percent / 100) * gross);
          const nums = (it.discountTypeId.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 100);
          if (nums.length) {
              const factor = nums.reduce((a, p) => a * (1 - p / 100), 1);
              return itemSum + (gross * (1 - factor));
          }
          return itemSum;
      }, 0);
  }, 0);

  const finalDiscountAmt = Number(po.discountAmount) > 0 ? Number(po.discountAmount) : computedTotalDiscount;

  addLine('Gross Amount:', po.grossAmount || 0);
  if (finalDiscountAmt > 0) addLine('Total Discount:', finalDiscountAmt, false, true);
  if (Number(po.vatAmount) > 0) addLine('VAT details:', po.vatAmount || 0);
  if (Number(po.withholdingTaxAmount) > 0) addLine('EWT details:', po.withholdingTaxAmount || 0, false, true);
  
  doc.setFontSize(10);
  addLine('GRAND TOTAL:', po.totalAmount || 0, true);

  // Standardized Footnote
  y += 2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Note: VAT and EWT figures are for reference and have not been deducted from the total.', summaryX - 25, y);

  /* ── Document Footer ─────────────────────────────────────── */
  const footerY = doc.internal.pageSize.getHeight() - 8;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  const printDate = new Date().toLocaleString('en-PH');
  doc.text(
    `Printed on ${printDate} · VOS Web Supply Chain Management System`,
    pageW / 2,
    footerY,
    { align: 'center' },
  );

  return doc;
}
