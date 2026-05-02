import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, DiscountType } from '../types';
import { money } from '../utils/format';
import { PdfEngine } from '@/components/pdf-layout-design/PdfEngine';
import { CompanyData } from '@/components/pdf-layout-design/types';
import { pdfTemplateService } from '@/components/pdf-layout-design/services/pdf-template';

export interface PrintData {
  po: PurchaseOrder;
  discountTypes: DiscountType[];
}

// jsPDF core fonts don't support the Peso sign (₱) out of the box (they print as ±).
// We'll replace it with "PHP" text for the PDF output.
const safeMoney = (val: number, currency = "PHP") => {
    return money(val, currency).replace(/₱/g, "PHP ");
};

export async function generatePostingPOPrint(data: PrintData): Promise<jsPDF> {
  const { po, discountTypes } = data;

  // --- 1. FETCH COMPANY DATA & TEMPLATE ---
  let companyData: CompanyData | null = null;
  try {
      const resp = await fetch("/api/pdf/company");
      if (resp.ok) {
          const body = await resp.json();
          companyData = body?.data?.[0] || (Array.isArray(body?.data) ? null : body?.data);
      }
  } catch (err) {
      console.warn("Failed to fetch company data for PDF:", err);
  }
  if (!companyData) companyData = {} as CompanyData;

  const templates = await pdfTemplateService.fetchTemplates();
  const template = templates.find(t => t.name === "MEN2") 
                || templates.find(t => t.name.toLowerCase().includes("men2")) 
                || templates[0];
  const templateName = template?.name || "MEN2";

  // --- 2. GENERATE PDF WITH FRAME ---
  return await PdfEngine.generateWithFrame(templateName, companyData, (doc, startY, config) => {
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = config.margins?.left || 14;
      let y = startY + 5;

      /* ── Section Title ─────────────────────────────────────────────── */
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('POSTING OF PO DETAILS', pageW / 2, y, { align: 'center' });
      y += 8;

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

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(po.supplier?.name || "Unknown Supplier", col1x, y);

      const statusText = po.status || 'Unknown';
      const isReceived = statusText.toLowerCase() === 'received' || statusText.toLowerCase() === 'closed';
      
      doc.setFontSize(8);
      doc.setTextColor(isReceived ? 22 : 194, isReceived ? 163 : 120, isReceived ? 74 : 10);
      doc.text(statusText.toUpperCase(), col2x, y);
      
      y += 8;

      // Row 2: Date | PO Number
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('CREATED DATE', col1x, y);
      doc.text('PO NUMBER', col2x, y);
      y += 4;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-PH') : "—", col1x, y);
      doc.text(po.poNumber || 'Unknown PO', col2x, y);
      y += 10;

      /* ── Items Tables (Per Branch) ───────────────────────────── */
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("Allocations Breakdown", margin, y);
      y += 2;

      (po.allocations || []).forEach(alloc => {
        if (!alloc.items.length) return;
        
        y += 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(`Branch: ${alloc.branch?.name || "Unknown"}`, margin, y);
        y += 2;

        const rows = alloc.items.map((item, i) => {
            const uprice = item.unitPrice || 0;
            const qty = item.expectedQty > 0 && item.receivedQty === 0 ? item.expectedQty : (item.receivedQty || item.expectedQty || 0);
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
            styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0], lineColor: [220, 220, 220] },
            headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 8 },
                1: { cellWidth: 25, fontStyle: 'bold' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 12, halign: 'right' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 35, halign: 'right', textColor: [80, 80, 80] },
                6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
            },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 4;
      });

      /* ── Financial Summary ─────────────────────────────────── */
      if (y + 40 > pageH) {
          doc.addPage();
          y = (config.bodyStart || 35) + 5;
      }
      
      y += 4;
      const summaryW = 75;
      const summaryX = pageW - margin - summaryW; 
      
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
        
        const valPrefix = isDiscount ? "-" : "";
        const valStr = `${valPrefix}${safeMoney(value, cur)}`;
        doc.text(valStr, pageW - margin, y, { align: 'right' });
        y += 5;
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
      };

      const computedTotalDiscount = (po.allocations || []).reduce((sum, alloc) => {
          return sum + alloc.items.reduce((itemSum, it) => {
              const uprice = it.unitPrice || 0;
              const qty = it.receivedQty || it.expectedQty || 0;
              const gross = it.grossAmount || (uprice * qty);
              
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
      if (Number(po.vatAmount) > 0) addLine('VAT amount:', po.vatAmount || 0);
      if (Number(po.withholdingTaxAmount) > 0) addLine('EWT amount:', po.withholdingTaxAmount || 0, false, true);
      
      y += 2;
      doc.setFontSize(10);
      addLine('GRAND TOTAL:', po.totalAmount || 0, true);

      // Standardized Footnote
      y += 2;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Note: VAT and EWT figures are for reference and have not been deducted from the total.', summaryX - 15, y);

      /* ── Document Footer ─────────────────────────────────────── */
      const footerY = doc.internal.pageSize.getHeight() - 8;
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      const printDate = new Date().toLocaleString('en-PH');
      doc.text(
        `Generated on ${printDate} · VOS Web Supply Chain Management System`,
        pageW / 2,
        footerY,
        { align: 'center' },
      );
  });
}
