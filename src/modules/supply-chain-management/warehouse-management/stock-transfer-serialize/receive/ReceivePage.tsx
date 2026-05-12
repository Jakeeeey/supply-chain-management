'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Download, Package, Hash, Clock, CheckCircle2,
  AlertCircle, ScanLine, Loader2, ChevronRight, Box,
} from 'lucide-react';
import { useSerializeReceive } from '../hooks/use-serialize-receive';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { SerialOrderGroupItem } from '../types/serialize.types';
import type { ProductRow } from '../../stock-transfer/types/stock-transfer.types';

export default function ReceivePage() {
  const {
    loading,
    processing,
    selectedOrderNo,
    setSelectedOrderNo,
    selectedGroup,
    orderGroups,
    handleSerialInput,
    receiveOrder,
    recentScans,
    getBranchName,
  } = useSerializeReceive();

  const [serialInput, setSerialInput] = useState('');

  const onSerialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (serialInput.trim()) {
      handleSerialInput(serialInput.trim());
      setSerialInput('');
    }
  };

  const metrics = useMemo(() => {
    if (!selectedGroup)
      return { totalItems: 0, totalUnits: 0, receivedUnits: 0, progress: 0 };
    const items = selectedGroup.items as SerialOrderGroupItem[];
    const totalItems = items.length;
    const totalUnits = items.reduce(
      (acc, i) => acc + Math.max(0, i.allocated_quantity ?? 0),
      0,
    );
    const receivedUnits = items.reduce(
      (acc, i) => acc + (i.receivedSerialQty || 0),
      0,
    );
    const progress =
      totalUnits > 0 ? Math.round((receivedUnits / totalUnits) * 100) : 0;
    return { totalItems, totalUnits, receivedUnits, progress };
  }, [selectedGroup]);

  const isAllScanned = selectedGroup?.items.every((i: any) => {
    const targetQty = Math.max(0, i.allocated_quantity ?? 0);
    return (i.receivedSerialQty || 0) >= targetQty;
  });

  return (
    <div className="flex h-full w-full flex-1 min-h-0 overflow-hidden bg-background">

      {/* ── Left Panel: Inbound Bay ── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-muted/20 min-h-0">
        {/* Panel header */}
        <div className="flex items-center gap-3 border-b border-border bg-background/60 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <Download className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Inbound Bay</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Select Shipment
            </p>
          </div>
        </div>

        {/* Shipment list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 p-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500/40" />
                <p className="text-xs text-muted-foreground">Tracking shipments…</p>
              </div>
            ) : (
              orderGroups.map((group) => {
                const isSelected = selectedOrderNo === group.orderNo;
                return (
                  <button
                    key={group.orderNo}
                    onClick={() => setSelectedOrderNo(group.orderNo)}
                    className={cn(
                      'group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-all',
                      isSelected
                        ? 'border-indigo-500/40 bg-background shadow-sm ring-1 ring-indigo-500/20'
                        : 'border-border bg-background/40 hover:border-indigo-500/30 hover:bg-background',
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold tracking-tight text-foreground">
                        {group.orderNo}
                      </span>
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full transition-colors',
                          isSelected
                            ? 'animate-pulse bg-indigo-500'
                            : 'bg-muted-foreground/30',
                        )}
                      />
                    </div>
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {getBranchName(group.sourceBranch)}
                      <ChevronRight className="h-3 w-3" />
                      {getBranchName(group.targetBranch)}
                    </p>
                    {isSelected && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Center Panel: Verification Bay ── */}
      <main className="relative flex min-w-0 min-h-0 flex-1 flex-col bg-background">
        {selectedGroup ? (
          <>
            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-6 py-4 backdrop-blur-md">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
                  {selectedGroup.orderNo}
                  <Badge
                    variant="outline"
                    className="border-indigo-500/20 bg-indigo-500/5 text-indigo-600"
                  >
                    VERIFICATION
                  </Badge>
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Download className="h-3 w-3" />
                  Inbound verification console
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                          Verification Interface
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                          <span className="text-[10px] font-bold uppercase text-indigo-600">
                            Verification Ready
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <ScanLine className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-pulse text-indigo-600" />
                        <Input
                          placeholder="SCAN SERIAL TO VERIFY…"
                          value={serialInput}
                          onChange={(e) => setSerialInput(e.target.value)}
                          className="h-16 rounded-xl border-border/60 bg-muted/30 pl-12 font-mono text-2xl font-black tracking-tight placeholder:text-muted-foreground/30 focus-visible:ring-indigo-500/30"
                          autoFocus
                        />
                      </div>

                      <p className="text-center text-[10px] italic text-muted-foreground">
                        Matching against{' '}
                        <span className="font-bold text-foreground">Dispatched</span>{' '}
                        serial logs
                      </p>
                    </form>
                  </CardContent>
                </Card>

                {/* Product verification grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(selectedGroup.items as SerialOrderGroupItem[]).map((item) => {
                    const product = item.product_id as ProductRow;
                    const targetQty = item.allocated_quantity || 0;
                    const verified = item.receivedSerialQty || 0;
                    const percent = targetQty > 0 ? Math.round((verified / targetQty) * 100) : 0;
                    const isComplete = verified >= targetQty;

                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'overflow-hidden border transition-all duration-300',
                          isComplete
                            ? 'border-indigo-500/20 bg-indigo-500/5'
                            : 'border-border hover:border-indigo-500/30',
                        )}
                      >
                        <CardContent className="p-5">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate font-semibold text-foreground">
                                {product?.product_name || 'Unknown'}
                              </h4>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                ID:{' '}
                                {typeof item.product_id === 'object'
                                  ? item.product_id.product_id
                                  : item.product_id}
                              </p>
                            </div>
                            <div
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                isComplete
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-indigo-500/5 text-indigo-400',
                              )}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Box className="h-4 w-4" />
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Verified
                              </span>
                              <span className="text-lg font-black tracking-tight">
                                {verified}
                                <span className="mx-1 text-muted-foreground/30">/</span>
                                {targetQty}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-700',
                                  isComplete ? 'bg-emerald-500' : 'bg-indigo-500',
                                )}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
                <span className="text-[10px] font-black uppercase text-muted-foreground">
                  {metrics.progress}% Verified
                </span>
              </div>

              <Button
                onClick={() => receiveOrder(selectedGroup.orderNo)}
                disabled={processing || !isAllScanned}
                size="lg"
                className={cn(
                  'h-11 rounded-xl px-8 font-black tracking-wide shadow-md transition-all active:scale-95',
                  isAllScanned
                    ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                COMPLETE RECEIPT
              </Button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/5">
              <Download className="h-10 w-10 text-indigo-500/20" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground/40">
                Select inbound shipment
              </h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Choose an order from the inbound bay to start the serialized verification
                process.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── Right Panel: Audit Log ── */}
      <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-muted/10 min-h-0">
        <div className="flex items-center justify-between border-b border-border bg-background/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold">Audit Log</span>
          </div>
          <Badge variant="secondary" className="rounded-md text-[10px]">
            {recentScans.length}
          </Badge>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 p-3">
            {recentScans.length === 0 ? (
              <div className="flex select-none flex-col items-center justify-center gap-2 py-20 text-center opacity-20">
                <Hash className="h-10 w-10" />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  No verifications recorded
                </p>
              </div>
            ) : (
              recentScans.map((scan, idx) => (
                <div
                  key={scan.timestamp + idx}
                  className={cn(
                    'animate-in slide-in-from-right-4 rounded-xl border p-3.5 transition-all duration-300',
                    scan.status === 'SUCCESS'
                      ? 'border-emerald-500/20 bg-background shadow-sm'
                      : 'border-destructive/20 bg-destructive/5',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-black text-foreground">
                      {scan.serialNumber}
                    </span>
                    {scan.status === 'SUCCESS' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                  <p className="line-clamp-1 text-[10px] font-medium text-muted-foreground">
                    {scan.productName || scan.errorType}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

/* ── Shared sub-component ── */
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
        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-bold leading-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}