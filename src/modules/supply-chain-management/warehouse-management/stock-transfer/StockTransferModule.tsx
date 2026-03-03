'use client';

import React, { KeyboardEvent, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, RefreshCcw, CheckCircle2, Printer, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { useStockTransfer, getBranchLabel } from './hooks/useStockTransfer';
import StockTransferTable from './components/StockTransferTable';
import StockTransferPrintPreview from './components/StockTransferPrintPreview';
import { BranchCombobox } from './components/BranchCombobox';

export default function StockTransferModule() {
  const {
    branches,
    loading,
    confirming,
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
    removeItem,
    reset,
    confirmTransfer,
    isTransferConfirmed,
    orderNo,
    status,
  } = useStockTransfer();

  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  /* ── Helpers ─────────────────────────────────────────── */
  const sourceBranchLabel = branches.find((b) => b.id.toString() === sourceBranch)
    ? getBranchLabel(branches.find((b) => b.id.toString() === sourceBranch)!)
    : sourceBranch || '—';

  const targetBranchLabel = branches.find((b) => b.id.toString() === targetBranch)
    ? getBranchLabel(branches.find((b) => b.id.toString() === targetBranch)!)
    : targetBranch || '—';

  const onRfidKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const trimmed = rfidInput.trim();
    if (trimmed.length === 0) return;
    if (trimmed.length !== 24) {
      toast.error('Invalid RFID', {
        description: `RFID must be exactly 24 characters. Current length: ${trimmed.length}.`,
      });
      return;
    }
    handleRfidScan();
  };

  /** Validate then open the confirmation dialog */
  const handleConfirmClick = () => {
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
    setShowConfirmDialog(true);
  };

  /** Called when user clicks "Yes, Confirm" inside the dialog */
  const handleConfirmFinal = async () => {
    setShowConfirmDialog(false);
    try {
      await confirmTransfer();
      toast.success('Stock Transfer Confirmed', {
        description: `Transfer saved to database with status "requested".`,
      });
    } catch (err) {
      toast.error('Transfer Failed', {
        description: err instanceof Error ? err.message : 'Could not save to database.',
      });
    }
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
          Stock Transfer
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
                <BranchCombobox
                  branches={branches}
                  value={sourceBranch}
                  onChange={setSourceBranch}
                  placeholder="Select source branch"
                />
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
                <BranchCombobox
                  branches={branches}
                  value={targetBranch}
                  onChange={setTargetBranch}
                  placeholder="Select target branch"
                />
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
          <StockTransferTable items={scannedItems} onQtyChange={updateQty} onDelete={removeItem} />
        )}

        {/* ── Action Row ── */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={reset} className="gap-2 border-border shadow-none">
              <RefreshCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-2 border-border shadow-none"
            >
              <Printer className="w-4 h-4" />
              Print Document
            </Button>
            <Button
              onClick={handleConfirmClick}
              disabled={isTransferConfirmed || confirming}
              className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {confirming ? 'Saving...' : 'Confirm Transfer'}
            </Button>
          </div>
          {isTransferConfirmed && (
            <p className="text-[11px] text-muted-foreground text-right max-w-[320px]">
              You need to create a new source and target to be able to confirm another stock transfer.
            </p>
          )}
        </div>
      </div>

      {/* ── Confirm Transfer Dialog ── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure this is the final stock transfer? This action will save the transfer record
              and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFinal}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Yes, Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

