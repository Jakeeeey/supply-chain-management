'use client';

import React, { useState, useEffect } from 'react';
import {
    RotateCcw,
    PackageCheck,
    PackageX,
    ClipboardList,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DispatchRow, ReconciliationRow, RFIDMapping } from '../types';
import { submitClearance, fetchRFIDTagsForDispatch } from '../providers/fetchProviders';
import ReconciliationDetailModal from './ReconciliationDetailModal';

interface ClearanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    dispatch: DispatchRow;
}

const STATUS_VARIANTS = {
    'Fulfilled': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    'Unfulfilled': 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20',
    'Fulfilled with Concerns': 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20',
    'Fulfilled with Returns': 'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20',
};

const ClearanceModal: React.FC<ClearanceModalProps> = ({ isOpen, onClose, onSuccess, dispatch }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeReconciliation, setActiveReconciliation] = useState<ReconciliationRow | null>(null);
    const [rfidTags, setRfidTags] = useState<RFIDMapping[]>([]);
    const [invoices, setInvoices] = useState<ReconciliationRow[]>([]);

    // Fetch RFID tags when modal opens — intentional data fetch pattern
    useEffect(() => {
        if (isOpen && dispatch.id) {
            fetchRFIDTagsForDispatch(dispatch.id)
                .then(setRfidTags)
                .catch(err => console.error("Failed to fetch RFID tags:", err));
        }
    }, [isOpen, dispatch.id]);


    // Reset invoice state when modal opens — intentional reset pattern
    useEffect(() => {
        if (isOpen && dispatch.invoices) {
            setInvoices(dispatch.invoices);
            
            // Auto-select rows that were previously cleared/pre-saved
            const initialSelected = new Set<number>();
            dispatch.invoices.forEach(inv => {
                if (inv.isCleared && isRowCheckable(inv)) {
                    initialSelected.add(inv.id);
                }
            });
            setSelectedIds(initialSelected);
        }
    }, [isOpen, dispatch.invoices]);

    const isRowCheckable = (inv: ReconciliationRow) => {
        // Strictly require a valid status first
        const validStatuses = ['Fulfilled', 'Unfulfilled', 'Fulfilled with Concerns', 'Fulfilled with Returns'];
        if (!inv.status || !validStatuses.includes(inv.status as string)) return false;

        // Special validation for statuses requiring detailed input
        if (inv.status === 'Unfulfilled' || inv.status === 'Fulfilled with Concerns') {
            const hasMissingQtys = inv.missingQtys && Object.keys(inv.missingQtys).length > 0;
            const hasScannedQtys = inv.scannedQtys && Object.keys(inv.scannedQtys).length > 0;
            return !!(hasMissingQtys || hasScannedQtys);
        }

        if (inv.status === 'Fulfilled with Returns') {
            return !!inv.remarks && inv.remarks.trim().length > 0;
        }

        return true;
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const checkableIds = invoices.filter(isRowCheckable).map(inv => inv.id);
            setSelectedIds(new Set(checkableIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleToggleRow = (inv: ReconciliationRow) => {
        if (!isRowCheckable(inv)) {
            toast.error("Please define a status and complete inner modal inputs before checking.");
            return;
        }
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(inv.id)) {
                next.delete(inv.id);
            } else {
                next.add(inv.id);
            }
            return next;
        });
    };

    const handleStatusChange = (id: number, newStatus: ReconciliationRow['status']) => {
        setInvoices(prev => prev.map(inv => {
            if (inv.id === id) {
                // If status changed, we clear reconciliation data to force fresh input
                const statusChanged = inv.status !== newStatus;
                return {
                    ...inv,
                    status: newStatus,
                    missingQtys: statusChanged ? {} : inv.missingQtys,
                    scannedQtys: statusChanged ? {} : inv.scannedQtys,
                    scannedRFIDs: statusChanged ? {} : inv.scannedRFIDs,
                    remarks: statusChanged ? '' : inv.remarks
                };
            }
            return inv;
        }));

        // Always uncheck when status is manually changed via dropdown
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleConfirmClearance = async (isPreSave: boolean = false) => {
        const selectedInvoices = isPreSave 
            ? invoices.filter(inv => inv.status)
            : invoices.filter(inv => selectedIds.has(inv.id));

        if (selectedInvoices.length === 0) {
            if (!isPreSave) toast.error("Please select at least one invoice to confirm.");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitClearance(dispatch.id, selectedInvoices, isPreSave);
            toast.success(isPreSave 
                ? `Progress saved for Dispatch ${dispatch.dispatchNo}` 
                : `Clearance confirmed for Dispatch ${dispatch.dispatchNo}`);
            
            // 🟢 Always notify parent of change (pre-save or final)
            onSuccess?.();

            if (!isPreSave) {
                onClose();
            }
        } catch (error: unknown) {
            console.error('Clearance Error:', error);
            toast.error(error instanceof Error ? error.message : `Failed to ${isPreSave ? 'save progress' : 'confirm clearance'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRowDoubleClick = (inv: ReconciliationRow) => {
        const validStatuses = ['Fulfilled', 'Unfulfilled', 'Fulfilled with Concerns', 'Fulfilled with Returns'];
        if (!inv.status || !validStatuses.includes(inv.status as string)) {
            toast.error("Please Select a Status first.");
            return;
        }
        setActiveReconciliation(inv);
        setIsDetailOpen(true);
        // Uncheck while editing/reviewing to ensure they explicitly save/re-validate
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(inv.id);
            return next;
        });
    };

    const handleConfirmProductReconciliation = (id: number, status: string, remarks: string, missingQtys: Record<string | number, number>, scannedQtys: Record<string | number, number>, scannedRFIDs: Record<string | number, string[]>) => {
        setInvoices(prev => prev.map(inv =>
            inv.id === id ? { ...inv, status: status as ReconciliationRow['status'], remarks, missingQtys, scannedQtys, scannedRFIDs } : inv
        ));
        // Auto-select row after reconciliation if not already selected
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1400px] w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-background border-none rounded-2xl shadow-2xl">
                <DialogHeader className="p-4 md:p-6 bg-card border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <DialogTitle className="text-lg md:text-xl font-bold text-foreground leading-tight">
                                Dispatch Clearance
                            </DialogTitle>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground pl-11 flex items-center gap-2">
                            <span>Reconcile items for Dispatch <span className="font-bold text-primary">{dispatch.dispatchNo}</span></span>
                            {dispatch.clusterName && (
                                <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary/10">
                                        {dispatch.clusterName}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex w-full md:w-auto gap-2 justify-end">
                        <Button variant="outline" onClick={onClose} className="rounded-lg h-9 md:h-10 text-sm border-border" disabled={isSubmitting}>Cancel</Button>
                        <Button
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/5 font-semibold px-4 md:px-6 rounded-lg transition-all active:scale-95 flex items-center gap-2 h-9 md:h-10 text-sm"
                            onClick={() => handleConfirmClearance(true)}
                            disabled={isSubmitting || invoices.filter(inv => inv.status).length === 0}
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Pre-Save
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg font-semibold px-4 md:px-6 rounded-lg transition-all active:scale-95 flex items-center gap-2 h-9 md:h-10 text-sm"
                            onClick={() => handleConfirmClearance(false)}
                            disabled={isSubmitting || invoices.length === 0 || !invoices.every(inv => selectedIds.has(inv.id) && isRowCheckable(inv))}
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirm Clearance
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-background">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                        <Card className="border-border bg-card shadow-sm">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Driver</p>
                                <p className="font-bold text-foreground">{dispatch.driverName}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border bg-card shadow-sm">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vehicle</p>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-foreground">{dispatch.vehiclePlate}</p>
                                    <p className="text-[10px] font-medium text-muted-foreground">{dispatch.vehicleType}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border bg-card shadow-sm">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Branch</p>
                                <p className="font-bold text-foreground">{dispatch.branchName || 'N/A'}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border bg-card shadow-sm">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Invoices</p>
                                <p className="font-bold text-foreground">
                                    {invoices.filter(inv => selectedIds.has(inv.id) && isRowCheckable(inv)).length} / {invoices.length} Invoices
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-border bg-card shadow-sm">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Amount</p>
                                <p className="font-bold text-foreground text-primary">
                                    ₱ {invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Reconciliation Table */}
                    <Card className="border-border shadow-sm overflow-hidden rounded-xl bg-card">
                        <CardHeader className="py-4 px-6 bg-muted/30 border-b border-border">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Invoice Reconciliation Table</h3>
                                <p className="text-sm text-red-500 font-medium mt-1">
                                    Select status and mark items as cleared. Click a row to add remarks/details.
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
                            <Table className="min-w-[1000px] md:min-w-full">
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={invoices.length > 0 && invoices.every(isRowCheckable) && selectedIds.size === invoices.filter(isRowCheckable).length && invoices.filter(isRowCheckable).length > 0}
                                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                disabled={invoices.filter(isRowCheckable).length === 0}
                                            />
                                        </TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-xs py-3">Status</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-xs py-3">Order No.</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-xs py-3">Invoice No.</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-xs py-3">Invoice Date</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-xs py-3">Customer</TableHead>
                                        <TableHead className="text-right text-muted-foreground font-semibold text-xs py-3">Amount</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-xs py-3 pr-6">Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic text-sm">
                                                No invoices attached to this dispatch.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((inv) => {
                                            const hasValidStatus = inv.status && ['Fulfilled', 'Unfulfilled', 'Fulfilled with Concerns', 'Fulfilled with Returns'].includes(inv.status as string);
                                            
                                            return (
                                                <TableRow
                                                    key={inv.id}
                                                    className={`transition-colors border-border select-none ${!hasValidStatus ? 'opacity-50 grayscale bg-muted/20 cursor-not-allowed' : 'hover:bg-muted/40 cursor-pointer'}`}
                                                    onClick={() => handleRowDoubleClick(inv)}
                                                >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        disabled={!isRowCheckable(inv)}
                                                        checked={selectedIds.has(inv.id)}
                                                        onCheckedChange={() => handleToggleRow(inv)}
                                                    />
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Select
                                                        value={inv.status}
                                                        onValueChange={(val: ReconciliationRow['status']) => handleStatusChange(inv.id, val)}
                                                    >
                                                        <SelectTrigger className={`w-[190px] h-9 border-none text-xs font-bold ring-1 ring-inset ${STATUS_VARIANTS[inv.status] || 'bg-muted text-muted-foreground ring-border'}`}>
                                                            <SelectValue placeholder="Select Status" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground shadow-xl overflow-hidden p-1">
                                                            <SelectItem value="Fulfilled" className="rounded-lg mb-1 focus:bg-emerald-500/10 focus:text-emerald-500 font-bold hover:bg-emerald-500/10 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <PackageCheck className="w-4 h-4" /> Fulfilled
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Unfulfilled" className="rounded-lg mb-1 focus:bg-rose-500/10 focus:text-rose-500 font-bold hover:bg-rose-500/10 data-[state=checked]:bg-rose-600 data-[state=checked]:text-white transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <PackageX className="w-4 h-4" /> Unfulfilled
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Fulfilled with Concerns" className="rounded-lg mb-1 focus:bg-amber-500/10 focus:text-amber-500 font-bold hover:bg-amber-500/10 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <AlertTriangle className="w-4 h-4" /> Fulfilled with Concerns
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Fulfilled with Returns" className="rounded-lg focus:bg-sky-500/10 focus:text-sky-500 font-bold hover:bg-sky-500/10 data-[state=checked]:bg-sky-600 data-[state=checked]:text-white transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <RotateCcw className="w-4 h-4" /> Fulfilled with Returns
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-foreground font-medium text-sm tabular-nums">{inv.orderNo}</TableCell>
                                                <TableCell className="text-foreground font-medium text-sm tabular-nums">{inv.invoiceNo}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs font-mono">
                                                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-foreground font-bold text-sm">
                                                    {inv.customerName || 'No Name'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-foreground tabular-nums">
                                                    ₱{inv.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs py-3 pr-6 max-w-[200px] truncate">
                                                    {inv.status !== 'Fulfilled with Returns' ? inv.remarks || '---' : ''}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {activeReconciliation && (
                    <ReconciliationDetailModal
                        isOpen={isDetailOpen}
                        onClose={() => setIsDetailOpen(false)}
                        reconciliation={activeReconciliation}
                        onSave={handleConfirmProductReconciliation}
                        rfidTags={rfidTags}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ClearanceModal;
