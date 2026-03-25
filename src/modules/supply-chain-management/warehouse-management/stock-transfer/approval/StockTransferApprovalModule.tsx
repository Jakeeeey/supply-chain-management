'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { useStockTransferApproval } from './hooks/useStockTransferApproval';
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

export default function StockTransferApprovalModule() {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    updateStatus,
    getBranchName,
  } = useStockTransferApproval();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Stock Transfer Approval</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Pending Approvals</CardTitle>
            <CardDescription>
              Review and approve stock transfer requests from other branches.
            </CardDescription>
          </div>
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
        </CardHeader>

        <CardContent className="mt-4 space-y-6">
          {/* Select Order */}
          <div className="space-y-2 max-w-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Request Number
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
                  <SelectValue placeholder={orderGroups.length === 0 ? "No pending requests" : "Select an order..."} />
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
                      <TableHead className="text-xs uppercase font-bold">Order Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGroup.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">PRD-{item.product_id}</TableCell>
                        <TableCell className="text-sm">{item.ordered_quantity}</TableCell>
                        <TableCell className="text-right text-sm">₱{Number(item.amount).toLocaleString('en-PH', {minimumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button 
                    variant="outline" 
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    disabled={processing}
                    onClick={() => updateStatus(selectedGroup.orderNo, 'rejected')}
                  >
                    Reject Request
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={processing}
                    onClick={() => updateStatus(selectedGroup.orderNo, 'approved')}
                  >
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve (For Picking)
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
