'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ClipboardCheck, Loader2, RefreshCcw, ChevronLeft, ChevronRight, ServerCrash, X } from 'lucide-react';
import { useStockTransferApproval } from '../hooks/use-stock-transfer-approval';
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

// Shared components
import { OrderSelectionModal } from '../components/shared/OrderSelectionModal';
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

export default function StockTransferApprovalView() {
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
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Stock Transfer Approval</h2>
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

      <Card className="border-border shadow-none bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Review Requests</CardTitle>
            <CardDescription>
              Validate stock availability and approve transfers for picking.
            </CardDescription>
          </div>
          <ClipboardCheck className="h-8 w-8 text-muted-foreground/30" />
        </CardHeader>

        <CardContent className="mt-4 space-y-6">
          {loading && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-medium">Fetching orders...</span>
              </div>
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <ServerCrash className="w-12 h-12 text-destructive/50" />
              <div>
                <p className="font-bold text-destructive">Connection Error</p>
                <p className="text-xs text-muted-foreground mt-1">{fetchError}</p>
              </div>
              <Button variant="outline" onClick={() => refresh()} className="gap-2">
                <RefreshCcw className="w-4 h-4" /> Try Again
              </Button>
            </div>
          )}

          {!loading && !fetchError && (
          <>
          <div className="space-y-2 max-w-sm">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Request Order Number
            </label>
            <OrderSelectionModal 
              orderGroups={orderGroups}
              selectedOrderNo={selectedOrderNo}
              onSelect={setSelectedOrderNo}
              getBranchName={getBranchName}
              title="Select Pending Approval"
              description="Review stock transfer requests."
              placeholder="Search request number..."
            />
          </div>

          {selectedGroup && (
            <div className="space-y-6 border border-border rounded-xl overflow-hidden bg-card/50">
              <div className="bg-muted/30 p-4 border-b border-border">
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
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Requested At</p>
                      <p className="font-medium text-sm whitespace-nowrap">{formatDate(selectedGroup.dateRequested)}</p>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-64 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9 h-9 text-xs bg-background border-border"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Brand</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Unit</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Ordered</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Available</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-center">Allocation</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right">Draft Total</TableHead>
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
                        <TableRow key={item.id} className="hover:bg-muted/5 border-b border-border/50">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{productName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">ID: {String(originalId || 'N/A')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{description}</TableCell>
                          <TableCell className="text-[10px] font-bold text-primary uppercase">{brandName}</TableCell>
                          <TableCell className="text-[10px] font-medium uppercase text-muted-foreground">{unitName}</TableCell>
                          <TableCell className="text-sm text-center font-medium">{item.ordered_quantity}</TableCell>
                          <TableCell className="text-sm text-center">
                            {fetchingAvailable ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto text-primary" />
                            ) : (
                              <span className="font-mono text-xs">{availableQtys[item.id] ?? '—'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <Input
                              type="number"
                              className="h-8 w-16 text-center mx-auto text-xs bg-background border-border"
                              value={allocatedQtys[item.id] ?? item.ordered_quantity}
                              onChange={(e) => {
                                const maxAllowed = Math.min(item.ordered_quantity || 0, availableQtys[item.id] || 0);
                                updateAllocatedQty(item.id, Number(e.target.value), maxAllowed);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-foreground">
                            ₱{((allocatedQtys[item.id] ?? item.ordered_quantity ?? 0) * (item.ordered_quantity > 0 ? (Number(item.amount || 0) / item.ordered_quantity) : 0)).toLocaleString('en-PH', {minimumFractionDigits: 2})}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className="bg-muted/10">
                    <TableRow>
                      <TableCell colSpan={7} className="text-right font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-4">Total Value</TableCell>
                      <TableCell className="text-right text-base font-bold text-emerald-600 py-4">
                        ₱{currentTotalAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold"
                        disabled={processing}
                      >
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will cancel the transfer request.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updateStatus(selectedGroup.orderNo, 'rejected')}
                          className="bg-destructive hover:bg-destructive/90 text-white"
                        >
                          Confirm Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-none font-bold text-xs"
                        disabled={processing || fetchingAvailable || currentTotalAmount === 0}
                      >
                        {(processing || fetchingAvailable) && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        {fetchingAvailable ? 'Checking Inventory...' : 'Approve & Release'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve Transfer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Release items for picking and dispatching.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updateStatus(selectedGroup.orderNo, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Confirm Approval
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
