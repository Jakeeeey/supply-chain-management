'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Printer, ScanLine, Loader2, CheckCircle2, Radar, Edit2 } from 'lucide-react';
import { useStockTransferDispatch } from './hooks/use-stock-transfer-dispatch';
import { cn } from '@/lib/utils';
import { ScanHistorySidebar } from '../shared/components/ScanHistorySidebar';
import type { OrderGroupItem, ProductRow, UnitOfMeasurement } from '../types/stock-transfer.types';

// Shared components
import { OrderSelectionModal } from '../shared/components/OrderSelectionModal';
import { QuantityStepper } from '../shared/components/QuantityStepper';
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
    recentScans,
    isThrottled,
    clearHistory,
    updateManualQty,
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

  const metrics = React.useMemo(() => {
    if (!selectedGroup) return { totalItems: 0, totalUnits: 0, pickedUnits: 0, progress: 0 };
    
    const items = selectedGroup.items;
    const totalItems = items.length;
    const totalUnits = items.reduce((acc, i) => acc + Math.max(0, i.allocated_quantity ?? i.ordered_quantity ?? 0), 0);
    const pickedUnits = items.reduce((acc, i) => acc + (i.scannedQty || 0), 0);
    const progress = totalUnits > 0 ? Math.round((pickedUnits / totalUnits) * 100) : 0;

    return { totalItems, totalUnits, pickedUnits, progress };
  }, [selectedGroup]);

  // ── Global RFID listener ──
  React.useEffect(() => {
    if (!selectedOrderNo) return;

    const handleGlobalKey = async (e: globalThis.KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

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

  const isAllScanned = selectedGroup?.items.every((i: OrderGroupItem) => {
    const targetQty = Math.max(0, i.allocated_quantity ?? i.ordered_quantity ?? 0);
    return (i.scannedQty || 0) >= targetQty;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8 pt-6 min-h-screen bg-background">
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
      <div className="flex-1 space-y-4">
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
              <div className="print:hidden">
                <div className="max-w-md space-y-2">
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
              </div>
            )}

            {selectedGroup && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <MetricCard 
                  label="Progress" 
                  value={`${metrics.progress}%`} 
                  subValue={`${metrics.pickedUnits} / ${metrics.totalUnits} Units`}
                  icon={Radar}
                  color="text-primary"
                />
                <MetricCard 
                  label="Total Items" 
                  value={metrics.totalItems} 
                  subValue="Unique Products"
                  icon={Truck}
                  color="text-sky-500"
                />
                <MetricCard 
                  label="Remaining" 
                  value={Math.max(0, metrics.totalUnits - metrics.pickedUnits)} 
                  subValue="Units to Pick"
                  icon={ScanLine}
                  color="text-amber-500"
                />
                <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex flex-col justify-center items-center">
                  <div className="w-full bg-muted rounded-full h-1.5 mb-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${metrics.progress}%` }} 
                    />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order Status</p>
                  <p className="text-xs font-semibold mt-1">{selectedGroup.status}</p>
                </div>
              </div>
            )}

            {selectedGroup && (
              <div className="space-y-6 border border-border rounded-xl overflow-hidden shadow-sm bg-card/50">
                <div className="bg-muted/30 p-4 border-b border-border">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Source</p>
                      <p className="font-medium text-sm">{getBranchName(selectedGroup.sourceBranch)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target</p>
                      <p className="font-medium text-sm">{getBranchName(selectedGroup.targetBranch)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">{selectedGroup.orderNo}</p>
                      <p className="font-medium text-sm">Requested Transfer</p>
                    </div>
                  </div>
                </div>

                <div className="p-0 sm:p-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/20">
                        <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-center">Unit</TableHead>
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
                                <span className="font-semibold text-sm line-clamp-1">{productName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">ID: {String((product?.product_id) || 'N/A')}</span>
                                {item.isLoosePack && (
                                  <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded w-fit mt-1 font-bold flex items-center gap-1">
                                    <Edit2 className="w-2 h-2" /> MANUAL ENTRY
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-[10px] text-center font-medium uppercase text-muted-foreground">
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
                              {item.isLoosePack ? (() => {
                                const pid = Number(product?.product_id || item.product_id);
                                const currentQty = item.scannedQty ?? 0;
                                return (
                                  <QuantityStepper 
                                    value={currentQty}
                                    max={targetQty}
                                    onChange={(val) => {
                                      if (!isNaN(pid)) updateManualQty(pid, val);
                                    }}
                                    className="h-8"
                                    size="sm"
                                  />
                                );
                              })() : (
                                <span className={cn("font-bold font-mono", complete ? 'text-emerald-500' : 'text-amber-500')}>
                                  {item.scannedQty}
                                </span>
                              )}
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

                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 lg:p-0 print:hidden">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground text-center sm:text-left">
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
                          Done Picking
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className={cn(
                          "w-full sm:w-auto font-bold text-xs shadow-none px-6 transition-all",
                          (isAllScanned || selectedGroup.status === 'Picked') 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                            : "bg-muted text-muted-foreground"
                        )}
                        disabled={processing || (!isAllScanned && selectedGroup.status !== 'Picked')}
                        onClick={() => dispatchOrder(selectedGroup.orderNo)}
                      >
                        {processing && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Dispatch Order
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
}

function MetricCard({ label, value, subValue, icon: Icon, color }: {
  label: string;
  value: string | number;
  subValue: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex items-start justify-between group transition-all hover:bg-muted/50 hover:border-border">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground font-medium">{subValue}</p>
      </div>
      <div className={cn("p-2 rounded-lg bg-background shadow-sm border border-border/50 transition-transform group-hover:scale-110", color)}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}
