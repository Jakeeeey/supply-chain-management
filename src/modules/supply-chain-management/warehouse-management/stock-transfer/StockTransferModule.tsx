'use client';

import React, { KeyboardEvent, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, CheckCircle2, Printer, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { useStockTransfer, getBranchLabel } from './hooks/useStockTransfer';
import StockTransferTable from './components/StockTransferTable';
import StockTransferPrintPreview from './components/StockTransferPrintPreview';

export default function StockTransferModule() {
  const {
    branches,
    loading,
    sourceBranch,
    setSourceBranch,
    targetBranch,
    setTargetBranch,
    leadDate,
    setLeadDate,
    rfidInput,
    setRfidInput,
    scannedItems,
    handleRfidScan,
    updateQty,
    reset,
    confirmTransfer,
    orderNo,
    status,
  } = useStockTransfer();

  const [showPreview, setShowPreview] = useState(false);

  /* ── Helpers ─────────────────────────────────────────── */
  const sourceBranchLabel = branches.find((b) => b.id.toString() === sourceBranch)
    ? getBranchLabel(branches.find((b) => b.id.toString() === sourceBranch)!)
    : sourceBranch || '—';

  const targetBranchLabel = branches.find((b) => b.id.toString() === targetBranch)
    ? getBranchLabel(branches.find((b) => b.id.toString() === targetBranch)!)
    : targetBranch || '—';

  const onRfidKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRfidScan();
  };

  const handleConfirm = () => {
    if (!sourceBranch || !targetBranch || !leadDate) {
      toast.error('Incomplete Form', {
        description: 'Please fill out Source Branch, Target Branch, and Lead Date.',
      });
      return;
    }
    if (scannedItems.length === 0) {
      toast.error('No Items', {
        description: 'Scan at least one RFID tag to add products.',
      });
      return;
    }
    confirmTransfer();
    toast.success('Transfer Confirmed', {
      description: `${scannedItems.length} product(s) queued for transfer.`,
    });
  };

  const handlePrint = () => setShowPreview(true);

  /* ── Render ───────────────────────────────────────────── */
  return (
    <>
      {/* ═══════════════════════════════════════════════
          SCREEN LAYOUT  (hidden on print)
      ═══════════════════════════════════════════════ */}
      <div className="print:hidden p-6 space-y-6 max-w-screen-xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Stock Transfer Module
        </h1>

        {/* ── Header Card ── */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Source Branch */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Source Branch <span className="text-destructive">*</span>
              </label>
              {loading ? (
                <div className="h-10 rounded-md bg-muted/30 animate-pulse" />
              ) : (
                <Select value={sourceBranch} onValueChange={setSourceBranch}>
                  <SelectTrigger className="h-10 text-sm bg-background border-border">
                    <SelectValue placeholder="Select source branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.length > 0 ? (
                      branches.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {getBranchLabel(b)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="main">Main Warehouse</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Target Branch */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Target Branch <span className="text-destructive">*</span>
              </label>
              {loading ? (
                <div className="h-10 rounded-md bg-muted/30 animate-pulse" />
              ) : (
                <Select value={targetBranch} onValueChange={setTargetBranch}>
                  <SelectTrigger className="h-10 text-sm bg-background border-border">
                    <SelectValue placeholder="Select target branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.length > 0 ? (
                      branches.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {getBranchLabel(b)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="main">Main Warehouse</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Lead Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Lead Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="h-10 text-sm bg-background border-border"
              />
            </div>

            {/* RFID Scan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Scan RFID Tag
              </label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. STB15088"
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value)}
                  onKeyDown={onRfidKeyDown}
                  className="h-10 pl-9 text-sm bg-background border-border"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">
                Press <kbd className="font-mono">Enter</kbd> to scan
              </p>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="flex items-center justify-center h-40 border border-border rounded-xl bg-card">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <StockTransferTable items={scannedItems} onQtyChange={updateQty} />
        )}

        {/* ── Action Row ── */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={reset} className="gap-2 border-border shadow-none">
            <RefreshCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-none font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Transfer
          </Button>
        </div>

        {/* ── Print Document ── */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="gap-2 border-border shadow-none text-sm"
          >
            <Printer className="w-4 h-4" />
            Print Document
          </Button>
        </div>
      </div>

      {/* ── Print Preview Dialog ── */}
      <StockTransferPrintPreview
        open={showPreview}
        onClose={() => setShowPreview(false)}
        orderNo={orderNo}
        status={status}
        sourceBranchLabel={sourceBranchLabel}
        targetBranchLabel={targetBranchLabel}
        leadDate={leadDate}
        scannedItems={scannedItems}
      />
    </>
  );
}

