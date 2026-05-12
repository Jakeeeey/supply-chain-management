'use client';

import { useState, useMemo } from 'react';
import { useSerializeReceive } from '../hooks/use-serialize-receive';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Package, 
  Hash, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    getBranchName
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
    if (!selectedGroup) return { totalItems: 0, totalUnits: 0, receivedUnits: 0, progress: 0 };
    
    const items = selectedGroup.items as SerialOrderGroupItem[];
    const totalItems = items.length;
    const totalUnits = items.reduce((acc, i) => acc + Math.max(0, i.allocated_quantity ?? 0), 0);
    const receivedUnits = items.reduce((acc, i) => acc + (i.receivedSerialQty || 0), 0);
    const progress = totalUnits > 0 ? Math.round((receivedUnits / totalUnits) * 100) : 0;

    return { totalItems, totalUnits, receivedUnits, progress };
  }, [selectedGroup]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50">
      {/* Sidebar: Order List */}
      <div className="w-80 border-r bg-white flex flex-col shrink-0">
        <div className="p-4 border-b bg-slate-50/50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Serialized Receiving
          </h2>
          <p className="text-xs text-slate-500 mt-1">Select a dispatched order to verify</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-400">Loading orders...</div>
            ) : orderGroups.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No orders found</div>
            ) : (
              orderGroups.map((group) => (
                <button
                  key={group.orderNo}
                  onClick={() => setSelectedOrderNo(group.orderNo)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all border",
                    selectedOrderNo === group.orderNo
                      ? "bg-primary/5 border-primary/20 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-slate-50"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs font-bold text-slate-900">{group.orderNo}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">
                      {group.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {getBranchName(group.sourceBranch)} → {getBranchName(group.targetBranch)}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedGroup ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
              {/* Status Header */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedGroup.orderNo}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-medium text-slate-700">{getBranchName(selectedGroup.sourceBranch)}</span>
                      <span>→</span>
                      <span className="font-medium text-slate-700">{getBranchName(selectedGroup.targetBranch)}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1">
                  {selectedGroup.status}
                </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <MetricCard 
                  label="Verification Progress" 
                  value={`${metrics.progress}%`} 
                  subValue={`${metrics.receivedUnits} / ${metrics.totalUnits} Verified`}
                  icon={CheckCircle2}
                  color="text-primary"
                />
                <MetricCard 
                  label="Total Items" 
                  value={metrics.totalItems} 
                  subValue="Unique SKU Groups"
                  icon={Package}
                  color="text-indigo-500"
                />
                <MetricCard 
                  label="Remaining" 
                  value={metrics.totalUnits - metrics.receivedUnits} 
                  subValue="Units to Verify"
                  icon={Hash}
                  color="text-amber-500"
                />
              </div>

              {/* Serial Verification Card */}
              <Card className="border-2 border-primary/20 shadow-md bg-white">
                <CardHeader className="pb-3 border-b bg-slate-50/30">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Verify Serial Number
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={onSerialSubmit} className="flex gap-2">
                    <Input 
                      placeholder="Type or scan serial to verify..." 
                      value={serialInput}
                      onChange={(e) => setSerialInput(e.target.value)}
                      className="flex-1 font-mono text-lg h-12"
                      autoFocus
                    />
                    <Button type="submit" disabled={!serialInput.trim() || processing} variant="default" className="h-12 px-6">
                      Verify
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Items Table */}
              <Card className="flex-1 overflow-hidden flex flex-col bg-white">
                <CardHeader className="py-3 bg-slate-50/50 border-b">
                  <CardTitle className="text-sm font-bold">Items for Verification</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                   <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-center">Allocated</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-center">Received</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedGroup.items as SerialOrderGroupItem[]).map((item) => {
                        const product = item.product_id as ProductRow;
                        const targetQty = item.allocated_quantity || 0;
                        const complete = (item.receivedSerialQty || 0) >= targetQty;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{product?.product_name || 'Unknown Product'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold">{targetQty}</TableCell>
                            <TableCell className="text-center font-mono font-bold text-primary">
                              {item.receivedSerialQty || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {complete ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none">
                                  Complete
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 border-slate-200">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
              
              {/* Footer Actions */}
              <div className="flex justify-end pt-4 border-t gap-3">
                <Button variant="outline" onClick={() => setSelectedOrderNo(null)}>
                  Back
                </Button>
                <Button 
                  onClick={() => receiveOrder(selectedGroup.orderNo)}
                  disabled={processing || metrics.receivedUnits === 0}
                  className="px-8 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
                >
                  {processing ? 'Processing...' : 'Complete Receipt'}
                </Button>
              </div>
            </div>

            {/* Right Sidebar: Recent Verifications */}
            <div className="w-80 border-l bg-white flex flex-col shrink-0 overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Verifications
                </h3>
                <Badge variant="secondary" className="bg-slate-100 text-[10px] uppercase">
                  {recentScans.length} Total
                </Badge>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {recentScans.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                        <Hash className="w-6 h-6 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400">No verifications yet</p>
                    </div>
                  ) : (
                    recentScans.map((scan, idx) => (
                      <div 
                        key={scan.timestamp + idx}
                        className={`p-3 rounded-lg border text-sm transition-all animate-in slide-in-from-right-4 duration-300 ${
                          scan.status === 'SUCCESS' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-slate-700">{scan.serialNumber}</span>
                          {scan.status === 'SUCCESS' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate font-medium">
                          {scan.productName || scan.errorType}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
            <Download className="w-16 h-16 mb-4 opacity-10" />
            <h3 className="text-lg font-bold text-slate-400">No Dispatched Order Selected</h3>
            <p className="text-sm">Select an order from the list to start verifying serials for receipt.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subValue, icon: Icon, color }: {
  label: string;
  value: string | number;
  subValue: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-4 flex items-start justify-between shadow-sm">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="text-[10px] text-slate-500 font-medium">{subValue}</p>
      </div>
      <div className={cn("p-2 rounded-lg bg-slate-50", color)}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}
