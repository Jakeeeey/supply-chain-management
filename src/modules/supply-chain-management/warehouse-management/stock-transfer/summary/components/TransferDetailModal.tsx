'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Separator,
} from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Package, Printer } from 'lucide-react';
import type { OrderGroup, OrderGroupItem, ProductRow } from '../../types/stock-transfer.types';
import { SummaryPrintPreview } from './SummaryPrintPreview';

/** Local extended OrderGroup for audit trail fields. */
export interface SummaryOrderGroup extends OrderGroup {
  dateApproved?: string | null;
  dateDispatched?: string | null;
  dateReceived?: string | null;
  encoderId?: number | null;
  approverId?: number | null;
  dispatcherId?: number | null;
  receiverId?: number | null;
}

interface TransferDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  group: SummaryOrderGroup | null;
  getBranchName: (id: number | null) => string;
  getUserName: (id: number | null | undefined) => string;
  getUnitName: (id: unknown) => string;
}

export function TransferDetailModal({
  isOpen,
  onOpenChange,
  group,
  getBranchName,
  getUserName,
  getUnitName,
}: TransferDetailModalProps) {
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);

  if (!group) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Transfer Details: <span className="font-mono text-primary">{group.orderNo}</span>
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-70">
                Full itemized breakdown of the stock transfer request.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 self-start md:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintPreview(true)}
                className="gap-2 h-7 px-3 border-primary/20 hover:border-primary hover:bg-primary/5 text-primary shadow-none text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <Printer className="w-3 h-3" />
                Print Document
              </Button>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2">Status:</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "font-black uppercase tracking-widest text-[10px] rounded-[4px] px-2 py-0.5 border shadow-none",
                  group.status === 'Requested' && "bg-muted text-muted-foreground border-muted",
                  group.status === 'For Picking' && "bg-amber-100 text-amber-700 border-amber-200",
                  group.status === 'Picking' && "bg-blue-100 text-blue-700 border-blue-200",
                  group.status === 'Picked' && "bg-emerald-100 text-emerald-700 border-emerald-200",
                  group.status === 'For Loading' && "bg-sky-100 text-sky-700 border-sky-200",
                  group.status === 'Received' && "bg-emerald-600 text-white border-emerald-600",
                  group.status === 'Rejected' && "bg-destructive text-white border-destructive"
                )}
              >
                {group.status}
              </Badge>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-xl border border-border bg-background/50">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Source Branch</p>
              <p className="font-semibold text-sm truncate" title={getBranchName(group.sourceBranch)}>{getBranchName(group.sourceBranch)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Target Branch</p>
              <p className="font-semibold text-sm truncate" title={getBranchName(group.targetBranch)}>{getBranchName(group.targetBranch)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Requested On</p>
              <p className="font-semibold text-sm">{formatDate(group.dateRequested)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Lead Date</p>
              <p className="font-semibold text-sm">{formatDate(group.leadDate)}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 scrollbar-hide">
          <div className="border border-border rounded-xl overflow-hidden bg-background">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-b border-border">
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Product</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center">Unit</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center">Ordered</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center">Allocated</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center">Received</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right">Unit Price</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item: OrderGroupItem) => {
                  const product = typeof item.product_id === 'object' ? (item.product_id as ProductRow) : null;
                  const productName = product?.product_name || `PRD-${item.product_id}`;
                  const barcode = product?.barcode || '—';
                  const unitPrice = item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0;

                  return (
                    <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/5">
                      <TableCell>
                        <div className="flex flex-col max-w-[300px]">
                          <span className="font-bold text-sm truncate" title={productName}>{productName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">Barcode: {barcode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs">
                        {getUnitName(product?.unit_of_measurement)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-sm">{item.ordered_quantity}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-sm text-amber-600">{item.allocated_quantity ?? '—'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-sm text-emerald-600">{item.received_quantity ?? '—'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs font-medium">₱{unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-bold">₱{Number(item.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-muted/20 border-t border-border">
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-4">Total Order Value</TableCell>
                  <TableCell className="text-right text-lg font-bold text-emerald-600 py-4">
                    ₱{group.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Audit Trail</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Requested By</p>
              <p className="text-xs font-semibold">{getUserName(group.encoderId)}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(group.dateRequested)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Approved By</p>
              <p className="text-xs font-semibold">{group.dateApproved ? getUserName(group.approverId) : '—'}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(group.dateApproved)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Dispatched By</p>
              <p className="text-xs font-semibold">{group.dateDispatched ? getUserName(group.dispatcherId) : '—'}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(group.dateDispatched)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Received By</p>
              <p className="text-xs font-semibold">{group.dateReceived ? getUserName(group.receiverId) : '—'}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(group.dateReceived)}</p>
            </div>
          </div>
        </div>
      </DialogContent>

      <SummaryPrintPreview
        open={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        group={group}
        getBranchName={getBranchName}
        getUserName={getUserName}
        getUnitName={getUnitName}
      />
    </Dialog>
  );
}
