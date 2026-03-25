'use client';

import React, { KeyboardEvent, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageOpen, ScanLine, Loader2, CheckCircle2 } from 'lucide-react';
import { useStockTransferReceive } from './hooks/useStockTransferReceive';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StockTransferReceiveModule() {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    receiveOrder,
    handleScanRFID,
    getBranchName,
  } = useStockTransferReceive();

  const [rfidInput, setRfidInput] = useState('');

  const onRfidKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const trimmed = rfidInput.trim();
    if (trimmed.length === 0) return;
    
    setRfidInput(''); // Clear immediately
    await handleScanRFID(trimmed);
  };

  const isAllReceived = selectedGroup?.items.every(i => i.receivedQty >= i.ordered_quantity);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Stock Transfer Receive</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Incoming Transfers</CardTitle>
            <CardDescription>
              Scan RFIDs to match and receive For Loading stock transfers.
            </CardDescription>
          </div>
          <PackageOpen className="h-8 w-8 text-muted-foreground" />
        </CardHeader>

        <CardContent className="mt-4 space-y-6">
          {/* Top Control Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Select Order */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select For Loading Transfer
              </label>
              {loading ? (
                <div className="h-10 rounded-md bg-muted/30 animate-pulse" />
              ) : (
                <Select
                  value={selectedOrderNo || ''}
                  onValueChange={setSelectedOrderNo}
                  disabled={orderGroups.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={orderGroups.length === 0 ? "No incoming requests" : "Select an order..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {orderGroups.map((group) => (
                      <SelectItem key={group.orderNo} value={group.orderNo}>
                        {group.orderNo} ({group.items.length} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* RFID Scanner */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Scan RFID to Receive Items
              </label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Scan or type RFID..."
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value)}
                  onKeyDown={onRfidKeyDown}
                  disabled={!selectedGroup}
                  className="h-10 pl-9 text-sm bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* Details & Actions */}
          {selectedGroup && (
            <div className="space-y-6 border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/30 p-4 border-b">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Source Branch</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.sourceBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target Branch</p>
                    <p className="font-medium text-sm">{getBranchName(selectedGroup.targetBranch)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lead Date</p>
                    <p className="font-medium text-sm">{selectedGroup.leadDate || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Date Requested</p>
                    <p className="font-medium text-sm">{new Date(selectedGroup.dateRequested).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b">
                      <TableHead className="text-xs uppercase font-bold">Product ID</TableHead>
                      <TableHead className="text-xs uppercase font-bold">For Loading Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold">Received Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGroup.items.map((item) => {
                      const complete = item.receivedQty >= item.ordered_quantity;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-sm">PRD-{item.product_id}</TableCell>
                          <TableCell className="text-sm">{item.ordered_quantity}</TableCell>
                          <TableCell className="text-sm font-bold">
                            <span className={complete ? 'text-blue-600' : 'text-amber-600'}>
                              {item.receivedQty}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {complete ? (
                              <span className="inline-flex items-center text-blue-600 text-xs font-bold uppercase tracking-wide">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Received
                              </span>
                            ) : (
                              <span className="text-amber-600 text-xs font-bold uppercase tracking-wide">
                                Pending Scan
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    {!isAllReceived && (
                      <span className="text-amber-600 font-medium">Please scan all required items before concluding receive.</span>
                    )}
                  </div>
                  
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                    disabled={processing || !isAllReceived}
                    onClick={() => receiveOrder(selectedGroup.orderNo)}
                  >
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Receive
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
