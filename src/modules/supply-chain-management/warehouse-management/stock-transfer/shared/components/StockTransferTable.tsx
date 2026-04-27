'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { ScannedItem } from '../../types/stock-transfer.types';
import { QuantityStepper } from './QuantityStepper';

interface StockTransferTableProps {
  items: ScannedItem[];
  onQtyChange: (rfid: string, qty: number) => void;
  onDelete: (rfid: string) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 40, 50, 100];

export default function StockTransferTable({ items, onQtyChange, onDelete }: StockTransferTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    setPage(1);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (current > 3) pages.push('ellipsis');
    const rangeStart = Math.max(2, current - 1);
    const rangeEnd = Math.min(total - 1, current + 1);
    for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
    if (current < total - 2) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }

  const pageList = buildPageList(page, totalPages);

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-none">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="font-bold text-foreground h-10 text-[10px] uppercase tracking-widest w-12">
              No.
            </TableHead>
            <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-widest">
              RFID
            </TableHead>
            <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-widest">
              Product Name
            </TableHead>
            <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-widest">
              Brand
            </TableHead>
            <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-widest">
              Unit
            </TableHead>
            <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-widest text-right w-28">
              Order Qty
            </TableHead>
            <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-widest text-right">
              Line Total
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedItems.length > 0 ? (
            paginatedItems.map((item, index) => (
              <TableRow
                key={item.rfid}
                className="border-border/50 hover:bg-muted/5 transition-colors"
              >
                <TableCell className="text-[10px] font-medium text-muted-foreground py-2.5">
                  {start + index + 1}
                </TableCell>
                <TableCell className="text-xs font-bold text-primary py-2.5 font-mono">
                  {item.rfid}
                </TableCell>
                <TableCell className="text-xs font-semibold text-foreground py-2.5">
                  {item.productName}
                </TableCell>
                <TableCell className="text-[10px] font-bold text-primary/70 uppercase py-2.5">
                  {item.brandName || '—'}
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground uppercase py-2.5 font-medium">
                  {item.unit}
                </TableCell>
                <TableCell className="text-right py-1.5">
                  <QuantityStepper 
                    value={item.unitQty}
                    max={9999}
                    onChange={(val) => onQtyChange(item.rfid, val)}
                    className="h-8 w-fit ml-auto"
                    size="sm"
                  />
                </TableCell>
                <TableCell className="text-xs font-bold text-foreground text-right py-2.5 font-mono">
                  ₱{item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="py-1.5 text-center px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(item.rfid)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground text-xs italic"
              >
                No items added. Please scan an RFID to begin.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {items.length > 0 && (
          <TableFooter className="bg-muted/10">
            <TableRow>
              <TableCell colSpan={6} className="font-bold text-right text-[10px] uppercase tracking-widest text-muted-foreground">Total Value</TableCell>
              <TableCell className="font-bold text-right text-xs text-emerald-600 font-mono">
                ₱{items.reduce((sum, item) => sum + (item.totalAmount || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {items.length > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2 bg-muted/5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[60px] text-[10px] border-border shadow-none bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-[10px]">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Pagination className="w-auto mx-0 justify-end scale-75 origin-right">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                  className={page === 1 ? 'pointer-events-none opacity-40' : ''}
                />
              </PaginationItem>
              {pageList.map((p, i) =>
                p === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === page}
                      onClick={(e) => { e.preventDefault(); setPage(p); }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                  className={page === totalPages ? 'pointer-events-none opacity-40' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
