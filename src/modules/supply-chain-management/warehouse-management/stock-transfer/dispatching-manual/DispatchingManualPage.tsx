'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Printer, Loader2, CheckCircle2, ChevronLeft, ChevronRight, Hand } from 'lucide-react';
import { useStockTransferDispatchManual } from './hooks/use-stock-transfer-dispatch-manual';
import { OrderGroupItem, CurrentUser } from '../types/stock-transfer.types';
import { cn } from '@/lib/utils';
import { StockTransferPicklistPreview } from '../shared/components/StockTransferPicklistPreview';

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

export default function StockTransferDispatchManualView({ currentUser }: { currentUser: CurrentUser }) {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    fetchError,
    dispatchOrder,
    getBranchName,
    markAsPicked,
    fetchingAvailable,
    scannedQtys,
    updateScannedQty,
  } = useStockTransferDispatchManual();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPicklist, setShowPicklist] = useState(false);

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

  const isAllScanned = selectedGroup?.items.every((i: OrderGroupItem) => {
    const targetQty = Math.max(0, i.allocated_quantity ?? 0);
    return (scannedQtys[i.id] ?? 0) >= targetQty;
  }) ?? false;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Stock Withdrawal (Manual)</h2>
        <Button
          variant="outline"
          onClick={() => setShowPicklist(true)}
          disabled={!selectedGroup}
          className="gap-2 border-border shadow-none"
        >
          <Printer className="w-4 h-4" /> Print Picklist
        </Button>
      </div>

      <Card className="border-border shadow-none bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:hidden">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Manual Withdrawal</CardTitle>
            <CardDescription>
              Fulfill approved stock transfers through quantitative manual entry.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Hand className="h-8 w-8 text-muted-foreground/30" />
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Select Order
                </label>
                <OrderSelectionModal
                  orderGroups={orderGroups}
                  selectedOrderNo={selectedOrderNo}
                  onSelect={setSelectedOrderNo}
                  getBranchName={getBranchName}
                />
              </div>

              <div className="flex items-center justify-end">
                {selectedGroup && selectedGroup.status !== 'Picked' && (
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700 gap-2 shadow-none font-bold text-xs"
                    onClick={() => markAsPicked(selectedGroup.orderNo)}
                    disabled={processing || selectedGroup.status !== 'For Picking' || !isAllScanned}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4 text-white" />}
                    Mark as Done Picking
                  </Button>
                )}
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
                    <p className="font-medium text-sm">Active Reference</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Requested On</p>
                    <p className="font-medium text-sm">{new Date(selectedGroup.dateRequested).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 print:p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Allocated</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Available</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center print:hidden">Manual Qty</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: OrderGroupItem) => {
                      const targetQty = Math.max(0, item.allocated_quantity ?? 0);
                      const currentQty = scannedQtys[item.id] ?? 0;
                      const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
                      const productName = product?.product_name || `PRD-${item.product_id}`;

                      return (
                        <TableRow key={item.id} className="border-b border-border/50">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{productName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">ID: {String(product?.product_id || 'N/A')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-bold text-center">{targetQty}</TableCell>
                          <TableCell className="text-xs text-center font-medium font-mono text-muted-foreground italic">
                            {fetchingAvailable ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto text-primary" />
                            ) : (
                              Math.max(0, item.qtyAvailable ?? 0)
                            )}
                          </TableCell>
                          <TableCell className="print:hidden text-center">
                            <QuantityStepper 
                              value={currentQty}
                              max={Math.min(targetQty, Math.max(0, item.qtyAvailable ?? 0))}
                              onChange={(val) => updateScannedQty(item.id, val, Math.min(targetQty, Math.max(0, item.qtyAvailable ?? 0)))}
                              disabled={selectedGroup?.status !== 'For Picking'}
                              className="h-8 w-fit mx-auto"
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold font-mono text-foreground">
                            ₱{((currentQty || 0) * (item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className="bg-muted/10">
                    <TableRow>
                      <TableCell colSpan={4} className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Withdrawal Amount</TableCell>
                      <TableCell className="text-right text-sm font-bold text-foreground font-mono">
                        ₱{selectedGroup.items.reduce((sum: number, item: OrderGroupItem) => {
                          const sqty = scannedQtys[item.id] ?? 0;
                          const unitPrice = item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0;
                          return sum + (sqty * unitPrice);
                        }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden px-2">
                   <div className="flex items-center gap-4">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Page View</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] text-xs font-bold border-border shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100].map((v) => (
                          <SelectItem key={v} value={String(v)} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-8 w-8 p-0 border-border"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-mono font-bold text-muted-foreground mx-2">{currentPage} / {totalPages}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-8 w-8 p-0 border-border"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                    <Button
                      className={cn(
                        "flex-1 sm:flex-none font-bold text-xs shadow-none",
                        selectedGroup.status === 'Picked' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted text-muted-foreground"
                      )}
                      disabled={processing || selectedGroup.status !== 'Picked'}
                      onClick={() => dispatchOrder(selectedGroup.orderNo)}
                    >
                      {processing && <Loader2 className="mr-2 h-3 w-3 animate-spin text-white" />}
                      <Truck className="w-3 h-3 mr-2" />
                      Confirm Manual Dispatch
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Picklist Preview */}
      {selectedGroup && (
        <StockTransferPicklistPreview
          open={showPicklist}
          onClose={() => setShowPicklist(false)}
          orderNo={selectedGroup.orderNo}
          pickerName={currentUser.name}
          items={selectedGroup.items}
        />
      )}
    </div>
  );
}
