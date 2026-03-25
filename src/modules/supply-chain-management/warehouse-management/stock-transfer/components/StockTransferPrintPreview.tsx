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
import { Printer, Download, X, Loader2 } from 'lucide-react';
import { ScannedItem } from '../types';
import { generateStockTransferPDF } from '../utils/generateStockTransferPDF';

interface StockTransferPrintPreviewProps {
  open: boolean;
  onClose: () => void;
  orderNo: string;
  status: string;
  sourceBranchLabel: string;
  targetBranchLabel: string;
  leadDate: string;
  scannedItems: ScannedItem[];
}

export default function StockTransferPrintPreview({
  open,
  onClose,
  orderNo,
  status,
  sourceBranchLabel,
  targetBranchLabel,
  leadDate,
  scannedItems,
}: StockTransferPrintPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(open);

  useEffect(() => {
    setGenerating(open);
  }, [open]);

  /** Re-generate PDF blob URL whenever props change and dialog is open */
  useEffect(() => {
    if (!open) return;

    // Small defer so the dialog renders first before heavy PDF work
    const timer = setTimeout(() => {
      const doc = generateStockTransferPDF({
        orderNo,
        status,
        sourceBranchLabel,
        targetBranchLabel,
        leadDate,
        scannedItems,
      });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setGenerating(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [open, orderNo, status, sourceBranchLabel, targetBranchLabel, leadDate, scannedItems]);

  /** Revoke blob URL on close to free memory */
  const handleClose = useCallback(() => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    onClose();
  }, [pdfUrl, onClose]);

  /** Print: regenerate with autoPrint flag and open in new tab */
  const handlePrint = useCallback(() => {
    const doc = generateStockTransferPDF({
      orderNo,
      status,
      sourceBranchLabel,
      targetBranchLabel,
      leadDate,
      scannedItems,
    });
    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Revoke after a short delay to allow browser to load it
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [orderNo, status, sourceBranchLabel, targetBranchLabel, leadDate, scannedItems]);

  /** Save as PDF: triggers browser file download */
  const handleSave = useCallback(() => {
    const doc = generateStockTransferPDF({
      orderNo,
      status,
      sourceBranchLabel,
      targetBranchLabel,
      leadDate,
      scannedItems,
    });
    const filename = `stock-transfer-slip${orderNo ? `-${orderNo}` : ''}.pdf`;
    doc.save(filename);
  }, [orderNo, status, sourceBranchLabel, targetBranchLabel, leadDate, scannedItems]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="flex flex-col gap-0 p-0 overflow-hidden"
        style={{ width: '90vw', maxWidth: '90vw', height: '95vh' }}
      >

        {/* ── Header ── */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-bold tracking-tight flex items-center gap-2">
            Print Preview — Stock Transfer Slip
            {orderNo && (
              <span className="text-muted-foreground font-normal text-xs">
                {orderNo}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── PDF Preview Area ── */}
        <div className="flex-1 bg-muted/50 overflow-hidden relative">
          {generating || !pdfUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Generating document…</span>
            </div>
          ) : (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              title="Stock Transfer Slip PDF Preview"
              className="w-full h-full border-none"
              style={{ display: 'block' }}
            />
          )}
        </div>

        {/* ── Footer Actions ── */}
        <DialogFooter className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="gap-1.5 text-muted-foreground text-sm"
          >
            <X className="w-4 h-4" />
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={generating}
              className="gap-1.5 border-border shadow-none text-sm"
            >
              <Download className="w-4 h-4" />
              Save as PDF
            </Button>

            <Button
              onClick={handlePrint}
              disabled={generating}
              className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 shadow-none font-bold text-sm"
            >
              <Printer className="w-4 h-4" />
              Print Document
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
