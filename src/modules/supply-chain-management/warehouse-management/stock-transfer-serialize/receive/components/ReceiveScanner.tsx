'use client';

import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Box, ScanLine, Loader2, CheckCircle2, Activity, Target, Package, Minus, Plus, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OrderGroup, ProductRow } from '../../../stock-transfer/types/stock-transfer.types';

interface ReceiveScannerProps {
  selectedGroup: OrderGroup | null;
  processing: boolean;
  handleSerialInput: (serial: string) => void;
  updateManualQty: (productId: number, delta: number) => void;
  receiveOrder: (orderNo: string) => void;
}

export function ReceiveScanner({
  selectedGroup,
  processing,
  handleSerialInput,
  updateManualQty,
  receiveOrder,
}: ReceiveScannerProps) {
  const [serialInput, setSerialInput] = useState('');

  const onSerialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;
    handleSerialInput(serialInput.trim());
    setSerialInput('');
  };

  const metrics = useMemo(() => {
    if (!selectedGroup)
      return { totalItems: 0, totalUnits: 0, receivedUnits: 0, progress: 0 };
    const { items } = selectedGroup;
    const totalItems = items.length;
    const totalUnits = items.reduce((acc, i) => acc + Math.max(0, i.allocated_quantity ?? 0), 0);
    const receivedUnits = items.reduce((acc, i) => acc + (i.receivedQty || 0), 0);
    const progress = totalUnits > 0 ? Math.round((receivedUnits / totalUnits) * 100) : 0;
    return { totalItems, totalUnits, receivedUnits, progress };
  }, [selectedGroup]);

  const isAllReceived = metrics.receivedUnits >= metrics.totalUnits && metrics.totalUnits > 0;

  /* ── Empty state ── */
  if (!selectedGroup) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Box className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/50">Select inbound shipment</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose an order from the inbound bay to start.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{selectedGroup.orderNo}</span>
          </div>
        </div>

        <div className="flex items-center divide-x divide-border rounded-lg border border-border overflow-hidden">
          <HeaderMetric label="Items" value={metrics.totalItems} icon={Package} />
          <HeaderMetric label="Progress" value={`${metrics.progress}%`} icon={Activity} />
          <HeaderMetric
            label="Remaining"
            value={metrics.totalUnits - metrics.receivedUnits}
            icon={Target}
          />
        </div>
      </div>

      {/* ── Scrollable body: table only ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="overflow-hidden border-b border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Product
                </TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Verified
                </TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Target
                </TableHead>
                <TableHead className="w-32 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Progress
                </TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedGroup.items.map((item) => {
                const product = item.product_id as ProductRow;
                const targetQty = item.allocated_quantity || 0;
                const verified = item.receivedQty || 0;
                const percent = targetQty > 0 ? Math.round((verified / targetQty) * 100) : 0;
                const isComplete = verified >= targetQty && targetQty > 0;
                const productId = typeof item.product_id === 'object'
                  ? item.product_id.product_id
                  : item.product_id;

                return (
                  <TableRow
                    key={item.id}
                    className={cn('transition-colors', isComplete && 'bg-emerald-500/5')}
                  >
                    <TableCell className="text-sm font-medium text-foreground">
                      {product?.product_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-semibold">
                      {product?.is_serialized === 0 ? (
                        <div className="flex items-center justify-end">
                          <div className="flex h-7 items-center divide-x divide-border overflow-hidden rounded-md border border-border bg-muted/20">
                            <button
                              type="button"
                              onClick={() => updateManualQty(productId, -1)}
                              disabled={verified <= 0}
                              className="flex h-full w-7 items-center justify-center transition-colors hover:bg-muted disabled:opacity-30 text-foreground/50 hover:text-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="flex h-full min-w-[32px] items-center justify-center px-2 text-xs font-bold text-foreground">
                              {verified}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateManualQty(productId, 1)}
                              disabled={verified >= targetQty}
                              className="flex h-full w-7 items-center justify-center transition-colors hover:bg-muted disabled:opacity-30 text-foreground/50 hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        verified
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {targetQty}
                    </TableCell>
                    <TableCell>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isComplete ? 'bg-emerald-500' : 'bg-indigo-500',
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="pr-4">
                      {isComplete
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <span className="block h-4 w-4 rounded-full border border-border" />
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* ── Scanner dock + footer ── */}
      <div className="border-t border-border bg-background">
        {/* Scanner input row */}
        <form onSubmit={onSerialSubmit} className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Scan or type serial number…"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              className="h-9 bg-muted/30 pl-9 font-mono text-sm focus-visible:ring-indigo-500/30"
              autoFocus
            />
          </div>
        </form>

        {/* Progress + action row */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{metrics.receivedUnits}</span>
              {' / '}
              {metrics.totalUnits} verified
            </span>
          </div>

          <Button
            onClick={() => receiveOrder(selectedGroup.orderNo)}
            disabled={processing || !isAllReceived}
            size="sm"
            className={cn(
              'gap-2 transition-all active:scale-95',
              isAllReceived
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {processing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CheckCircle className="h-3.5 w-3.5" />
            }
            Finalize Receipt
          </Button>
        </div>
      </div>

    </main>
  );
}

/* ── HeaderMetric ── */
function HeaderMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 bg-background px-4 py-2">
      <Icon className="h-4 w-4 text-muted-foreground/40" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold leading-none text-foreground">{value}</p>
      </div>
    </div>
  );
}
