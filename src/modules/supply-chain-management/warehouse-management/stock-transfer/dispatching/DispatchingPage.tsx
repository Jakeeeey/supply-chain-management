'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Printer, ScanLine, Loader2, CheckCircle2, Radar } from 'lucide-react';
import { useStockTransferDispatch } from './hooks/use-stock-transfer-dispatch';
import { cn } from '@/lib/utils';
import type { OrderGroupItem, ProductRow, UnitOfMeasurement } from '../types/stock-transfer.types';

// Shared components
import { OrderSelectionModal } from '../shared/components/OrderSelectionModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function StockTransferDispatchView() {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    fetchError,
    dispatchOrder,
    handleScanRFID,
    getBranchName,
    markAsPicked,
    fetchingAvailable,
  } = useStockTransferDispatch();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Reset page when group changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrderNo]);

  const paginatedItems = selectedGroup?.items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  const [rfidInput, setRfidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const rfidBuffer = React.useRef('');

  // ── Global RFID listener ──
  React.useEffect(() => {
    if (!selectedOrderNo) return;

    const handleGlobalKey = async (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        const val = rfidBuffer.current.trim();
        rfidBuffer.current = '';
        setRfidInput('');
        if (!val || isScanning) return;
        setIsScanning(true);
        try {
          await handleScanRFID(val);
        } finally {
          setIsScanning(false);
        }
      } else if (e.key.length === 1) {
        rfidBuffer.current += e.key;
        setRfidInput(rfidBuffer.current);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [selectedOrderNo, isScanning, handleScanRFID]);

  const isAllScanned = selectedGroup?.items.every((i: OrderGroupItem) => {
    const targetQty = Math.max(0, i.allocated_quantity ?? i.ordered_quantity ?? 0);
    return (i.scannedQty || 0) >= targetQty;
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          .print-hidden { display: none !important; }
        }
      ` }} />
      <div className="flex items-center justify-between space-y-2 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Stock Withdrawal (RFID)</h2>
        <Button
          variant="outline"
          onClick={() => window.print()}
          disabled={!selectedGroup}
          className="gap-2 border-border shadow-none"
        >
          <Printer className="w-4 h-4" /> Print Picklist
        </Button>
      </div>

      <Card className="border-border shadow-none bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:hidden">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Execution & Picking</CardTitle>
            <CardDescription>
              Fulfill approved transfers through RFID scanning.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Truck className="h-8 w-8 text-muted-foreground/30" />
            {selectedGroup && (
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                selectedGroup.status === 'For Picking' && "bg-amber-100 text-amber-700 border-amber-200",
                selectedGroup.status === 'Picking' && "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
                selectedGroup.status === 'Picked' && "bg-emerald-100 text-emerald-700 border-emerald-200"
              )}>
                {selectedGroup.status}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="mt-4 space-y-6">
          {!loading && !fetchError && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group flex items-center gap-1.5">
                  Select Order
                </label>
                <OrderSelectionModal
                  orderGroups={orderGroups}
                  selectedOrderNo={selectedOrderNo}
                  onSelect={setSelectedOrderNo}
                  getBranchName={getBranchName}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group flex items-center gap-1.5">
                  Scanner Interface
                  {selectedGroup && <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </label>
                <div className={`relative flex flex-col gap-2 p-3 border rounded-lg transition-all duration-300 ${!selectedGroup ? 'border-border bg-muted/20' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radar className={cn("w-4 h-4", !selectedGroup ? "text-muted-foreground/30" : "text-emerald-500 animate-pulse")} />
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", !selectedGroup ? "text-muted-foreground/40" : "text-emerald-600")}>
                        {!selectedGroup ? 'Waiting for Selection' : isScanning ? 'Processing...' : 'Awaiting Hardware Input'}
                      </span>
                    </div>
                  </div>
                  {rfidInput && (
                    <p className="text-[9px] font-mono text-muted-foreground truncate opacity-70">Buffer: {rfidInput}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedGroup && (
            <div className="space-y-6 border border-border rounded-xl overflow-hidden shadow-sm bg-card/50">
              <div className="bg-muted/30 p-4 border-b border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Source</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.sourceBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.targetBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">{selectedGroup.orderNo}</p>
                    <p className="font-medium text-sm">Requested Transfer</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Unit</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Allocated</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Available</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Scanned</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right print:hidden">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: OrderGroupItem) => {
                      const targetQty = Math.max(0, item.allocated_quantity ?? item.ordered_quantity ?? 0);
                      const complete = (item.scannedQty || 0) >= targetQty;
                      const product = typeof item.product_id === 'object' && item.product_id !== null ? (item.product_id as ProductRow) : null;
                      const productName = product?.product_name || `PRD-${item.product_id}`;

                      return (
                        <TableRow key={item.id} className="border-b border-border/50">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{productName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">ID: {String((product?.product_id) || 'N/A')}</span>
                              {item.isLoosePack && (
                                <span className="text-[9px] bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded w-fit mt-1 font-bold">BYPASS SCAN</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-medium uppercase text-muted-foreground">
                            {typeof product?.unit_of_measurement === 'object' && product.unit_of_measurement !== null 
                              ? (product.unit_of_measurement as UnitOfMeasurement).unit_name 
                              : 'unit'}
                          </TableCell>
                          <TableCell className="text-sm text-center font-bold text-foreground">{targetQty}</TableCell>
                          <TableCell className="text-xs text-center font-medium font-mono text-muted-foreground italic">
                            {fetchingAvailable ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto text-primary" />
                            ) : (
                              Math.max(0, item.qtyAvailable ?? 0)
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <span className={cn("font-bold font-mono", complete ? 'text-emerald-500' : 'text-amber-500')}>
                              {item.scannedQty}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm print:hidden">
                            {complete ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                            ) : (
                              <ScanLine className="w-4 h-4 text-amber-500/50 ml-auto animate-pulse" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    {!isAllScanned ? (
                      <span className="text-amber-600/80 italic">Scanning in progress...</span>
                    ) : (
                      <span className="text-emerald-600">Verification Complete</span>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {selectedGroup.status === 'Picking' && !isAllScanned && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={processing}
                        onClick={() => markAsPicked(selectedGroup.orderNo)}
                        className="text-xs font-bold"
                      >
                        Force Complete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className={cn(
                        "w-full sm:w-auto font-bold text-xs shadow-none",
                        selectedGroup.status === 'Picked' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted text-muted-foreground"
                      )}
                      disabled={processing || selectedGroup.status !== 'Picked'}
                      onClick={() => dispatchOrder(selectedGroup.orderNo)}
                    >
                      {processing && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      Dispatch (For Loading)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
