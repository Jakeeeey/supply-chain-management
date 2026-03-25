'use client';

import React, { KeyboardEvent, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Printer, ScanLine, Loader2, CheckCircle2, Radar, ChevronLeft, ChevronRight } from 'lucide-react';
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
    dispatchOrder,
    handleScanRFID,
    getBranchName,
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
  const scannerRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the hidden scanner input
  React.useEffect(() => {
    if (selectedOrderNo && scannerRef.current) {
      const focusScanner = () => scannerRef.current?.focus();
      focusScanner();
      
      // Re-focus if user clicks away
      const interval = setInterval(focusScanner, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedOrderNo]);

  const [isScanning, setIsScanning] = useState(false);

  const onRfidKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    const val = e.currentTarget.value.trim();
    if (!val || isScanning) return;
    
    setRfidInput(''); // Clear immediately for next scan
    setIsScanning(true);
    try {
      await handleScanRFID(val);
    } finally {
      setIsScanning(false);
    }
  };

  const isAllScanned = selectedGroup?.items.every(i => i.scannedQty >= i.ordered_quantity);

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
            <CardTitle className="text-2xl">Ready for Withdrawal</CardTitle>
            <CardDescription>
              Scan RFIDs to fulfill approved stock transfers.
            </CardDescription>
          </div>
          <Truck className="h-8 w-8 text-muted-foreground" />
        </CardHeader>

        <CardContent className="mt-4 space-y-6 print:p-0">
          {/* Top Control Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
            {/* Select Order */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Approved Transfer
              </label>
              {loading ? (
                <div className="h-10 rounded-md bg-muted/30 animate-pulse" />
              ) : (
                <OrderSelectionModal 
                  orderGroups={orderGroups}
                  selectedOrderNo={selectedOrderNo}
                  onSelect={setSelectedOrderNo}
                  getBranchName={getBranchName}
                />
              )}
            </div>

            {/* Automated Scanner UI */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground group flex items-center gap-2">
                Scanner Status
                {selectedGroup && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </label>
              <div 
                className={`relative flex items-center justify-center h-10 border-2 border-dashed rounded-lg transition-all duration-500 ${
                  selectedGroup 
                    ? 'border-emerald-500/50 bg-emerald-500/5 cursor-default' 
                    : 'border-muted bg-muted/20 grayscale'
                }`}
                onClick={() => scannerRef.current?.focus()}
              >
                {selectedGroup ? (
                  <div className="flex items-center gap-3">
                    <Radar className={cn("w-5 h-5 text-emerald-500", !isScanning && "animate-spin-slow", isScanning && "animate-pulse")} />
                    <span className="text-sm font-medium text-emerald-600 animate-pulse">
                      {isScanning ? 'PROCESSING SCAN...' : 'READY TO SCAN RFID'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <ScanLine className="w-4 h-4" />
                    <span className="text-xs uppercase font-bold tracking-widest">Select order to pulse scanner</span>
                  </div>
                )}
                
                {/* Hidden input to catch reader output */}
                <input
                  ref={scannerRef}
                  type="text"
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value)}
                  onKeyDown={onRfidKeyDown}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-default"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

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
                      <TableHead className="text-xs uppercase font-bold print:text-black">Order Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold print:text-black">Scanned / Packed</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right print:text-black">Amount</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right print:hidden">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => {
                      const complete = item.scannedQty >= item.ordered_quantity;
                      const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
                      const originalId = product ? (product.product_id || product.id) : item.product_id;
                      const productName = product?.product_name || `PRD-${originalId}`;

                      return (
                        <TableRow key={item.id} className="print:border-b print:border-gray-200">
                          <TableCell className="py-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{productName}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-tight">ID: {String(originalId || 'N/A')}</span>
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
                          <TableCell className="text-sm">{item.ordered_quantity}</TableCell>
                          <TableCell className="text-sm font-bold">
                            <span className={complete ? 'text-emerald-600' : 'text-amber-600'}>
                              {item.scannedQty}
                            </span>
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
                        ₱{selectedGroup.items.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                    disabled={processing || !isAllScanned}
                    onClick={() => dispatchOrder(selectedGroup.orderNo)}
                  >
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Withdrawal (For Loading)
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
