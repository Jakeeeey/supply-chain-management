import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScannedItem } from '../types';

export interface StockTransferPDFData {
  orderNo: string;
  status: string;
  sourceBranchLabel: string;
  targetBranchLabel: string;
  leadDate: string;
  scannedItems: ScannedItem[];
}

/**
 * Generates a jsPDF document for the Stock Transfer Slip.
 * Returns the jsPDF instance so callers can save, print, or get a blob URL.
 */
export function generateStockTransferPDF(data: StockTransferPDFData): jsPDF {
  const {
    orderNo,
    status,
    sourceBranchLabel,
    targetBranchLabel,
    leadDate,
    scannedItems,
  } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 14;

  /* ── Header ─────────────────────────────────────────────── */
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('VOS WEB — SUPPLY CHAIN MANAGEMENT', pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('STOCK TRANSFER SLIP', pageW / 2, y, { align: 'center' });
  y += 5;

  if (orderNo) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(orderNo, pageW / 2, y, { align: 'center' });
    y += 5;
  }

  /* ── Divider ─────────────────────────────────────────────── */
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  /* ── Info Grid (2 columns) ───────────────────────────────── */
  const col1x = margin;
  const col2x = pageW / 2 + 4;

  // Row 1: Source Branch | Target Branch
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('SOURCE BRANCH', col1x, y);
  doc.text('TARGET BRANCH', col2x, y);
  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(sourceBranchLabel || '—', col1x, y);
  doc.text(targetBranchLabel || '—', col2x, y);
  y += 8;

  // Row 2: Date Requested | Status
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('DATE REQUESTED', col1x, y);
  doc.text('STATUS', col2x, y);
  y += 4; // tight but clear gap between label and badge

  // Left value: Date Requested
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(leadDate || '—', col1x, y);

  // Status badge — starts at value row, no upward offset
  const isReceived = status?.toLowerCase() === 'received';
  const badgeText = status || 'Pending';
  const badgePad = { x: 3, y: 1.5 };
  const badgeW = doc.getTextWidth(badgeText) + badgePad.x * 2;
  const badgeH = 6;
  const badgeX = col2x;
  const badgeY = y - 1; // top of badge aligns with value baseline area

  doc.setFillColor(isReceived ? 209 : 254, isReceived ? 250 : 249, isReceived ? 229 : 195);
  doc.setDrawColor(isReceived ? 6 : 113, isReceived ? 95 : 63, isReceived ? 70 : 18);
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(isReceived ? 6 : 113, isReceived ? 95 : 63, isReceived ? 70 : 18);
  doc.text(badgeText, badgeX + badgePad.x, badgeY + badgeH - 1.8);

  y += 8;

  /* ── Items Table ─────────────────────────────────────────── */
  const grandTotal = scannedItems.reduce((sum, i) => sum + i.totalAmount, 0);
  const rows = scannedItems.map((item, i) => [
    String(i + 1),
    item.rfid,
    item.productName,
    item.description,
    item.brandName || 'N/A',
    item.unit,
    String(item.qtyAvailable),
    String(item.unitQty),
    `PHP ${item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['No.', 'RFID', 'Product Name', 'Description', 'Brand', 'Unit', 'Qty Avail', 'Qty (Ord)', 'Total Amount']],
    body: rows.length > 0 ? rows : [['', 'No items scanned.', '', '', '', '', '', '', '']],
    foot: rows.length > 0
      ? [['', '', '', '', '', '', '', 'GRAND TOTAL', `PHP ${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`]]
      : [],
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [0, 0, 0],
      lineColor: [220, 220, 220],
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 7,
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [249, 250, 251],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 25, fontStyle: 'italic', textColor: [80, 80, 80] },
      4: { cellWidth: 15 },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    didParseCell: (data) => {
      // Column 5 is 'Unit'
      if (data.section === 'body' && data.column.index === 5) {
        const item = scannedItems[data.row.index];
        if (item && item.unitId) {
          const uid = Number(item.unitId);
          if (uid === 1) data.cell.styles.fontStyle = 'bold';
          else if (uid === 2) data.cell.styles.fontStyle = 'italic';
          else if (uid === 3) data.cell.styles.fontStyle = 'bolditalic';
          else if (uid === 0) data.cell.styles.fontStyle = 'normal';
        }
      }
    },
    didDrawPage: () => {},
  });

  /* ── Signature Footer ────────────────────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTableY = (doc as any).lastAutoTable?.finalY ?? y + 40;
  const sigY = afterTableY + 16;
  const sigLineW = (contentW - 16) / 3;
  const sigLabels = ['PREPARED BY', 'RECEIVED BY', 'APPROVED BY'];

  sigLabels.forEach((label, i) => {
    const lineX = margin + i * (sigLineW + 8);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(lineX, sigY, lineX + sigLineW, sigY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, lineX + sigLineW / 2, sigY + 4, { align: 'center' });
  });

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
