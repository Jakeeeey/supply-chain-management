'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Search, 
  RefreshCcw, 
  Calendar,
  Layers,
  MapPin,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Loader2,
  ServerCrash,
  Filter,
  ExternalLink
} from 'lucide-react';
import { useStockTransferSummary, SortConfig } from './hooks/use-stock-transfer-summary';
import { TransferDetailModal } from './components/TransferDetailModal';
import { SearchableCombobox } from '../shared/components/searchable-combobox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  filters: { sort: SortConfig };
  toggleSort: (key: string) => void;
  className?: string;
}

const SortableHeader = ({ label, sortKey, filters, toggleSort, className }: SortableHeaderProps) => {
  const isSorted = filters.sort.key === sortKey;
  const direction = filters.sort.direction;
  
  return (
    <TableHead 
      className={cn(
        "font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-muted/30 transition-colors group/header",
        isSorted && "text-primary bg-primary/5",
        className
      )}
      onClick={() => toggleSort(sortKey)}
    >
      <div className={cn("flex items-center gap-1.5", className?.includes('text-center') && "justify-center", className?.includes('text-right') && "justify-end")}>
        {label}
        {isSorted ? (
          direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />
        )}
      </div>
    </TableHead>
  );
};

export default function StockTransferSummaryView() {
  const {
    loading,
    fetchError,
    refresh,
    getBranchName,
    branches,
    filters,
    updateFilter,
    resetFilters,
    filteredGroups,
    availableStatuses,
    isModalOpen,
    setIsModalOpen,
    selectedGroup,
    handleViewDetails,
    toggleSort,
    getUserName,
    getUnitName,
  } = useStockTransferSummary();

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  // Reset page when filters or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage, itemsPerPage]);

  const branchOptions = React.useMemo(() => [
    { value: 'all', label: 'All Branches' },
    ...branches.map(b => ({ value: String(b.id), label: b.branch_name || b.name || `Branch ${b.id}` }))
  ], [branches]);

  const statusOptions = React.useMemo(() => [
    { value: 'all', label: 'All Statuses' },
    ...availableStatuses.map(s => ({ value: s, label: s }))
  ], [availableStatuses]);

  function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (current > 3) pages.push('ellipsis');
    const rangeStart = Math.max(2, current - 1);
    const rangeEnd = Math.min(total - 1, current + 1);
    for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
    if (current < total - 2) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Stock Transfer Summary</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refresh()} 
            disabled={loading}
            className="gap-2 border-border shadow-none"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="border-border shadow-none bg-card/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Search className="w-3 h-3" /> Search
              </label>
              <Input
                placeholder="Order No / Product..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="h-9 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3 h-3" /> Status
              </label>
              <SearchableCombobox
                options={statusOptions}
                value={filters.status}
                onValueChange={(val) => updateFilter('status', val || 'all')}
                placeholder="Select Status"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Source
              </label>
              <SearchableCombobox
                options={branchOptions}
                value={filters.sourceBranch}
                onValueChange={(val) => updateFilter('sourceBranch', val || 'all')}
                placeholder="Select Source"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Target
              </label>
              <SearchableCombobox
                options={branchOptions}
                value={filters.targetBranch}
                onValueChange={(val) => updateFilter('targetBranch', val || 'all')}
                placeholder="Select Target"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Period
              </label>
              <Select
                value={filters.datePreset}
                onValueChange={(val) => updateFilter('datePreset', val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background border-border shadow-none">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today" className="text-xs">Today</SelectItem>
                  <SelectItem value="yesterday" className="text-xs">Yesterday</SelectItem>
                  <SelectItem value="week" className="text-xs">Last 7 Days</SelectItem>
                  <SelectItem value="month" className="text-xs">Last 30 Days</SelectItem>
                  <SelectItem value="custom" className="text-xs">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> From
              </label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="h-9 text-xs bg-background border-border shadow-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> To
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="h-9 text-xs bg-background border-border flex-1 shadow-none"
                />
                <Button variant="ghost" size="icon" onClick={resetFilters} className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main List Section */}
      <Card className="border-border shadow-none bg-card overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Transfer Records</CardTitle>
              <CardDescription className="text-xs">
                History and active requests of all stock transfers.
              </CardDescription>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
              {filteredGroups.length} Matches Found
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading transfers...</p>
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <ServerCrash className="w-12 h-12 text-destructive/50" />
              <div>
                <p className="font-bold text-destructive">Data Retrieval Failed</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-xs">{fetchError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refresh()}>Try Again</Button>
            </div>
          )}

          {!loading && !fetchError && (
            <>
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow className="border-b border-border">
                    <SortableHeader label="Reference No" sortKey="orderNo" filters={filters} toggleSort={toggleSort} className="pl-6" />
                    <SortableHeader label="Source Branch" sortKey="sourceBranch" filters={filters} toggleSort={toggleSort} />
                    <SortableHeader label="Target Branch" sortKey="targetBranch" filters={filters} toggleSort={toggleSort} />
                    <SortableHeader label="Items" sortKey="items" filters={filters} toggleSort={toggleSort} className="text-center" />
                    <SortableHeader label="Value" sortKey="totalAmount" filters={filters} toggleSort={toggleSort} className="text-right" />
                    <SortableHeader label="Requested At" sortKey="dateRequested" filters={filters} toggleSort={toggleSort} className="text-center" />
                    <SortableHeader label="Status" sortKey="status" filters={filters} toggleSort={toggleSort} className="text-center" />
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground opacity-30">
                          <Filter className="w-10 h-10" />
                          <p className="text-sm font-bold uppercase tracking-widest">No transfers match your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedGroups.map((group) => (
                      <TableRow 
                        key={group.orderNo} 
                        className="group hover:bg-muted/5 border-b border-border/50 cursor-pointer transition-colors"
                        onClick={() => handleViewDetails(group)}
                      >
                        <TableCell className="pl-6">
                          <span className="font-mono font-bold text-primary text-sm tracking-tight">{group.orderNo}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold truncate max-w-[150px] block" title={getBranchName(group.sourceBranch)}>{getBranchName(group.sourceBranch)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] block" title={getBranchName(group.targetBranch)}>{getBranchName(group.targetBranch)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[9px] font-bold border-border bg-background">
                            {group.items.length} {group.items.length === 1 ? 'Item' : 'Items'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-xs font-bold">
                            ₱{group.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {new Date(group.dateRequested).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "font-black uppercase tracking-widest text-[9px] rounded-[4px] px-2 py-0.5 border shadow-none",
                              group.status === 'Requested' && "bg-muted text-muted-foreground border-muted",
                              group.status === 'For Picking' && "bg-amber-100 text-amber-700 border-amber-200",
                              group.status === 'Picking' && "bg-blue-100 text-blue-700 border-blue-200",
                              group.status === 'Picked' && "bg-emerald-100 text-emerald-700 border-emerald-200",
                              group.status === 'For Loading' && "bg-sky-100 text-sky-700 border-sky-200",
                              group.status === 'Received' && "bg-emerald-600 text-white border-emerald-600",
                              group.status === 'Rejected' && "bg-destructive text-white border-destructive"
                            )}
                          >
                            {group.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6">
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-3.5 h-3.5 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Section */}
              {filteredGroups.length > 0 && (
                <div className="p-4 border-t border-border bg-muted/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
                      Showing {Math.min(itemsPerPage * (currentPage - 1) + 1, filteredGroups.length)} to {Math.min(itemsPerPage * currentPage, filteredGroups.length)} of {filteredGroups.length} transfers
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Show</span>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(v) => setItemsPerPage(Number(v))}
                      >
                        <SelectTrigger className="h-7 w-[65px] text-[10px] font-bold border-border shadow-none bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50, 100].map((s) => (
                            <SelectItem key={s} value={String(s)} className="text-[10px] font-bold">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <Pagination className="w-auto mx-0 justify-end scale-90 origin-right">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)); }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-40' : ''}
                          />
                        </PaginationItem>
                        
                        {buildPageList(currentPage, totalPages).map((p, i) =>
                          p === 'ellipsis' ? (
                            <PaginationItem key={`ellipsis-${i}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={p}>
                              <PaginationLink
                                href="#"
                                isActive={p === currentPage}
                                onClick={(e) => { e.preventDefault(); setCurrentPage(p); }}
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-40' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TransferDetailModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        group={selectedGroup}
        getBranchName={getBranchName}
        getUserName={getUserName}
        getUnitName={getUnitName}
      />
    </div>
  );
}
