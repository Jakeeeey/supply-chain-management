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
import { Search, ClipboardList, CheckCircle2, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderGroup } from '../../types/stock-transfer.types';
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
  title = "Select Active Transfer",
  description = "Choose an order record to load details.",
  placeholder = "Search Reference..."
}: OrderSelectionModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredGroups = orderGroups.filter((group) =>
    group.orderNo.toLowerCase().includes(search.toLowerCase()) ||
    getBranchName(group.sourceBranch).toLowerCase().includes(search.toLowerCase()) ||
    getBranchName(group.targetBranch).toLowerCase().includes(search.toLowerCase())
  );
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  const totalItems = filteredGroups.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
          className="flex-1 justify-between text-left font-normal h-10 px-3 border-border bg-background shadow-none hover:bg-muted/50 transition-all rounded-lg group-hover/trigger:border-primary/30"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2 truncate">
            <ClipboardList className="w-4 h-4 text-muted-foreground/50" />
            <span className={selectedOrderNo ? "font-bold font-mono text-primary" : "text-muted-foreground"}>
              {selectedOrderNo || placeholder}
            </span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 transition-transform group-hover/trigger:translate-x-0.5" />
        </Button>

        <ShadcnDialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
          <ShadcnDialogHeader className="p-6 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <ShadcnDialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  {title}
                </ShadcnDialogTitle>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest opacity-70">
                  {description}
                </p>
              </div>

              {selectedOrderNo && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10 h-7 text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => handleSelect(null)}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>

          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input
              placeholder="Filter by No, Branch Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-background border-border shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 text-sm"
              autoFocus
            />
          </div>
        </ShadcnDialogHeader>

        <div className="flex-1 overflow-auto p-2 scrollbar-hide">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                <TableHead className="w-[180px] font-bold uppercase text-[10px] tracking-widest">Reference No</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Direction</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Items</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">Requested</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground opacity-30">
                      <ClipboardList className="w-10 h-10" />
                      <p className="text-sm font-bold uppercase tracking-widest">No entries found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group) => (
                  <TableRow
                    key={group.orderNo}
                    className={`group cursor-pointer transition-colors border-b border-border/50 hover:bg-primary/5 ${
                      selectedOrderNo === group.orderNo ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelect(group.orderNo)}
                  >
                    <TableCell className="font-mono font-bold text-primary text-xs">
                      {group.orderNo}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="truncate max-w-[120px]">{getBranchName(group.sourceBranch)}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
                        <span className="truncate max-w-[120px] text-muted-foreground">{getBranchName(group.targetBranch)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-[10px]">
                      {group.items.length} PRD
                    </TableCell>
                    <TableCell className="text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest border
                          ${group.status === 'For Picking' ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}
                          ${group.status === 'Picking' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}
                          ${group.status === 'Picked' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}
                          ${group.status === 'Requested' ? 'bg-muted text-muted-foreground border-muted' : ''}
                          ${group.status === 'For Loading' ? 'bg-sky-100 text-sky-700 border-sky-200' : ''}
                        `}>
                          {group.status}
                        </span>
                    </TableCell>
                    <TableCell className="text-right text-[10px] text-muted-foreground font-medium">
                      {new Date(group.dateRequested).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className={`w-2 h-2 rounded-full mx-auto transition-all ${selectedOrderNo === group.orderNo ? 'bg-primary scale-125' : 'bg-transparent'}`} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
           <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Showing {Math.min(itemsPerPage * (currentPage - 1) + 1, totalItems)} to {Math.min(itemsPerPage * currentPage, totalItems)} of {totalItems} orders
            </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 scale-90">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-xs font-bold px-3">
                    {currentPage} / {totalPages}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
          )}
        </div>
      </ShadcnDialogContent>
    </ShadcnDialog>

    {selectedOrderNo && (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-8 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100"
        onClick={() => onSelect(null)}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    )}
  </div>
);
}
