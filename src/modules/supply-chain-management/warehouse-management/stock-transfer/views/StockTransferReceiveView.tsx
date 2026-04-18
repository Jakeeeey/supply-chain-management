'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageOpen, Printer, ScanLine, Loader2, CheckCircle2, Radar } from 'lucide-react';
import { useStockTransferReceive } from '../hooks/use-stock-transfer-receive';
import { cn } from '@/lib/utils';
import type { OrderGroupItem, ProductRow } from '../types/stock-transfer.types';

// Shared components
import { OrderSelectionModal } from '../components/shared/OrderSelectionModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function StockTransferReceiveView() {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    processing,
    receiveOrder,
    handleScanRFID,
    getBranchName,
  } = useStockTransferReceive();

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

  const [, setRfidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const rfidBuffer = React.useRef('');

  // Global RFID listener
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

  const isAllReceived = selectedGroup?.items.every((i: OrderGroupItem) => (i.receivedQty || 0) >= i.ordered_quantity);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Stock Deposit (RFID Verification)</h2>
        <Button 
          variant="outline" 
          onClick={() => window.print()} 
          disabled={!selectedGroup}
          className="gap-2 border-border shadow-none"
        >
          <Printer className="w-4 h-4" /> Print Document
        </Button>
      </div>

      <Card className="border-border shadow-none bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:hidden">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Verification & Deposit</CardTitle>
            <CardDescription>
              Verify incoming items and finalize the transfer record.
            </CardDescription>
          </div>
          <PackageOpen className="h-8 w-8 text-muted-foreground/30" />
        </CardHeader>

        <CardContent className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                In-Transit Order
              </label>
              <OrderSelectionModal 
                orderGroups={orderGroups}
                selectedOrderNo={selectedOrderNo}
                onSelect={setSelectedOrderNo}
                getBranchName={getBranchName}
                title="Select Incoming"
                description="Choose an order to verify."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                Verification Hub
                {selectedGroup && <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
              </label>
              <div className={`relative flex flex-col gap-2 p-3 border rounded-lg transition-all duration-300 ${!selectedGroup ? 'border-border bg-muted/20' : 'border-blue-500/30 bg-blue-500/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radar className={cn("w-4 h-4", !selectedGroup ? "text-muted-foreground/30" : "text-blue-500 animate-pulse")} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", !selectedGroup ? "text-muted-foreground/40" : "text-blue-600")}>
                      {!selectedGroup ? 'Awaiting Order' : 'Scanning Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedGroup && (
            <div className="space-y-6 border border-border rounded-xl overflow-hidden shadow-sm bg-card/50">
              <div className="bg-muted/30 p-4 border-b border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Origin</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.sourceBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Destination</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.targetBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">{selectedOrderNo}</p>
                    <p className="font-medium text-sm">Active Reference</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Expected</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Verified</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right print:hidden">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: OrderGroupItem) => {
                      const complete = (item.receivedQty || 0) >= item.ordered_quantity;
                      const product = typeof item.product_id === 'object' && item.product_id !== null ? (item.product_id as ProductRow) : null;
                      const productName = product?.product_name || `PRD-${item.product_id}`;

                      return (
                        <TableRow key={item.id} className="border-b border-border/50">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{productName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">ID: {String(product?.product_id || 'N/A')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-center font-bold">{item.ordered_quantity}</TableCell>
                           <TableCell className="text-sm text-center">
                              <span className={cn("font-bold font-mono", complete ? 'text-blue-500' : 'text-amber-500')}>
                                {item.receivedQty}
                              </span>
                          </TableCell>
                          <TableCell className="text-right text-sm print:hidden">
                            {complete ? (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto" />
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
                    {!isAllReceived ? "Verification in progress..." : "Fully Verified"}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-none"
                      disabled={processing || !isAllReceived}
                      onClick={() => receiveOrder(selectedOrderNo!)}
                    >
                      {processing && <Loader2 className="mr-2 h-3 w-3 animate-spin font-bold" />}
                      Finalize Receive
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
