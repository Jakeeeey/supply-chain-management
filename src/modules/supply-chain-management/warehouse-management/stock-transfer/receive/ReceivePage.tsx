'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageOpen, Printer, ScanLine, Loader2, CheckCircle2, Radar, Edit2 } from 'lucide-react';
import { useStockTransferReceive } from './hooks/use-stock-transfer-receive';
import { OrderGroupItem, ProductRow, CurrentUser } from '../types/stock-transfer.types';
import { cn } from '@/lib/utils';
import { ScanHistorySidebar } from '../shared/components/ScanHistorySidebar';
import { StockTransferReceivingPreview } from '../shared/components/StockTransferReceivingPreview';

// Shared components
import { OrderSelectionModal } from '../shared/components/OrderSelectionModal';
import { QuantityStepper } from '../shared/components/QuantityStepper';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function StockTransferReceiveView({ currentUser }: { currentUser: CurrentUser }) {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    processing,
    receiveOrder,
    handleScanRFID,
    getBranchName,
    recentScans,
    isThrottled,
    clearHistory,
    updateManualQty,
  } = useStockTransferReceive();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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
      } else if (e.key.length === 1 && !isScanning) {
        rfidBuffer.current += e.key;
        setRfidInput(rfidBuffer.current);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [selectedOrderNo, isScanning, handleScanRFID]);

  const isAllReceived = selectedGroup?.items.every((i: OrderGroupItem) => (i.receivedQty || 0) >= (i.allocated_quantity ?? 0));

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8 pt-6 min-h-[calc(100vh-4rem)] bg-muted/5">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          .print-hidden { display: none !important; }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      ` }} />
      
      {/* Main Content Area */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between space-y-2 print:hidden">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <PackageOpen className="w-8 h-8 text-blue-500" />
              Stock Deposit
            </h2>
            <p className="text-muted-foreground text-sm">Verify and finalize incoming transfers via RFID.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPrintPreview(true)} 
              disabled={!selectedGroup}
              className="gap-2 border-border shadow-sm bg-background"
            >
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20"
              disabled={processing || !isAllReceived}
              onClick={() => receiveOrder(selectedOrderNo!)}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalize Receipt
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <Card className="md:col-span-2 border-border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Select Incoming Order</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderSelectionModal 
                orderGroups={orderGroups}
                selectedOrderNo={selectedOrderNo}
                onSelect={setSelectedOrderNo}
                getBranchName={getBranchName}
                title="Active Dispatches"
                description="Select a dispatched order to verify content."
              />
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Transfer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Origin:</span>
                <span className="font-bold">{selectedGroup ? getBranchName(selectedGroup.sourceBranch) : '---'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="px-1 py-0 h-4 text-[9px] uppercase">{selectedGroup?.status || 'Waiting'}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedGroup && (
          <Card className="border-border shadow-xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[10px] uppercase font-bold py-4 px-6">Product Details</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-center w-[100px]">Unit</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-center w-[100px]">Expected</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-center w-[150px]">Verified</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right py-4 px-6 print:hidden w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedItems.map((item: OrderGroupItem) => {
                      const targetQty = item.allocated_quantity ?? 0;
                      const progress = targetQty > 0 ? (item.receivedQty || 0) / targetQty : 0;
                    const complete = progress >= 1;
                    const product = typeof item.product_id === 'object' ? (item.product_id as ProductRow) : null;
                    const productName = product?.product_name || `PRD-${item.product_id}`;

                    return (
                      <TableRow key={item.id} className="border-b border-border/50 group hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg border transition-colors",
                              complete ? "bg-blue-500/10 border-blue-500/20" : "bg-muted border-border"
                            )}>
                              <Radar className={cn("w-4 h-4", complete ? "text-blue-500" : "text-muted-foreground")} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm group-hover:text-primary transition-colors">{productName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">CODE: {product?.product_code || '---'}</span>
                              {item.isLoosePack && (
                                <span className="text-[9px] bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded w-fit mt-1 font-bold flex items-center gap-1">
                                  <Edit2 className="w-2 h-2" /> MANUAL ENTRY
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-border/50 bg-muted/30 mx-auto w-fit">
                            {typeof product?.unit_of_measurement === 'object' && product.unit_of_measurement !== null 
                              ? (product.unit_of_measurement as { unit_name?: string }).unit_name 
                              : 'PCS'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-sm">{item.allocated_quantity ?? 0}</TableCell>
                        <TableCell className="text-center">
                          {item.isLoosePack ? (
                            <QuantityStepper 
                              value={item.receivedQty || 0}
                              max={item.allocated_quantity ?? 0}
                              onChange={(val) => updateManualQty(Number(product?.product_id || item.product_id), val)}
                              className="h-8 w-fit mx-auto"
                              size="sm"
                            />
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className={cn(
                                "font-bold font-mono text-sm px-3 py-1 rounded-md w-fit mx-auto",
                                complete ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              )}>
                                {item.receivedQty || 0}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-6 print:hidden">
                          {complete ? (
                            <div className="flex items-center justify-end text-blue-500 gap-1.5 animate-in fade-in zoom-in duration-500">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="text-[10px] font-bold uppercase tracking-tighter">Verified</span>
                            </div>
                          ) : (
                            <div className="w-full max-w-[60px] ml-auto h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
                              <div 
                                className="h-full bg-amber-500 transition-all duration-500 ease-out"
                                style={{ width: `${Math.min(100, progress * 100)}%` }}
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Sidebar Panel */}
      <aside className="w-full lg:w-[320px] print:hidden">
        <ScanHistorySidebar 
          scans={recentScans} 
          isScanning={isScanning}
          selectedGroup={selectedGroup}
          buffer={rfidInput}
          isThrottled={isThrottled}
          onClear={clearHistory}
        />
      </aside>

      {selectedGroup && (
        <StockTransferReceivingPreview
          open={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          orderNo={selectedGroup.orderNo}
          checkedBy={currentUser.name}
          items={selectedGroup.items}
          sourceBranch={getBranchName(selectedGroup.sourceBranch)}
          targetBranch={getBranchName(selectedGroup.targetBranch)}
        />
      )}
    </div>
  );
}
