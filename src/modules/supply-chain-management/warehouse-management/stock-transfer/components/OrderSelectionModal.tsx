'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ClipboardList, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { OrderGroup } from '../types';
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
} from '@/components/ui/dialog';

interface OrderSelectionModalProps {
  orderGroups: OrderGroup[];
  selectedOrderNo: string | null;
  onSelect: (orderNo: string | null) => void;
  getBranchName: (id: number | null) => string;
  title?: string;
  description?: string;
  placeholder?: string;
}

export function OrderSelectionModal({
  orderGroups,
  selectedOrderNo,
  onSelect,
  getBranchName,
  title = "Select Approved Transfer",
  description = "Choose an approved stock transfer request to continue.",
  placeholder = "Select Request..."
}: OrderSelectionModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredGroups = orderGroups.filter((group) =>
    group.orderNo.toLowerCase().includes(search.toLowerCase()) ||
    getBranchName(group.sourceBranch).toLowerCase().includes(search.toLowerCase()) ||
    getBranchName(group.targetBranch).toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (orderNo: string | null) => {
    onSelect(orderNo);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 group/trigger relative">
      <ShadcnDialog open={open} onOpenChange={setOpen}>
        <Button
          variant="outline"
          className="flex-1 justify-between text-left font-normal h-10 px-3 border-muted-foreground/20 hover:border-primary/50 group-hover/trigger:border-primary/50"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2 truncate">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            {selectedOrderNo || placeholder}
          </span>
          {!selectedOrderNo && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
        </Button>

        <ShadcnDialogContent className="!sm:max-w-none sm:max-w-[70vw] h-[80vh] flex flex-col p-0 overflow-hidden bg-background border-primary/20 shadow-2xl">
          <ShadcnDialogHeader className="p-6 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <ShadcnDialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-primary" />
                  {title}
                </ShadcnDialogTitle>
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              </div>

              {selectedOrderNo && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  onClick={() => handleSelect(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Current Selection
                </Button>
              )}
            </div>

          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order No, Source, or Target Branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 bg-background border-primary/10 transition-all focus:border-primary focus:ring-primary/20 text-base"
              autoFocus
            />
          </div>
        </ShadcnDialogHeader>

        <div className="flex-1 overflow-auto p-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[200px] font-bold uppercase text-[10px] tracking-widest">Order No</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Source Branch</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Direction</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Target Branch</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Items</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Date Requested</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                      <ClipboardList className="w-12 h-12 opacity-20" />
                      <p className="text-lg font-medium">No requests found</p>
                      <p className="text-sm">Try searching for a different order number or branch.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => (
                  <TableRow
                    key={group.orderNo}
                    className={`group cursor-pointer transition-colors hover:bg-primary/5 ${
                      selectedOrderNo === group.orderNo ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                    onClick={() => handleSelect(group.orderNo)}
                  >
                    <TableCell className="font-mono font-bold text-primary group-hover:text-primary transition-colors">
                      {group.orderNo}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getBranchName(group.sourceBranch)}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground/50 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {getBranchName(group.targetBranch)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-muted text-xs font-bold transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        {group.items.length} Items
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                          ${group.status === 'For Picking' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
                          ${group.status === 'Picking' ? 'bg-blue-100 text-blue-700 border border-blue-200' : ''}
                          ${group.status === 'Picked' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
                        `}>
                          {group.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {new Date(group.dateRequested).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={selectedOrderNo === group.orderNo ? 'default' : 'ghost'}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(group.orderNo);
                        }}
                      >
                        {selectedOrderNo === group.orderNo ? (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        ) : null}
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t bg-muted/10 text-[10px] text-muted-foreground flex justify-between items-center uppercase tracking-widest font-bold">
          <span>Total Requests: {orderGroups.length}</span>
          <span>Showing {filteredGroups.length} matching requests</span>
        </div>
      </ShadcnDialogContent>
    </ShadcnDialog>

    {selectedOrderNo && (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-muted-foreground hover:text-red-600 transition-colors"
        onClick={() => onSelect(null)}
        title="Deselect this order"
      >
        <X className="w-4 h-4" />
      </Button>
    )}
  </div>
);
}
