import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScannedItem, CompanyData, OrderGroupItem, ProductRow } from '../types/stock-transfer.types';

export interface StockTransferPDFData {
  orderNo: string;
  status: string;
  sourceBranchLabel: string;
  targetBranchLabel: string;
  leadDate: string;
  scannedItems: ScannedItem[];
  companyData: CompanyData | null;
  salesmanName?: string;
}

// ── Corporate Header Helper ────────────────────────────────────
function drawCorporateHeader(doc: jsPDF, companyData: CompanyData | null, margin: number, pageW: number): number {
  let y = 14;
  const contentW = pageW - margin * 2;

  if (companyData) {
    if (companyData.company_logo) {
      try {
        doc.addImage(companyData.company_logo, 'PNG', margin, y, 28, 16, undefined, 'FAST');
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    }

    const headerTextX = margin + 32;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const companyNameLines = doc.splitTextToSize(companyData.company_name.toUpperCase(), contentW - 35);
    doc.text(companyNameLines, headerTextX, y + 5);
    
    const nameHeight = companyNameLines.length * 6;
    const currentHeaderY = y + 5 + nameHeight;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const address = [
       companyData.company_address,
       `${companyData.company_brgy}, ${companyData.company_city}, ${companyData.company_province} - ${companyData.company_zipCode}`
    ].filter(Boolean).join(', ');
    doc.text(address, headerTextX, currentHeaderY);

    const contactInfo = `Contact: ${companyData.company_contact}  |  Email: ${companyData.company_email}`;
    doc.text(contactInfo, headerTextX, currentHeaderY + 5);

    y = currentHeaderY + 12;
  } else {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('VOS WEB — SUPPLY CHAIN MANAGEMENT', pageW / 2, y, { align: 'center' });
    y += 8;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  return y;
}

export function generateStockTransferPDF(data: StockTransferPDFData): jsPDF {
  const { orderNo, status, sourceBranchLabel, targetBranchLabel, leadDate, scannedItems, companyData, salesmanName } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });

  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const margin  = 16;
  const contentW = pageW - margin * 2;
  
  let y = drawCorporateHeader(doc, companyData, margin, pageW);

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

  if (salesmanName) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`SALESMAN: ${salesmanName.toUpperCase()}`, margin, y - 2);
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

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
  const rows = scannedItems.map((item) => [
    item.brandName || 'N/A',
    item.productName,
    item.unit,
    String(item.unitQty),
    `PHP ${item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Brand', 'Product Name', 'Unit', 'Order Quantity', 'Total']],
    body: rows.length > 0 ? rows : [['No items found.', '', '', '', '']],
    foot: rows.length > 0
      ? [[
          { content: '', colSpan: 3, styles: { fillColor: [255, 255, 255] as [number, number, number], lineColor: [210, 210, 210] as [number, number, number] } },
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
      0: { cellWidth: 35 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
  });

  // ── Signature section ─────────────────────────────────────────
  const afterTableY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
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
    `Printed: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}  ·  VOS Web Supply Chain Management System`,
    pageW / 2,
    pageH - 6,
    { align: 'center' },
  );

  return doc;
}

// ── Picklist Types ────────────────────────────────────────────

export interface PicklistPDFData {
  orderNo: string;
  pickerName: string;
  date: string;
  items: OrderGroupItem[]; 
  companyData: CompanyData | null;
  salesmanName?: string;
  sourceBranch?: string;
  targetBranch?: string;
  requestedDate?: string;
}

export interface ReceivingPDFData {
  orderNo: string;
  checkedBy: string;
  date: string;
  items: OrderGroupItem[];
  companyData: CompanyData | null;
  sourceBranch?: string;
  targetBranch?: string;
  salesmanName?: string;
  requestedDate?: string;
}

/**
 * Generates a Picklist PDF for warehouse picking.
 * Grouped by Supplier/Brand and includes checkboxes.
 */
export function generateStockTransferPicklistPDF(data: PicklistPDFData): jsPDF {
  const { orderNo, pickerName, date, requestedDate, items, companyData, salesmanName, sourceBranch, targetBranch } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;

  let y = drawCorporateHeader(doc, companyData, margin, pageW);

  const safeNum = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // ── Pre-calculate Grand Total ──
  const grandTotal = items.reduce((sum, item) => {
    const qty = safeNum(item.allocated_quantity ?? item.ordered_quantity);
    const ordQty = safeNum(item.ordered_quantity);
    const product = typeof item.product_id === 'object' && item.product_id !== null ? (item.product_id as ProductRow) : null;
    const amount = safeNum(item.amount);
    let unitPrice = ordQty > 0 ? (amount / ordQty) : 0;
    if (amount === 0 && product?.cost_per_unit) {
      unitPrice = Number(product.cost_per_unit);
    }
    return sum + (qty * unitPrice);
  }, 0);

  // ── Title & Picker Info ───────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(orderNo.toUpperCase(), margin, y);
  
  // Grand Total on Top Right
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Modern emerald green
  doc.text(`GRAND TOTAL: PHP ${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageW - margin, y, { align: 'right' });
  
  y += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Printed: ${date}`, pageW - margin, y, { align: 'right' });
  
  if (requestedDate) {
    y += 4;
    doc.text(`Requested At: ${requestedDate}`, pageW - margin, y, { align: 'right' });
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Picker: ${pickerName.toUpperCase()}`, margin, y);
  y += 5;

  if (salesmanName) {
    doc.setTextColor(0, 0, 0); // Changed from blue to black
    doc.text(`Salesman: ${salesmanName.toUpperCase()}`, margin, y);
    y += 5;
  }

  // Branch Info
  if (sourceBranch || targetBranch) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal'); // Changed from bold to normal
    doc.setTextColor(100, 100, 100);
    const branchText = `Source: ${sourceBranch || 'N/A'}   |   Target: ${targetBranch || 'N/A'}`;
    doc.text(branchText, margin, y);
    y += 5;
  }

  y += 2;

  // ── Table Header ──────────────────────────────────────────────
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCT DESCRIPTION', margin + 12, y);
  doc.text('UNIT', pageW - margin - 35, y, { align: 'center' });
  doc.text('QTY', pageW - margin - 10, y, { align: 'center' });
  y += 3;
  
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Grouping & Body ───────────────────────────────────────────
  // Group by Brand/Supplier
  const groups: Record<string, OrderGroupItem[]> = {};
  items.forEach(item => {
    const product = typeof item.product_id === 'object' ? (item.product_id as ProductRow) : null;
    const brand = typeof product?.product_brand === 'object' ? product.product_brand?.brand_name : 'No Brand';
    const supplierObj = product?.product_per_supplier?.[0]?.supplier_id;
    const supplier = typeof supplierObj === 'object' ? supplierObj.supplier_shortcut : (supplierObj || 'N/A');
    
    const supplierName = supplier === 'N/A' || !supplier ? 'UNASSIGNED SUPPLIER' : supplier;
    const brandName = brand === 'No Brand' || !brand ? 'UNASSIGNED BRAND' : brand;
    const groupKey = `${supplierName} | ${brandName}`;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  });

  Object.entries(groups).forEach(([groupTitle, groupItems]) => {
    // Check for page break
    if (y > pageH - 40) {
      doc.addPage();
      y = 20;
    }

    // Group Title (Supplier | Brand)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(groupTitle.toUpperCase(), margin, y);
    y += 4;
    
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Items in Group
    groupItems.forEach(item => {
      if (y > pageH - 30) {
        doc.addPage();
        y = 20;
      }

      const product = typeof item.product_id === 'object' ? (item.product_id as ProductRow) : null;
      const productName = product?.product_name || `ID: ${item.product_id}`;
      const unit = (typeof product?.unit_of_measurement === 'object' ? product.unit_of_measurement?.unit_name : 'PCS') || 'PCS';
      const qty = safeNum(item.allocated_quantity ?? item.ordered_quantity);

      // Checkbox
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.2);
      doc.rect(margin, y - 3.5, 4, 4);

      // Product Info
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(productName, margin + 12, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text(unit, pageW - margin - 35, y, { align: 'center' });
      doc.text(String(qty), pageW - margin - 10, y, { align: 'center' });
      
      y += 4;
      doc.setDrawColor(245, 245, 245);
      doc.line(margin + 12, y, pageW - margin, y);
      y += 6;
    });

    // ── Calculate Group Subtotal ──
    const groupSubtotal = groupItems.reduce((sum, item) => {
      const qty = safeNum(item.allocated_quantity ?? item.ordered_quantity);
      const ordQty = safeNum(item.ordered_quantity);
      const product = typeof item.product_id === 'object' && item.product_id !== null ? (item.product_id as ProductRow) : null;
      const amount = safeNum(item.amount);
      let unitPrice = ordQty > 0 ? (amount / ordQty) : 0;
      if (amount === 0 && product?.cost_per_unit) {
        unitPrice = Number(product.cost_per_unit);
      }
      return sum + (qty * unitPrice);
    }, 0);

    if (y > pageH - 25) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin + 12, y - 2, pageW - margin, y - 2);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(`SUBTOTAL FOR ${groupTitle.toUpperCase()}:`, margin + 12, y);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`PHP ${groupSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageW - margin, y, { align: 'right' });
    y += 8;
    
    y += 4; // Gap between groups
  });

  // ── Grand Total (Below table) ─────────────────────────────────
  if (y > pageH - 45) {
    doc.addPage();
    y = 20;
  }

  y += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentW, 12, 1, 1, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL AMOUNT:', margin + 5, y + 8);

  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Modern emerald green
  doc.text(`PHP ${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageW - margin - 5, y + 8.5, { align: 'right' });
  doc.setTextColor(0, 0, 0); // Reset text color
  y += 20;

  // ── Reference Info (Below table) ──────────────────────────────
  if (y > pageH - 55) {
    doc.addPage();
    y = 20;
  }

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ORDER DETAILS', margin, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Reference No:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(orderNo.toUpperCase(), margin + 25, y);
  
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Encoder Name:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(pickerName.toUpperCase(), margin + 25, y);
  y += 2;

  // ── Signature Section ─────────────────────────────────────────
  const sigY = Math.max(y + 16, pageH - 40);
  const sigW = (contentW - 40) / 2;

  // Picker Confirmation
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, sigY, margin + sigW, sigY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(pickerName.toUpperCase(), margin, sigY - 2);
  
  doc.setFontSize(7);
  doc.text('PICKER CONFIRMATION', margin, sigY + 5);

  // Verification Officer
  doc.line(pageW - margin - sigW, sigY, pageW - margin, sigY);
  doc.text('VERIFICATION OFFICER', pageW - margin, sigY + 5, { align: 'right' });

  return doc;
}

/**
 * Generates a Receiving Checklist PDF.
 */
export function generateStockTransferReceivingPDF(data: ReceivingPDFData): jsPDF {
  const { orderNo, checkedBy, date, items, companyData, sourceBranch, targetBranch, salesmanName } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;

  let y = drawCorporateHeader(doc, companyData, margin, pageW);

  // ── Title & Metadata ───────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECKLIST (PER DISPATCH PLAN)', margin, y);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
   doc.text(`Checked By: ${checkedBy.toUpperCase()}`, pageW - margin, y, { align: 'right' });
  y += 6;

  // Secondary Info
  doc.setFontSize(9);
  doc.text(`TR#: ${orderNo}`, margin, y);
   doc.text(`Received At: ${date}`, pageW - margin, y, { align: 'right' });
  y += 5;

  if (salesmanName) {
    doc.setTextColor(0, 0, 0); // Changed from blue to black
    doc.text(`Salesman: ${salesmanName.toUpperCase()}`, margin, y);
    y += 5;
  }

  if (sourceBranch || targetBranch) {
    doc.text(`Source: ${sourceBranch || 'N/A'}`, margin, y);
    doc.text(`Target: ${targetBranch || 'N/A'}`, pageW - margin, y, { align: 'right' });
    y += 5;
  }
  y += 5;

  // ── Table ─────────────────────────────────────────────────────
  const rows = items.map((item) => {
    const product = typeof item.product_id === 'object' ? (item.product_id as ProductRow) : null;
    return [
      product?.product_name || `ID: ${item.product_id}`,
      (typeof product?.unit_of_measurement === 'object' ? product.unit_of_measurement?.unit_name : 'PCS') || 'PCS',
      product?.product_code || '---',
      String(item.receivedQty || 0),
      String(item.allocated_quantity || 0),
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Product', 'Unit', 'Barcode', 'Received', 'Expected']],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
  });

  return doc;
}
