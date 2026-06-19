'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X, Loader2, ClipboardList } from 'lucide-react';
import { OrderGroupItem, CompanyData } from '../../types/stock-transfer.types';
import { generateStockTransferReceivingPDF } from '../../utils/generate-stock-transfer-pdf';

interface StockTransferReceivingPreviewProps {
  open: boolean;
  onClose: () => void;
  orderNo: string;
  checkedBy: string;
  items: OrderGroupItem[];
  sourceBranch?: string;
  targetBranch?: string;
}

export function StockTransferReceivingPreview({
  open,
  onClose,
  orderNo,
  checkedBy,
  items,
  sourceBranch,
  targetBranch,
}: StockTransferReceivingPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(open);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  useEffect(() => {
    setGenerating(open);
  }, [open]);

  // Fetch company data on mount
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

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const doc = generateStockTransferReceivingPDF({
        orderNo,
        checkedBy,
        date: new Date().toLocaleString('en-PH'),
        items,
        companyData: companyData || null,
        sourceBranch,
        targetBranch,
      });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setGenerating(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [open, orderNo, checkedBy, items, companyData, sourceBranch, targetBranch]);

  const handleClose = useCallback(() => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    onClose();
  }, [pdfUrl, onClose]);

  const handlePrint = useCallback(() => {
    const doc = generateStockTransferReceivingPDF({
      orderNo,
      checkedBy,
      date: new Date().toLocaleString('en-PH'),
      items,
      companyData,
      sourceBranch,
      targetBranch,
    });
    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [orderNo, checkedBy, items, companyData, sourceBranch, targetBranch]);

  const handleSave = useCallback(() => {
    const doc = generateStockTransferReceivingPDF({
      orderNo,
      checkedBy,
      date: new Date().toLocaleString('en-PH'),
      items,
      companyData,
      sourceBranch,
      targetBranch,
    });
    const filename = `RECEIVING-${orderNo || 'UNSAVED'}.pdf`;
    doc.save(filename);
  }, [orderNo, checkedBy, items, companyData, sourceBranch, targetBranch]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="flex flex-col gap-0 p-0 overflow-hidden bg-card border-border shadow-2xl h-[95vh] !max-w-[95vw] pointer-events-auto"
      >
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
          <DialogTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Stock Transfer Receiving Preview
            {orderNo && <span className="font-mono text-xs opacity-50 ml-2">#{orderNo}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-muted/50 overflow-hidden relative">
          {generating || !pdfUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground animate-pulse">Building Document...</span>
            </div>
          ) : (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              title="Receiving Preview"
              className="w-full h-full border-none"
            />
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-card shrink-0 flex items-center justify-between sm:justify-between sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="gap-2 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={generating}
              className="gap-2 border-border shadow-none text-[10px] font-bold uppercase tracking-widest"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              disabled={generating}
              className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-none font-bold text-[10px] uppercase tracking-widest"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
