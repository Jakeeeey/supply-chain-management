'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScannedItem } from '../types';

interface StockTransferTableProps {
  items: ScannedItem[];
  onQtyChange: (rfid: string, qty: number) => void;
}

export default function StockTransferTable({ items, onQtyChange }: StockTransferTableProps) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
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
              Unit
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-right">
              Qty Available
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-right w-28">
              Qty (Custom)
            </TableHead>
            <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-right">
              Total Amount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <TableRow
                key={item.rfid}
                className="border-border hover:bg-muted/10 transition-colors"
              >
                <TableCell className="text-xs font-medium text-muted-foreground py-3">
                  {index + 1}
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
                <TableCell className="text-xs text-muted-foreground py-3">
                  {item.unit}
                </TableCell>
                <TableCell className="text-xs font-medium text-foreground text-right py-3">
                  {item.qtyAvailable}
                </TableCell>
                <TableCell className="text-right py-2">
                  <Input
                    type="number"
                    min={1}
                    value={item.unitQty}
                    onChange={(e) => onQtyChange(item.rfid, Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 w-24 text-xs text-right ml-auto bg-muted/20 border-border focus-visible:ring-1"
                  />
                </TableCell>
                <TableCell className="text-xs font-bold text-foreground text-right py-3">
                  ₱{item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground text-sm italic"
              >
                No products added. Scan RFID to add products to transfer.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
