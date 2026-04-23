'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageOpen, Printer, Loader2, ChevronLeft, ChevronRight, Hand } from 'lucide-react';
import { useStockTransferReceiveManual } from '../hooks/use-stock-transfer-receive-manual';
import { OrderGroupItem, UnitOfMeasurement } from '../types/stock-transfer.types';
import { cn } from '@/lib/utils';

// Shared components
import { OrderSelectionModal } from '../components/shared/OrderSelectionModal';
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

export default function StockTransferReceiveManualView() {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    fetchError,
    receiveOrder,
    getBranchName,
    receivedQtys,
    updateReceivedQty,
  } = useStockTransferReceiveManual();

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

  const isAllReceived = selectedGroup?.items.every((i: OrderGroupItem) => {
    const targetQty = Math.max(0, i.allocated_quantity ?? i.ordered_quantity ?? 0);
    return (receivedQtys[i.id] ?? 0) >= targetQty;
  }) ?? false;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Stock Deposit (Manual)</h2>
        <Button
          variant="outline"
          onClick={() => window.print()}
          disabled={!selectedGroup}
          className="gap-2 border-border shadow-none"
        >
          <Printer className="w-4 h-4" /> Print Receipt
        </Button>
      </div>

      <Card className="border-border shadow-none bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:hidden">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Manual Verification</CardTitle>
            <CardDescription>
              Verify incoming items through quantitative manual entry to finalize the transfer.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Hand className="h-8 w-8 text-muted-foreground/30" />
            {selectedGroup && (
              <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-blue-100 text-blue-700 border-blue-200">
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
                  Select Incoming Transfer
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
                      <TableHead className="text-[10px] uppercase font-bold text-center">Expected</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Unit</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center print:hidden">Manual Verify</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: OrderGroupItem) => {
                      const targetQty = Math.max(0, item.allocated_quantity ?? item.ordered_quantity ?? 0);
                      const currentQty = receivedQtys[item.id] ?? 0;
                      const complete = currentQty >= targetQty;
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
                          <TableCell className="text-xs text-center font-medium font-mono text-muted-foreground uppercase italic tracking-tighter">
                            {typeof product?.unit_of_measurement === 'object' && product.unit_of_measurement !== null 
                              ? (product.unit_of_measurement as UnitOfMeasurement).unit_name 
                              : 'unit'}
                          </TableCell>
                          <TableCell className="print:hidden text-center">
                            <Input
                              type="number"
                              min={0}
                              max={targetQty}
                              value={currentQty}
                              onChange={(e) => updateReceivedQty(item.id, parseInt(e.target.value) || 0, targetQty)}
                              className={cn(
                                "h-8 w-20 mx-auto text-center font-bold text-xs shadow-none border-border",
                                complete ? "border-blue-500/50 text-blue-600 bg-blue-50/50" : "bg-background"
                              )}
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
                      <TableCell colSpan={4} className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Verification Value</TableCell>
                      <TableCell className="text-right text-sm font-bold text-foreground font-mono">
                         ₱{selectedGroup.items.reduce((sum: number, item: OrderGroupItem) => {
                          const rqty = receivedQtys[item.id] ?? 0;
                          const unitPrice = item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0;
                          return sum + (rqty * unitPrice);
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
                      size="sm"
                      className={cn(
                        "w-full sm:w-auto font-bold text-xs shadow-none",
                        isAllReceived ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-muted text-muted-foreground"
                      )}
                      disabled={processing || !isAllReceived}
                      onClick={() => receiveOrder(selectedOrderNo!)}
                    >
                      {processing && <Loader2 className="mr-2 h-3 w-3 animate-spin text-white" />}
                      <PackageOpen className="w-4 h-4 mr-2" />
                      Finalize Manual Deposit
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
