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
import { Input } from '@/components/ui/input';
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
import { ScannedItem } from '../types/stock-transfer.types';

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

  /* Build compact page number list with ellipsis */
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
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="font-bold text-foreground h-12 text-[11px] uppercase tracking-wider w-12">
              No.
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">
              RFID
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">
              Product Name
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">
              Description
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">
              Brand
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">
              Unit
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-right w-28">
              Order Quantity
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-right">
              Total Amount
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedItems.length > 0 ? (
            paginatedItems.map((item, index) => (
              <TableRow
                key={item.rfid}
                className="border-border hover:bg-muted/10 transition-colors"
              >
                <TableCell className="text-xs font-medium text-muted-foreground py-3">
                  {start + index + 1}
                </TableCell>
                <TableCell className="text-xs font-bold text-primary py-3">
                  {item.rfid}
                </TableCell>
                <TableCell className="text-xs font-semibold text-foreground py-3">
                  {item.productName}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground italic py-3">
                  {item.description}
                </TableCell>
                <TableCell className="text-xs font-medium text-primary py-3">
                  {item.brandName || 'N/A'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-3">
                  {item.unit}
                </TableCell>
                <TableCell className="text-right py-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={item.unitQty === 0 ? '' : item.unitQty}
                    onChange={(e) => {
                      const val = e.target.value;
                      onQtyChange(item.rfid, val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                    }}
                    className="h-8 w-24 text-xs text-right ml-auto bg-muted/20 border-border focus-visible:ring-1"
                  />
                </TableCell>
                <TableCell className="text-xs font-bold text-foreground text-right py-3">
                  ₱{item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="py-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(item.rfid)}
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-32 text-center text-muted-foreground text-sm italic"
              >
                No products added. Scan RFID to add products to transfer.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {items.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="font-bold text-right text-xs uppercase tracking-wider text-muted-foreground">Total Amount</TableCell>
              <TableCell className="font-bold text-right text-xs text-primary">
                ₱{items.reduce((sum, item) => sum + (item.totalAmount || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {/* ── Pagination Footer ── */}
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">

          {/* Left: row count info + page size selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {start + 1}–{Math.min(start + pageSize, items.length)} of {items.length} items
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[80px] text-xs border-border shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">per page</span>
          </div>

          {/* Right: page navigation */}
          <Pagination className="w-auto mx-0 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                  className={page === 1 ? 'pointer-events-none opacity-40' : ''}
                  aria-disabled={page === 1}
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
                  aria-disabled={page === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

        </div>
      )}
    </div>
  );
}
