'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageOpen, Printer, Loader2, ChevronLeft, ChevronRight, Hand, Paperclip, X } from 'lucide-react';
import { useStockTransferReceiveManual } from './hooks/use-stock-transfer-receive-manual';
import { OrderGroupItem, UnitOfMeasurement, CurrentUser } from '../types/stock-transfer.types';
import { cn } from '@/lib/utils';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function StockTransferReceiveManualView({ currentUser }: { currentUser: CurrentUser }) {
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
    selectedFiles,
    isUploading,
    addSelectedFiles,
    removeSelectedFile,
  } = useStockTransferReceiveManual();


  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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
    const targetQty = Math.max(0, i.scanned_quantity ?? i.picked_quantity ?? i.allocated_quantity ?? 0);
    return (receivedQtys[i.id] ?? 0) >= targetQty;
  }) ?? false;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Stock Deposit (Manual)</h2>
        <Button
          variant="outline"
          onClick={() => setShowPrintPreview(true)}
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

              {/* Attachment Popover section */}
              {selectedGroup && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    Attachments <span className="text-destructive font-black">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="attachment-upload"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        addSelectedFiles(files);
                        e.target.value = '';
                      }}
                      disabled={isUploading}
                    />

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "gap-2 border-border shadow-none h-10 hover:bg-muted/50 rounded-lg shrink-0 active:scale-95 transition-all text-sm font-semibold",
                            selectedFiles.length > 0 ? "border-primary/45 bg-primary/5 text-primary hover:bg-primary/10" : ""
                          )}
                          disabled={isUploading}
                        >
                          <Paperclip className={cn("w-4 h-4", selectedFiles.length > 0 ? "text-primary" : "text-muted-foreground/50")} />
                          {selectedFiles.length > 0 ? `Manage Attachments` : `Attach Files`}
                          <span className={cn(
                            "ml-1 px-1.5 py-0.5 rounded text-[10px] font-black font-mono border",
                            selectedFiles.length > 0 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted text-muted-foreground border-border/50"
                          )}>
                            {selectedFiles.length}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[320px] p-4 border border-border shadow-xl bg-card rounded-xl">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manage Attachments</span>
                            <span className="text-[10px] text-muted-foreground italic">Max 20MB per file</span>
                          </div>
                          
                          <Button
                            variant="outline"
                            type="button"
                            size="sm"
                            className="w-full gap-2 border-border shadow-none text-xs font-bold rounded-lg active:scale-95 transition-all"
                            onClick={() => document.getElementById('attachment-upload')?.click()}
                          >
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground/60" />
                            Add Attachment
                          </Button>

                          {selectedFiles.length > 0 ? (
                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                              {selectedFiles.map((file, idx) => (
                                <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-border/10 last:border-0">
                                  <span className="font-semibold truncate text-foreground flex-1 pr-2" title={file.name}>
                                    {file.name}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full shrink-0"
                                    onClick={() => removeSelectedFile(idx)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground/45 flex flex-col items-center justify-center gap-1.5">
                              <Paperclip className="w-7 h-7 stroke-[1.5]" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">No files attached yet</span>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <span className="text-[10px] text-muted-foreground font-medium italic">
                      Images, PDF, Word allowed.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full-Page Overlay Loader */}
          {isUploading && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-foreground animate-pulse">
                Uploading attachments and finalizing manual deposit...
              </span>
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
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Reference</p>
                    <p className="font-medium text-sm">{selectedGroup.orderNo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Requested On</p>
                    <p className="font-medium text-sm">{new Date(selectedGroup.dateRequested).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 print:p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20">
                      <TableHead className="text-[10px] uppercase font-bold py-4">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center w-[100px]">Unit</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center w-[100px]">Expected</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center w-[150px] print:hidden">Verified</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right py-4 px-6">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: OrderGroupItem) => {
                      const targetQty = Math.max(0, item.scanned_quantity ?? item.picked_quantity ?? item.allocated_quantity ?? 0);
                      const currentQty = receivedQtys[item.id] ?? 0;
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
                          <TableCell className="text-sm font-bold text-center">
                             <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-border/50 bg-muted/30 mx-auto w-fit">
                              {typeof product?.unit_of_measurement === 'object' && product.unit_of_measurement !== null 
                                ? (product.unit_of_measurement as UnitOfMeasurement).unit_name 
                                : 'unit'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-bold text-center font-mono">{targetQty}</TableCell>
                          <TableCell className="text-center print:hidden py-2">
                             <QuantityStepper 
                                value={currentQty}
                                max={targetQty}
                                onChange={(val) => updateReceivedQty(item.id, val, targetQty)}
                                className="h-8 w-fit mx-auto"
                                size="sm"
                              />
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold font-mono text-foreground">
                            ₱{((currentQty || 0) * Number(product?.cost_per_unit || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                          const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
                          const unitPrice = Number(product?.cost_per_unit || 0);
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
      {/* Receiving Preview */}
      {selectedGroup && (
        <StockTransferReceivingPreview
          open={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          orderNo={selectedGroup.orderNo}
          checkedBy={currentUser.name}
          items={selectedGroup.items}
          sourceBranch={getBranchName(selectedGroup.sourceBranch)}
          targetBranch={getBranchName(selectedGroup.targetBranch)}
          salesmanName={currentUser.name}
        />
      )}
    </div>
  );
}
