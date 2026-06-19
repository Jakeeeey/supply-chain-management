'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X, Loader2, FileText, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SummaryOrderGroup } from '../hooks/use-stock-transfer-summary';
import { CompanyData } from '../../types/stock-transfer.types';
import { PrintTemplate } from './PrintTemplate';

import { ScrollArea } from '@/components/ui/scroll-area';

interface SummaryPrintPreviewProps {
  open: boolean;
  onClose: () => void;
  group: SummaryOrderGroup | null;
  getBranchName: (id: number | null) => string;
  getUserName: (id: number | null | undefined) => string;
  getUnitName: (id: unknown) => string;
  salesmanName?: string;
}

export function SummaryPrintPreview({
  open,
  onClose,
  group,
  getBranchName,
  getUserName,
  getUnitName,
  salesmanName,
}: SummaryPrintPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  // Fetch company data
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch('/api/pdf/company');
        if (res.ok) {
          const result = await res.json();
          const company = result.data?.[0] || (Array.isArray(result.data) ? null : result.data);
          setCompanyData(company);
        }
      } catch (err) {
        console.error('Error fetching company data:', err);
      }
    };
    fetchCompany();
  }, []);

  const generatePDF = useCallback(async () => {
    if (!group) return null;

    try {
      setGenerating(true);
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 15;

      // Corporate Header
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
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('VOS WEB SUPPLY CHAIN', margin, y + 5);
        y += 15;
      }

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 10;

      // Document Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('STOCK TRANSFER SLIP', margin, y);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`NO: ${group.orderNo}`, pageW - margin, y, { align: 'right' });
      
      y += 8;

      if (salesmanName) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`SALESMAN: ${salesmanName.toUpperCase()}`, pageW - margin, y - 2, { align: 'right' });
        y += 4;
      }

      // Info Grid
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y - 3, contentW, 14, 1.5, 1.5, 'S');

      const colW = contentW / 4;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('SOURCE BRANCH', margin + 3, y + 2);
      doc.text('TARGET BRANCH', margin + colW + 3, y + 2);
      doc.text('DATE REQUESTED', margin + colW * 2 + 3, y + 2);
      doc.text('STATUS', margin + colW * 3 + 3, y + 2);

      // Grid dividers
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin + colW, y - 3, margin + colW, y + 11);
      doc.line(margin + colW * 2, y - 3, margin + colW * 2, y + 11);
      doc.line(margin + colW * 3, y - 3, margin + colW * 3, y + 11);
      doc.line(margin, y + 4, pageW - margin, y + 4);

      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        try {
          return new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(dateStr));
        } catch { return dateStr; }
      };

      doc.text(getBranchName(group.sourceBranch), margin + 3, y);
      doc.text(getBranchName(group.targetBranch), margin + colW + 3, y);
      doc.text(formatDate(group.dateRequested), margin + colW * 2 + 3, y);
      doc.text((group.status || 'PENDING').toUpperCase(), margin + colW * 3 + 3, y);
      
      y += 10;

      // Table
      const grandTotal = group.totalAmount;
      const rows = group.items.map((item) => {
         const product = typeof item.product_id === 'object' && item.product_id !== null 
           ? (item.product_id as { product_brand?: { brand_name?: string }, product_name?: string, unit_of_measurement?: unknown }) 
           : null;
         const brand = typeof product?.product_brand === 'object' ? product.product_brand?.brand_name : 'N/A';
         const unit = getUnitName(product?.unit_of_measurement);
         return [
           brand || 'N/A',
           product?.product_name || `ID: ${item.product_id}`,
           unit,
           String(item.ordered_quantity),
           `PHP ${Number(item.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
         ];
      });

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Brand', 'Product Name', 'Unit', 'Qty', 'Total']],
        body: rows.length > 0 ? rows : [['No items found.', '', '', '', '']],
        foot: rows.length > 0 ? [[
          { content: '', colSpan: 3, styles: { fillColor: [255, 255, 255], lineColor: [255, 255, 255] } },
          { content: 'GRAND TOTAL', colSpan: 1, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8, fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: { top: 0.5 } } },
          { content: `PHP ${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, colSpan: 1, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, fillColor: [255, 255, 255], textColor: [5, 150, 105], lineColor: [0, 0, 0], lineWidth: { top: 0.5 } } }
        ]] : [],
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
          textColor: [0, 0, 0],
          lineColor: [238, 238, 238],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineColor: [0, 0, 0],
          lineWidth: { bottom: 0.5 },
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      // Signatures
      if (y > pageH - 40) {
        doc.addPage();
        y = 20;
      }

      const sigs = [
        { label: 'PREPARED BY', value: getUserName(group.encoderId), date: group.dateRequested },
        { label: 'APPROVED BY', value: group.dateApproved ? getUserName(group.approverId) : '', date: group.dateApproved },
        { label: 'RECEIVED BY', value: group.dateReceived ? getUserName(group.receiverId) : '', date: group.dateReceived },
      ];

      const sigW = (contentW - 40) / 3;
      
      sigs.forEach((sig, i) => {
        const x = margin + i * (sigW + 20);
        const midX = x + sigW / 2;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(sig.value || '', midX, y, { align: 'center' });
        
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.line(x, y + 2, x + sigW, y + 2);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(sig.label, midX, y + 7, { align: 'center' });

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const dateStr = sig.date ? formatDate(sig.date) : '—';
        doc.text(`Date: ${dateStr}`, midX, y + 11, { align: 'center' });
      });

      // Footer
      const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(238, 238, 238);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Printed: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} · VOS Web Supply Chain Management System`, margin, pageH - 8);
        doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
      }

      setGenerating(false);
      return doc;
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setGenerating(false);
      return null;
    }
  }, [group, companyData, getBranchName, getUnitName, getUserName, salesmanName]);

  const handlePrint = useCallback(async () => {
    const doc = await generatePDF();
    if (doc) {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }, [generatePDF]);

  const handleSave = useCallback(async () => {
    const doc = await generatePDF();
    if (doc) {
      const filename = `ST-SLIP-${group?.orderNo || 'UNSAVED'}.pdf`;
      doc.save(filename);
    }
  }, [generatePDF, group]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="flex flex-col gap-0 p-0 overflow-hidden bg-background border-border shadow-2xl h-[95vh] !max-w-[95vw]"
      >
        <DialogHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="text-sm font-bold tracking-tight text-foreground flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Stock Transfer Slip Preview
              {group?.orderNo && <span className="font-mono text-xs opacity-50 ml-2">#{group.orderNo}</span>}
            </div>
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-[9px] uppercase font-bold tracking-tight">
               <AlertCircle className="w-3 h-3" />
               Secure Image Export
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative bg-muted/50">
          <ScrollArea className="h-full w-full">
            <div className="flex flex-col items-center p-8 min-h-full">
              {/* Actual Live Preview - No waiting! */}
              <div className="shadow-2xl mb-8">
                {group && (
                  <PrintTemplate 
                    ref={templateRef}
                    group={group}
                    companyData={companyData}
                    getBranchName={getBranchName}
                    getUserName={getUserName}
                    getUnitName={getUnitName}
                    salesmanName={salesmanName}
                  />
                )}
              </div>
            </div>
          </ScrollArea>

          {generating && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-50">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-[10px] uppercase font-black tracking-widest text-foreground">
                Generating Secure PDF...
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-card shrink-0 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-2 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={generating}
            className="gap-2 border-border shadow-none text-[10px] font-bold uppercase tracking-widest"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download Secure PDF
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            disabled={generating}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none font-bold text-[10px] uppercase tracking-widest"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            Print Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
