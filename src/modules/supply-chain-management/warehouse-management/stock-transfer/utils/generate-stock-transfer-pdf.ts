import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScannedItem, CompanyData } from '../types/stock-transfer.types';

export interface StockTransferPDFData {
  orderNo: string;
  status: string;
  sourceBranchLabel: string;
  targetBranchLabel: string;
  leadDate: string;
  scannedItems: ScannedItem[];
  companyData: CompanyData | null;
}

export function generateStockTransferPDF(data: StockTransferPDFData): jsPDF {
  const { orderNo, status, sourceBranchLabel, targetBranchLabel, leadDate, scannedItems, companyData } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });

  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const margin  = 16;
  const contentW = pageW - margin * 2;
  let y = 14;

  // ── Corporate Header ──────────────────────────────────────────
  if (companyData) {
    // 1. Logo
    if (companyData.company_logo) {
      try {
        doc.addImage(companyData.company_logo, 'PNG', margin, y, 28, 16, undefined, 'FAST');
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    }

    const headerTextX = margin + 32;
    
    // 2. Company Name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(companyData.company_name.toUpperCase(), headerTextX, y + 5);

    // 3. Address details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const address = [
       companyData.company_address,
       `${companyData.company_brgy}, ${companyData.company_city}, ${companyData.company_province} - ${companyData.company_zipCode}`
    ].filter(Boolean).join(', ');
    doc.text(address, headerTextX, y + 10);

    // 4. Contact info
    const contactInfo = `Contact: ${companyData.company_contact}  |  Email: ${companyData.company_email}`;
    doc.text(contactInfo, headerTextX, y + 15);

    y += 22;
  } else {
    // Fallback: Simple system label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('VOS WEB — SUPPLY CHAIN MANAGEMENT', pageW / 2, y, { align: 'center' });
    y += 8;
  }

  // ── Divider ──
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // ── Document Title & Metadata ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('STOCK TRANSFER SLIP', margin, y);

  if (orderNo) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`NO: ${orderNo}`, pageW - margin, y, { align: 'right' });
  }

  y += 8;

  // ── Info grid — outline box only, no fill ─────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y - 3, contentW, 28, 1.5, 1.5, 'S'); // 'S' = stroke only

  const col1x = margin + 5;
  const col2x = pageW / 2 + 5;

  // Row 1 labels
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('SOURCE BRANCH', col1x, y + 2);
  doc.text('TARGET BRANCH', col2x, y + 2);
  y += 6;

  // Row 1 values
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(sourceBranchLabel || '—', col1x, y);
  doc.text(targetBranchLabel || '—', col2x, y);
  y += 8;

  // Row 2 labels
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('DATE REQUESTED', col1x, y);
  doc.text('STATUS', col2x, y);
  y += 5;

  // Row 2 values
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(leadDate || '—', col1x, y);
  doc.text((status || 'PENDING').toUpperCase(), col2x, y);

  y += 12;

  // ── Table ─────────────────────────────────────────────────────
  const grandTotal = scannedItems.reduce((sum, i) => sum + i.totalAmount, 0);
  const rows = scannedItems.map((item, i) => [
    String(i + 1),
    item.rfid || 'N/A',
    item.productName,
    item.description,
    item.brandName || 'N/A',
    item.unit,
    String(item.qtyAvailable),
    String(item.unitQty),
    String((item as unknown as Record<string, unknown>).allocated_quantity ?? item.unitQty),
    `PHP ${item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'RFID', 'Product Name', 'Description', 'Brand', 'Unit', 'Qty Avail', 'Qty Ord', 'Qty Alloc', 'Amount']],
    body: rows.length > 0 ? rows : [['', 'No items scanned.', '', '', '', '', '', '', '', '']],
    foot: rows.length > 0
      ? [[
          { content: '', colSpan: 8, styles: { fillColor: [255, 255, 255] as [number, number, number], lineColor: [210, 210, 210] as [number, number, number] } },
          { content: 'GRAND TOTAL', colSpan: 1, styles: { halign: 'right' as const, fontStyle: 'bold' as const, fontSize: 7.5, fillColor: [255, 255, 255] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], lineColor: [210, 210, 210] as [number, number, number] } },
          { content: `PHP ${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, colSpan: 1, styles: { halign: 'right' as const, fontStyle: 'bold' as const, fontSize: 7.5, fillColor: [255, 255, 255] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], lineColor: [210, 210, 210] as [number, number, number] } },
        ]]
      : [],
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
      textColor: [40, 40, 40] as [number, number, number],
      lineColor: [210, 210, 210] as [number, number, number],
      lineWidth: 0.2,
      overflow: 'linebreak',
      fillColor: [255, 255, 255] as [number, number, number],
    },
    headStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [0, 0, 0] as [number, number, number],
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [180, 180, 180] as [number, number, number],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 7,  halign: 'center', textColor: [150, 150, 150] as [number, number, number] },
      1: { cellWidth: 26, fontStyle: 'bold', fontSize: 6.5 },
      2: { cellWidth: 38 },
      3: { cellWidth: 28, fontStyle: 'italic', textColor: [100, 100, 100] as [number, number, number], fontSize: 6.5 },
      4: { cellWidth: 16 },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 12, halign: 'right' },
      7: { cellWidth: 12, halign: 'right' },
      8: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
  });

  // ── Signature section ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTableY = (doc as Record<string, any>).lastAutoTable?.finalY ?? y + 40;
  const sigY  = afterTableY + 16;
  const sigW  = (contentW - 20) / 3;
  const sigGap = 10;

  ['PREPARED BY', 'RECEIVED BY', 'APPROVED BY'].forEach((label, i) => {
    const lineX = margin + i * (sigW + sigGap);
    const midX  = lineX + sigW / 2;

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.4);
    doc.line(lineX, sigY, lineX + sigW, sigY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label, midX, sigY + 5, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Date: _______________', midX, sigY + 10, { align: 'center' });
  });

  // ── Footer ────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 10, pageW - margin, pageH - 10);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Printed: ${new Date().toLocaleString('en-PH')}  ·  VOS Web Supply Chain Management System`,
    pageW / 2,
    pageH - 6,
    { align: 'center' },
  );

  return doc;
}