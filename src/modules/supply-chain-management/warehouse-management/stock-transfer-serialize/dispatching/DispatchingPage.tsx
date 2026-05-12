'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, ScanLine, Loader2, CheckCircle2, Radar, Hash, Clock, AlertCircle, ChevronRight, Target, Activity } from 'lucide-react';
import { useSerializeDispatch } from '../hooks/use-serialize-dispatch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { SerialOrderGroupItem } from '../types/serialize.types';
import type { ProductRow } from '../../stock-transfer/types/stock-transfer.types';

export default function DispatchingPage() {
  const {
    loading,
    processing,
    selectedOrderNo,
    setSelectedOrderNo,
    selectedGroup,
    orderGroups,
    handleSerialInput,
    dispatchOrder,
    recentScans,
    getBranchName
  } = useSerializeDispatch();

  const [serialInput, setSerialInput] = useState('');

  const onSerialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (serialInput.trim()) {
      handleSerialInput(serialInput.trim());
      setSerialInput('');
    }
  };

  const metrics = useMemo(() => {
    if (!selectedGroup) return { totalItems: 0, totalUnits: 0, scannedUnits: 0, progress: 0 };
    
    const items = selectedGroup.items as SerialOrderGroupItem[];
    const totalItems = items.length;
    const totalUnits = items.reduce((acc, i) => acc + Math.max(0, i.allocated_quantity ?? 0), 0);
    const scannedUnits = items.reduce((acc, i) => acc + (i.scannedSerialQty || 0), 0);
    const progress = totalUnits > 0 ? Math.round((scannedUnits / totalUnits) * 100) : 0;

    return { totalItems, totalUnits, scannedUnits, progress };
  }, [selectedGroup]);

  const isAllScanned = selectedGroup?.items.every((i: any) => {
    const targetQty = Math.max(0, i.allocated_quantity ?? 0);
    return (i.scannedSerialQty || 0) >= targetQty;
  });

  return (
    <div className="flex h-full w-full flex-1 min-h-0 overflow-hidden bg-background">
      {/* 1. Left Panel: Order Navigator */}
      <div className="w-80 border-r border-border bg-muted/20 flex flex-col shrink-0">
        <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-foreground">Dispatch Hub</h2>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Select Shipment</p>
        </div>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" />
                <p className="text-xs text-muted-foreground">Syncing transfers...</p>
              </div>
            ) : orderGroups.map((group) => (
              <button
                key={group.orderNo}
                onClick={() => setSelectedOrderNo(group.orderNo)}
                className={cn(
                  "w-full group relative p-4 rounded-2xl transition-all border text-left overflow-hidden",
                  selectedOrderNo === group.orderNo
                    ? "bg-background border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                    : "bg-background/40 border-border hover:border-primary/50 hover:bg-background"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono text-xs font-bold text-foreground tracking-tight">{group.orderNo}</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    selectedOrderNo === group.orderNo ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                  )} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    {getBranchName(group.sourceBranch)}
                    <ChevronRight className="w-3 h-3" />
                    {getBranchName(group.targetBranch)}
                  </p>
                </div>
                {selectedOrderNo === group.orderNo && (
                  <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all" style={{ width: '100%' }} />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 2. Center Panel: Scanning Bay */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {selectedGroup ? (
          <>
            {/* Header Stats */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                    {selectedGroup.orderNo}
                    <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">SERIALIZED</Badge>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Activity className="w-3 h-3" />
                    <span>Real-time picking console</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <HeaderMetric label="Items" value={metrics.totalItems} icon={Package} />
                <HeaderMetric label="Progress" value={`${metrics.progress}%`} icon={Radar} />
                <HeaderMetric label="Remaining" value={metrics.totalUnits - metrics.scannedUnits} icon={Target} />
              </div>
            </div>

            {/* Scanner Focus Area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-8 max-w-5xl mx-auto space-y-10">
                {/* Main Input */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-sky-500/20 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                  <Card className="relative border-2 border-primary/20 bg-background/50 backdrop-blur-sm rounded-[1.5rem] shadow-2xl overflow-hidden">
                    <CardContent className="p-8">
                      <form onSubmit={onSerialSubmit} className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Live Scan Interface</label>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Scanner Ready</span>
                          </div>
                        </div>
                        <div className="relative">
                          <ScanLine className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
                          <Input 
                            placeholder="AWAITING SERIAL SCAN..." 
                            value={serialInput}
                            onChange={(e) => setSerialInput(e.target.value)}
                            className="h-20 pl-16 pr-8 text-3xl font-mono font-black tracking-tighter bg-muted/10 border-none focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-muted-foreground/20 rounded-2xl"
                            autoFocus
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center font-medium italic">
                          System will automatically validate against <span className="text-foreground font-bold">v_serial_onhand</span>
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Product Progress Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(selectedGroup.items as SerialOrderGroupItem[]).map((item) => {
                    const product = item.product_id as ProductRow;
                    const targetQty = item.allocated_quantity || 0;
                    const scanned = item.scannedSerialQty || 0;
                    const percent = Math.round((scanned / targetQty) * 100);
                    const isComplete = scanned >= targetQty;

                    return (
                      <Card key={item.id} className={cn(
                        "group relative overflow-hidden transition-all duration-300 border shadow-sm",
                        isComplete ? "bg-emerald-50/20 border-emerald-500/20 shadow-emerald-500/5" : "bg-card border-border hover:border-primary/30"
                      )}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                              <h4 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{product?.product_name || 'Unknown'}</h4>
                              <p className="text-[10px] font-mono text-muted-foreground">ID: {typeof item.product_id === 'object' ? item.product_id.product_id : item.product_id}</p>
                            </div>
                            {isComplete ? (
                              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-600">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            ) : (
                              <div className="p-2 bg-primary/5 rounded-full text-primary/40">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Progress</span>
                              <span className="text-xl font-black tracking-tight">{scanned}<span className="text-muted-foreground/30 mx-1">/</span>{targetQty}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  isComplete ? "bg-emerald-500" : "bg-primary"
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

            {/* Bottom Actions */}
            <div className="p-6 border-t border-border bg-background/50 backdrop-blur-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${metrics.progress}%` }} />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase">{metrics.progress}% Batch Complete</span>
              </div>
              <Button 
                onClick={() => dispatchOrder(selectedGroup.orderNo)}
                disabled={processing || !isAllScanned}
                className={cn(
                  "h-14 px-10 font-black rounded-2xl shadow-xl transition-all active:scale-95",
                  isAllScanned ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20" : "bg-muted text-muted-foreground"
                )}
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Truck className="w-5 h-5 mr-2" />}
                FINALIZE DISPATCH
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
             <div className="relative mb-8">
              <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-full"></div>
              <Radar className="w-24 h-24 text-primary/10 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-foreground/50">Select an active transfer</h3>
            <p className="text-muted-foreground max-w-xs mt-2 text-sm leading-relaxed">
              Pick a shipment from the left panel to begin your serialized picking workflow.
            </p>
          </div>
        )}
      </div>

      {/* 3. Right Panel: Live Feed */}
      <div className="w-80 border-l border-border bg-muted/10 flex flex-col shrink-0 overflow-hidden">
        <div className="p-6 border-b border-border bg-background/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Audit Log</span>
          </div>
          <Badge variant="secondary" className="bg-background text-[10px] rounded-md">{recentScans.length}</Badge>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {recentScans.length === 0 ? (
              <div className="py-20 text-center opacity-20 select-none">
                <Hash className="w-12 h-12 mx-auto mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">No Recent activity</p>
              </div>
            ) : (
              recentScans.map((scan, idx) => (
                <div 
                  key={scan.timestamp + idx}
                  className={cn(
                    "p-4 rounded-2xl border transition-all animate-in slide-in-from-right-4 duration-500",
                    scan.status === 'SUCCESS' ? "bg-background border-emerald-500/20 shadow-sm" : "bg-red-50/50 border-red-500/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-black text-foreground">{scan.serialNumber}</span>
                    {scan.status === 'SUCCESS' ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium line-clamp-1">
                    {scan.productName || scan.errorType}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function HeaderMetric({ label, value, icon: Icon }: { label: string, value: string | number, icon: any }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-2xl border border-border/50">
      <div className="p-2 bg-background rounded-xl">
        <Icon className="w-4 h-4 text-primary/70" />
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-foreground leading-tight">{value}</span>
      </div>
    </div>
  );
}
