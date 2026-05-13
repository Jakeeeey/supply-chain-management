'use client';

import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Download, Box, Loader2, CheckCircle2,
  Activity, CheckCircle, Minus, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    handleSerialInput(serialInput);
    setSerialInput('');
  };

  const metrics = useMemo(() => {
    if (!selectedGroup)
      return { totalItems: 0, totalUnits: 0, receivedUnits: 0, progress: 0 };
    const items = selectedGroup.items;
    const totalItems = items.length;
    const totalUnits = items.reduce(
      (acc, i) => acc + Math.max(0, i.allocated_quantity ?? 0),
      0,
    );
    const receivedUnits = items.reduce(
      (acc, i) => acc + (i.receivedQty || 0),
      0,
    );
    const progress =
      totalUnits > 0 ? Math.round((receivedUnits / totalUnits) * 100) : 0;
    return { totalItems, totalUnits, receivedUnits, progress };
  }, [selectedGroup]);

  const isAllReceived = useMemo(() => {
    if (!selectedGroup) return false;
    return metrics.receivedUnits >= metrics.totalUnits && metrics.totalUnits > 0;
  }, [selectedGroup, metrics]);

  if (!selectedGroup) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/5">
          <Box className="h-10 w-10 text-indigo-600/20" />
        </div>
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground/40">
            Select inbound shipment
          </h3>
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Choose an order from the inbound bay to start the serialized verification process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-w-0 min-h-0 flex-1 flex-col bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-6 py-4 backdrop-blur-md">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            {selectedGroup.orderNo}
            <Badge
              variant="outline"
              className="border-indigo-500/20 bg-indigo-500/5 text-indigo-600"
            >
              INBOUND
            </Badge>
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Activity className="h-3 w-3" />
            Real-time verification console
          </p>
        </div>

        <div className="flex items-center gap-3">
          <HeaderMetric label="Items" value={metrics.totalItems} icon={Box} />
          <HeaderMetric label="Progress" value={`${metrics.progress}%`} icon={Download} />
          <HeaderMetric label="Verified" value={metrics.receivedUnits} icon={CheckCircle2} />
        </div>
      </div>

      {/* Scrollable body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto max-w-4xl space-y-8 p-6">

          {/* Verification input */}
          <Card className="border border-indigo-500/20 shadow-md">
            <CardContent className="p-6">
              <form onSubmit={onSerialSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
                    Verification Interface
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase text-emerald-600">
                      Scanner Active
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <Download className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-pulse text-indigo-500" />
                  <Input
                    placeholder="AWAITING SERIAL SCAN…"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    className="h-16 rounded-xl border-border/60 bg-muted/30 pl-12 font-mono text-2xl font-semibold tracking-tight placeholder:text-muted-foreground/30 focus-visible:ring-indigo-500/20"
                    autoFocus
                  />
                </div>

                <p className="text-center text-[10px] italic text-muted-foreground">
                  Verified serials will be automatically matched against the manifest.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Product verification table */}
          <div className="rounded-lg border border-border overflow-hidden bg-background shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] text-[10px] font-semibold uppercase tracking-widest">Product</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest">ID</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest">Verified</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest">Target</TableHead>
                  <TableHead className="w-[25%] text-[10px] font-semibold uppercase tracking-widest">Progress</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGroup.items.map((item) => {
                  const product = item.product_id as ProductRow;
                  const targetQty = item.allocated_quantity || 0;
                  const verified = item.receivedQty || 0;
                  const percent = targetQty > 0 ? Math.round((verified / targetQty) * 100) : 0;
                  const isComplete = verified >= targetQty;
                  const productId = typeof item.product_id === 'object'
                    ? item.product_id.product_id
                    : item.product_id;

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'transition-colors border-border/40',
                        isComplete && 'bg-emerald-500/5',
                      )}
                    >
                      <TableCell className="font-semibold text-sm">
                        {product?.product_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {productId}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-foreground">
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
                      <TableCell className="text-right tabular-nums font-semibold text-muted-foreground/60">{targetQty}</TableCell>
                      <TableCell>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700',
                              isComplete ? 'bg-emerald-500' : 'bg-indigo-500',
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Box className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
            {metrics.progress}% Batch Complete
          </span>
        </div>

        <Button
          onClick={() => receiveOrder(selectedGroup.orderNo)}
          disabled={processing || !isAllReceived}
          size="lg"
          className={cn(
            'h-11 rounded-xl px-8 font-semibold tracking-wide shadow-md transition-all active:scale-95',
            isAllReceived
              ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {processing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          FINALIZE RECEIPT
        </Button>
      </div>
    </main>
  );
}

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
    <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background">
        <Icon className="h-3.5 w-3.5 text-indigo-600/60" />
      </div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold leading-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}
