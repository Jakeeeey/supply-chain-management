'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageOpen, Printer, Loader2, CheckCircle2, ChevronLeft, ChevronRight, ServerCrash, RefreshCcw, Hand } from 'lucide-react';
import { useStockTransferReceiveManual } from './hooks/useStockTransferReceiveManual';
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

export default function StockTransferReceiveManualModule() {
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
    refresh,
    receivedQtys,
    updateReceivedQty,
  } = useStockTransferReceiveManual();

  const isAllReceived = selectedGroup?.items.every((i: any) => {
    const targetQty = Math.max(0, i.allocated_quantity ?? i.ordered_quantity ?? 0);
    return (receivedQtys[i.id] ?? 0) >= targetQty;
  }) ?? false;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when order changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrderNo]);

  const totalItems = selectedGroup?.items.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = selectedGroup?.items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 print:p-0 print:m-0 print:block print:h-auto">
      <style dangerouslySetInnerHTML={{
        __html: `
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
          .flex-1 { 
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            height: auto !important;
          }
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
        <h2 className="text-3xl font-bold tracking-tight">Manual Stock Transfer Receive</h2>
        <Button
          variant="outline"
          onClick={() => window.print()}
          disabled={!selectedGroup}
          className="gap-2"
        >
          <Printer className="w-4 h-4" /> Print Receipt
        </Button>
      </div>

      <Card className="print:border-none print:shadow-none card-print-root">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:hidden">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Manual Incoming Transfers</CardTitle>
            <CardDescription>
              Verify and receive dispatched stock transfers manually.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Hand className="h-8 w-8 text-muted-foreground" />
            {selectedGroup && (
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                "bg-blue-100 text-blue-700 border border-blue-200"
              )}>
                Status: {selectedGroup.status}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="mt-4 space-y-6 print:p-0">
          {loading && (
            <div className="space-y-3 py-4 print:hidden">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">Loading incoming transfers...</span>
              </div>
            </div>
          )}

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

          {!loading && !fetchError && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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

          <div className="hidden print:block mb-6 text-center">
            <h1 className="text-2xl font-bold uppercase">Stock Transfer Receipt (Manual)</h1>
            {selectedGroup && <p className="text-lg mt-2 font-mono">{selectedGroup.orderNo}</p>}
          </div>

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
                      <TableHead className="text-xs uppercase font-bold print:text-black">Dispatched Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold print:text-black">UOM</TableHead>
                      <TableHead className="text-xs uppercase font-bold print:text-black print:hidden">Received</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right print:text-black">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: any) => {
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
                          <TableCell className="text-sm font-bold">{item.allocated_quantity ?? item.ordered_quantity ?? 0}</TableCell>
                          <TableCell className="text-sm">
                            {product?.unit_of_measurement?.unit_name || 'unit'}
                          </TableCell>
                          <TableCell className="print:hidden">
                            <Input
                              type="number"
                              min={0}
                              max={Math.max(0, item.allocated_quantity ?? item.ordered_quantity ?? 0)}
                              value={receivedQtys[item.id] ?? 0}
                              onChange={(e) => updateReceivedQty(item.id, parseInt(e.target.value) || 0, Math.max(0, item.allocated_quantity ?? item.ordered_quantity ?? 0))}
                              className={cn(
                                "h-8 w-20 text-center font-bold",
                                (receivedQtys[item.id] ?? 0) >= Math.max(0, item.allocated_quantity ?? item.ordered_quantity ?? 0) ? "border-emerald-500 text-emerald-700 bg-emerald-50" : ""
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-primary font-mono">
                            ₱{((receivedQtys[item.id] ?? 0) * (item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="print:border-b print:border-black bg-muted/30">
                      <TableCell colSpan={4} className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground print:hidden">Total Amount</TableCell>
                      <TableCell colSpan={3} className="hidden print:table-cell text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Total Amount</TableCell>
                      <TableCell className="text-right text-sm font-bold text-primary font-mono">
                        ₱{selectedGroup.items.reduce((sum: number, item: any) => sum + ((receivedQtys[item.id] ?? 0) * (item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0)), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>

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

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-4 print:hidden">
                   <Button
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={processing || !isAllReceived}
                      onClick={() => receiveOrder(selectedGroup.orderNo)}
                    >
                      {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <PackageOpen className="w-4 h-4 mr-2" />
                      {isAllReceived ? 'Confirm Receive (Manual)' : 'Receive All Items First'}
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
