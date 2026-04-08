'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ClipboardCheck, Loader2, RefreshCcw, ChevronLeft, ChevronRight, ServerCrash, X } from 'lucide-react';
import { useStockTransferApproval } from './hooks/useStockTransferApproval';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OrderSelectionModal } from '../components/OrderSelectionModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StockTransferApprovalModule() {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    fetchError,
    updateStatus,
    getBranchName,
    stockTransfers,
    refresh,
    allocatedQtys,
    availableQtys,
    fetchingAvailable,
    updateAllocatedQty,
  } = useStockTransferApproval();

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [productSearch, setProductSearch] = React.useState('');

  // Reset page when group or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrderNo, productSearch]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const filteredItems = React.useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.items.filter((item: any) => {
      const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
      const productName = product?.product_name || `PRD-${item.product_id}`;
      const barcode = product?.barcode || '';
      return (
        productName.toLowerCase().includes(productSearch.toLowerCase()) ||
        barcode.toLowerCase().includes(productSearch.toLowerCase()) ||
        String(item.product_id).includes(productSearch)
      );
    });
  }, [selectedGroup, productSearch]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Dynamic Grand Total based on Allocated Quantities
  const currentTotalAmount = React.useMemo(() => {
    if (!selectedGroup) return 0;
    return selectedGroup.items.reduce((sum: number, item: any) => {
      const qty = allocatedQtys[item.id] ?? item.ordered_quantity ?? 0;
      const unitPrice = item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0;
      return sum + (qty * unitPrice);
    }, 0);
  }, [selectedGroup, allocatedQtys]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Stock Transfer Approval</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refresh()} 
            disabled={loading}
            className="gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl">For Approval</CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>Review and approve stock transfer requests from other branches.</span>
              <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-full">
                {stockTransfers.length} items in {orderGroups.length} groups
              </span>
            </CardDescription>
          </div>
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
        </CardHeader>

        <CardContent className="mt-4 space-y-6">
          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">Loading transfer requests...</span>
              </div>
              <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
              <div className="h-40 rounded-md bg-muted/30 animate-pulse" />
            </div>
          )}

          {/* Server Error Banner */}
          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <ServerCrash className="w-12 h-12 text-destructive/70" />
              <div>
                <p className="font-bold text-destructive">Server Unreachable</p>
                <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
              </div>
              <Button variant="outline" onClick={() => refresh()} className="gap-2">
                <RefreshCcw className="w-4 h-4" /> Retry
              </Button>
            </div>
          )}

          {!loading && !fetchError && (
          <>
          {/* Select Order */}
          <div className="space-y-2 max-w-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Request Number
            </label>
            <OrderSelectionModal 
              orderGroups={orderGroups}
              selectedOrderNo={selectedOrderNo}
              onSelect={setSelectedOrderNo}
              getBranchName={getBranchName}
              title="Select Pending Approval"
              description="Choose a stock transfer request to review and approve/reject."
              placeholder="Select Request Number..."
            />
          </div>

          {/* Details & Actions */}
          {selectedGroup && (
            <div className="space-y-6 border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/30 p-4 border-b">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Source</p>
                      <p className="font-medium text-sm truncate">{getBranchName(selectedGroup.sourceBranch)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target</p>
                      <p className="font-medium text-sm truncate">{getBranchName(selectedGroup.targetBranch)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lead Date</p>
                      <p className="font-medium text-sm whitespace-nowrap">{formatDate(selectedGroup.leadDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Requested</p>
                      <p className="font-medium text-sm whitespace-nowrap">{formatDate(selectedGroup.dateRequested)}</p>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-64 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                    {productSearch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setProductSearch('')}
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b">
                      <TableHead className="text-xs uppercase font-bold">Product Name</TableHead>
                      <TableHead className="text-xs uppercase font-bold">Description</TableHead>
                      <TableHead className="text-xs uppercase font-bold">Brand</TableHead>
                      <TableHead className="text-xs uppercase font-bold">Unit</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-center">Order Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-center">Available Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-center">Allocated Qty</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item: any) => {
                      const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
                      const productName = product?.product_name || `PRD-${item.product_id}`;
                      const description = product?.description || product?.barcode || 'N/A';
                      const brandName = product?.product_brand?.brand_name || 'N/A';
                      const unitName = product?.unit_of_measurement?.unit_name || 'unit';

                      const originalId = product ? (product.product_id || product.id) : item.product_id;

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/5">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{productName}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">ID: {String(originalId || 'N/A')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={description}>{description}</TableCell>
                          <TableCell className="text-xs font-medium text-primary uppercase">{brandName}</TableCell>
                          <TableCell className="text-xs font-medium uppercase text-muted-foreground">{unitName}</TableCell>
                          <TableCell className="text-sm text-center font-medium">{item.ordered_quantity}</TableCell>
                          <TableCell className="text-sm text-center font-medium">
                            {fetchingAvailable ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto text-muted-foreground" />
                            ) : (
                              availableQtys[item.id] ?? '—'
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <Input
                              type="number"
                              className="h-8 w-20 text-center mx-auto"
                              value={allocatedQtys[item.id] ?? item.ordered_quantity}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const maxAllowed = Math.min(item.ordered_quantity || 0, availableQtys[item.id] || 0);
                                updateAllocatedQty(item.id, Number(e.target.value), maxAllowed);
                              }}
                              max={Math.min(item.ordered_quantity || 0, availableQtys[item.id] || 0)}
                              min={0}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold">
                            ₱{((allocatedQtys[item.id] ?? item.ordered_quantity ?? 0) * (item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0)).toLocaleString('en-PH', {minimumFractionDigits: 2})}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className="bg-muted/30">
                    <TableRow>
                      <TableCell colSpan={7} className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">Grand Total</TableCell>
                      <TableCell className="text-right text-base font-bold text-emerald-600 py-4">
                        ₱{currentTotalAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>

                {/* Pagination Controls */}
                <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
                      Rows per page
                    </div>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] text-xs font-medium border-muted-foreground/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 30, 50, 100].map((v) => (
                          <SelectItem key={v} value={String(v)} className="text-xs">
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Showing {totalItems === 0 ? 0 : Math.min(itemsPerPage * (currentPage - 1) + 1, totalItems)} to {Math.min(itemsPerPage * currentPage, totalItems)} of {totalItems} Products
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-8 px-3"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 p-0 ${currentPage === page ? 'shadow-sm border-primary/30' : ''}`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-8 px-3"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        disabled={processing}
                      >
                        Reject Request
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Stock Transfer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure to reject this ST#{selectedGroup.orderNo}? 
                          This action cannot be undone and will notify the requesting branch.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updateStatus(selectedGroup.orderNo, 'rejected')}
                          className="bg-destructive hover:bg-destructive/90 text-white"
                        >
                          Yes, Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10"
                        disabled={processing || fetchingAvailable || currentTotalAmount === 0}
                      >
                        {(processing || fetchingAvailable) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {fetchingAvailable ? 'Syncing Stock...' : 'Approve (For Picking)'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve Stock Transfer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to approve this ST request? 
                          Once approved, the source branch will be notified to begin picking the items.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updateStatus(selectedGroup.orderNo, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Yes, Approve
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
