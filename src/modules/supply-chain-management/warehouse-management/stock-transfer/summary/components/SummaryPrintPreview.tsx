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
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
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
}

export function SummaryPrintPreview({
  open,
  onClose,
  group,
  getBranchName,
  getUserName,
  getUnitName,
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
    if (!templateRef.current || !group) return null;

    try {
      setGenerating(true);
      
      // 1. Convert HTML to PNG (Image)
      const dataUrl = await toPng(templateRef.current, {
        quality: 0.9,
        pixelRatio: 1.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      // 2. Create jsPDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (templateRef.current.offsetHeight * imgWidth) / templateRef.current.offsetWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      
      setGenerating(false);
      return pdf;
    } catch (err) {
      console.error('Failed to generate PDF image:', err);
      setGenerating(false);
      return null;
    }
  }, [group]);

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
