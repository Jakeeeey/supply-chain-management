'use client';

import React, { KeyboardEvent, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Printer, ScanLine, Loader2, CheckCircle2, Radar, ChevronLeft, ChevronRight, ServerCrash, RefreshCcw } from 'lucide-react';
import { useStockTransferDispatching } from './hooks/useStockTransferDispatching';
import { cn } from '@/lib/utils';
import { OrderSelectionModal } from '../components/OrderSelectionModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StockTransferDispatchingModule() {
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
    updateLoosePackQty,
    refresh,
  } = useStockTransferDispatching();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when group changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrderNo]);

  const totalItems = selectedGroup?.items.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = selectedGroup?.items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  const [rfidInput, setRfidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const rfidBuffer = React.useRef('');

  // ── Global RFID listener: no click needed ──
  // Accumulates keystrokes from the hardware reader and fires on Enter.
  React.useEffect(() => {
    if (!selectedOrderNo) return;

    const handleGlobalKey = async (e: globalThis.KeyboardEvent) => {
      // Ignore modifier-key-only presses
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
        // Accumulate printable characters
        rfidBuffer.current += e.key;
        setRfidInput(rfidBuffer.current);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderNo, isScanning]);

  const isAllScanned = selectedGroup?.items.every((i: any) => {
    const targetQty = (i as any).allocated_quantity || i.ordered_quantity;
    return i.scannedQty >= targetQty;
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 print:p-0 print:m-0 print:block print:h-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            margin: 0.5cm; 
            size: auto;
          }
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          /* This is the main container for the content */
          .flex-1 { 
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            height: auto !important;
          }
          /* Ensure the card is the print boundaries */
          .card-print-root {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          footer, .print-hidden { display: none !important; }
        }
      ` }} />
      <div className="flex items-center justify-between space-y-2 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight">Stock Transfer Withdrawal</h2>
        <Button 
          variant="outline" 
          onClick={() => window.print()} 
          disabled={!selectedGroup}
          className="gap-2"
        >
          <Printer className="w-4 h-4" /> Print Picklist
        </Button>
      </div>

      <Card className="print:border-none print:shadow-none card-print-root">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:hidden">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Withdrawal Execution</CardTitle>
            <CardDescription>
              Fulfill approved stock transfers through granular picking and dispatching.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Truck className="h-8 w-8 text-muted-foreground" />
            {selectedGroup && (
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                selectedGroup.status === 'For Picking' && "bg-amber-100 text-amber-700 border border-amber-200",
                selectedGroup.status === 'Picking' && "bg-blue-100 text-blue-700 border border-blue-200 animate-pulse",
                selectedGroup.status === 'Picked' && "bg-emerald-100 text-emerald-700 border border-emerald-200"
              )}>
                Status: {selectedGroup.status}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="mt-4 space-y-6 print:p-0">
          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-3 py-4 print:hidden">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">Loading approved transfers...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
                <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
              </div>
              <div className="h-40 rounded-md bg-muted/30 animate-pulse" />
            </div>
          )}

          {/* Server Error Banner */}
          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center print:hidden">
              <ServerCrash className="w-12 h-12 text-destructive/70" />
              <div>
                <p className="font-bold text-destructive">Server Unreachable</p>
                <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
              </div>
              <Button variant="outline" onClick={() => refresh()} className="gap-2">
                <RefreshCcw className="w-4 h-4" /> Retry
              </Button>
            </div>
          )}

          {/* Top Control Bar */}
          {!loading && !fetchError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
            {/* Select Order */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Approved Transfer
              </label>
              <OrderSelectionModal 
                orderGroups={orderGroups}
                selectedOrderNo={selectedOrderNo}
                onSelect={setSelectedOrderNo}
                getBranchName={getBranchName}
              />
            </div>

            {/* Scanner Status Bar */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground group flex items-center gap-2">
                Scanner Status
                {selectedGroup && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </label>
              <div className={`relative flex flex-col gap-2 p-3 border-2 rounded-lg transition-all duration-500 ${
                !selectedGroup ? 'border-muted bg-muted/20' : isScanning ? 'border-amber-400 bg-amber-50/10' : 'border-emerald-500/50 bg-emerald-500/5'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radar className={cn("w-4 h-4", !selectedGroup ? "text-muted-foreground/40" : isScanning ? "text-amber-500 animate-spin" : "text-emerald-500 animate-pulse")} />
                    <span className={cn("text-xs font-bold uppercase tracking-widest", !selectedGroup ? "text-muted-foreground/40" : isScanning ? "text-amber-600" : "text-emerald-600")}>
                      {!selectedGroup ? 'Select order to start' : isScanning ? 'Processing...' : 'Listening for RFID...'}
                    </span>
                  </div>
                  {selectedGroup && (() => {
                    let totalScanned = 0;
                    let totalRequired = 0;
                    selectedGroup.items.forEach((i: any) => {
                      totalScanned += (i.scannedQty || 0);
                      totalRequired += ((i as any).allocated_quantity || i.ordered_quantity || 0);
                    });
                    return (
                      <span className={cn("text-lg font-black", totalScanned >= totalRequired ? "text-emerald-600" : "text-foreground")}>
                        {totalScanned} <span className="text-sm font-normal text-muted-foreground">/ {totalRequired}</span>
                      </span>
                    );
                  })()}
                </div>
                {selectedGroup && (() => {
                  let totalScanned = 0;
                  let totalRequired = 0;
                  selectedGroup.items.forEach((i: any) => {
                    totalScanned += (i.scannedQty || 0);
                    totalRequired += ((i as any).allocated_quantity || i.ordered_quantity || 0);
                  });
                  const pct = totalRequired > 0 ? Math.round((totalScanned / totalRequired) * 100) : 0;
                  return (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  );
                })()}
                {rfidInput && (
                  <p className="text-[10px] font-mono text-muted-foreground truncate">Reading: {rfidInput}</p>
                )}
              </div>
            </div>
          </div>
          )}

          <div className="hidden print:block mb-6 text-center">
            <h1 className="text-2xl font-bold uppercase">Stock Transfer Withdrawal</h1>
            {selectedGroup && <p className="text-lg mt-2 font-mono">{selectedGroup.orderNo}</p>}
          </div>

          {/* Details & Actions */}
          {selectedGroup && (
            <div className="space-y-6 border rounded-xl overflow-hidden shadow-sm print:border-none print:shadow-none">
              <div className="bg-muted/30 p-4 border-b print:bg-transparent print:border-b-2 print:border-black">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider print:text-black">Source Branch</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.sourceBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider print:text-black">Target Branch</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.targetBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider print:text-black">Lead Date</p>
                    <p className="font-medium text-sm">{selectedGroup.leadDate || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider print:text-black">Date Requested</p>
                    <p className="font-medium text-sm">{new Date(selectedGroup.dateRequested).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 print:p-0">
                <Table>
                  <TableHeader className="bg-muted/50 print:bg-transparent">
                    <TableRow className="border-b print:border-black">
                      <TableHead className="text-xs uppercase font-bold print:text-black">Product Name</TableHead>
                      <TableHead className="text-xs uppercase font-bold print:text-black">Unit</TableHead>
                      <TableHead className="text-xs uppercase font-bold print:text-black">Allocated Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold print:text-black">Available</TableHead>
                      <TableHead className="text-xs uppercase font-bold print:text-black">Scanned / Packed</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right print:text-black">Amount</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right print:hidden">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: any) => {
                      const targetQty = (item as any).allocated_quantity || item.ordered_quantity;
                      const complete = item.scannedQty >= targetQty;
                      const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
                      const originalId = product ? (product.product_id || product.id) : item.product_id;
                      const productName = product?.product_name || `PRD-${originalId}`;

                      return (
                        <TableRow key={item.id} className="print:border-b print:border-gray-200">
                          <TableCell className="py-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{productName}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">ID: {String(originalId || 'N/A')}</span>
                              {item.isLoosePack && (
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded w-fit mt-1 font-bold">LOOSE PACK</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className={cn(
                              (Number(product?.unit_of_measurement?.unit_id) === 1) && "font-bold",
                              (Number(product?.unit_of_measurement?.unit_id) === 2) && "italic",
                              (Number(product?.unit_of_measurement?.unit_id) === 3) && "font-bold italic"
                            )}>
                              {product?.unit_of_measurement?.unit_name || 'unit'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{targetQty}</TableCell>
                          <TableCell className="text-sm font-medium text-muted-foreground italic">
                            {item.qtyAvailable ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm font-bold">
                            {item.isLoosePack ? (
                              <Input
                                type="number"
                                className="h-8 w-20 text-center"
                                value={item.scannedQty}
                                onChange={(e) => updateLoosePackQty((originalId as number), Number(e.target.value))}
                                max={targetQty}
                                min={0}
                              />
                            ) : (
                              <span className={complete ? 'text-emerald-600' : 'text-amber-600'}>
                                {item.scannedQty}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-primary">
                            ₱{Number(item.amount || 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}
                          </TableCell>
                          <TableCell className="text-right text-sm print:hidden">
                            {complete ? (
                              <span className="inline-flex items-center text-emerald-600 text-xs font-bold uppercase tracking-wide">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Ready
                              </span>
                            ) : (
                              <span className="text-amber-600 text-xs font-bold uppercase tracking-wide">
                                Pending Scan
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="print:border-b print:border-black bg-muted/30">
                      <TableCell colSpan={4} className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Total Amount</TableCell>
                      <TableCell className="text-right text-sm font-bold text-primary">
                        ₱{selectedGroup.items.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}
                      </TableCell>
                      <TableCell className="print:hidden" />
                    </TableRow>
                  </TableFooter>
                </Table>

                {/* Pagination Controls */}
                <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-muted/20 print:hidden">
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
                      Rows per page
                    </div>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] text-xs font-medium border-muted-foreground/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 30, 50, 100].map((v) => (
                          <SelectItem key={v} value={String(v)} className="text-xs">
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Showing {totalItems === 0 ? 0 : Math.min(itemsPerPage * (currentPage - 1) + 1, totalItems)} to {Math.min(itemsPerPage * currentPage, totalItems)} of {totalItems} Products
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-8 px-3"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 p-0 ${currentPage === page ? 'shadow-sm border-primary/30' : ''}`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-8 px-3"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                  <div className="text-xs text-muted-foreground">
                    {!isAllScanned && (
                      <span className="text-amber-600 font-medium">Please scan all required items before withdrawing.</span>
                    )}
                  </div>
                  
                  <Button 
                    className={cn(
                      "w-full sm:w-auto",
                      selectedGroup.status === 'Picked' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary"
                    )}
                    disabled={processing || selectedGroup.status !== 'Picked'}
                    onClick={() => dispatchOrder(selectedGroup.orderNo)}
                  >
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedGroup.status === 'Picked' ? 'Confirm Dispatch (For Loading)' : 'Picking in Progress...'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
