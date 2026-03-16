'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    CheckCircle2,
    AlertCircle,
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
    DialogFooter
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
import { Badge } from '@/components/ui/badge';
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
    'Fulfilled': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    'Unfulfilled': 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    'Fulfilled with Concerns': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    'Fulfilled with Returns': 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
};

const ClearanceModal: React.FC<ClearanceModalProps> = ({ isOpen, onClose, onSuccess, dispatch }) => {
    const [invoices, setInvoices] = useState<ReconciliationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeReconciliation, setActiveReconciliation] = useState<ReconciliationRow | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<ReconciliationRow | null>(null);
    const [rfidTags, setRfidTags] = useState<RFIDMapping[]>([]);

    useEffect(() => {
        if (isOpen && dispatch.id) {
            fetchRFIDTagsForDispatch(dispatch.id)
                .then(setRfidTags)
                .catch(err => console.error("Failed to fetch RFID tags:", err));
        }
    }, [isOpen, dispatch.id]);

    useEffect(() => {
        if (isOpen && dispatch.invoices) {
            setInvoices(dispatch.invoices);
            setSelectedIds(new Set());
        }
    }, [isOpen, dispatch.invoices]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(invoices.map(inv => inv.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleToggleRow = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleStatusChange = (id: number, newStatus: ReconciliationRow['status']) => {
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
    };

    const handleConfirmClearance = async () => {
        const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id));
        if (selectedInvoices.length === 0) return;

        setIsSubmitting(true);
        try {
            await submitClearance(dispatch.id, selectedInvoices);
            toast.success(`Clearance confirmed for Dispatch ${dispatch.dispatchNo}`);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Clearance Error:', error);
            toast.error(error.message || 'Failed to confirm clearance');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRowDoubleClick = (inv: ReconciliationRow) => {
        setActiveReconciliation(inv);
        setIsDetailOpen(true);
    };

    const handleConfirmProductReconciliation = (id: number, status: string, remarks: string, missingQtys: Record<string | number, number>, scannedQtys: Record<string | number, number>) => {
        setInvoices(prev => prev.map(inv =>
            inv.id === id ? { ...inv, status: status as any, remarks, missingQtys, scannedQtys } : inv
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
            <DialogContent className="sm:max-w-[1400px] w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-slate-50 border-none rounded-2xl">
                <DialogHeader className="p-4 md:p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <DialogTitle className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                                Dispatch Clearance & Reconciliation
                            </DialogTitle>
                        </div>
                        <p className="text-xs md:text-sm text-slate-500 pl-11">
                            Reconcile items for Dispatch <span className="font-bold text-indigo-700">{dispatch.dispatchNo}</span>
                        </p>
                    </div>
                    <div className="flex w-full md:w-auto gap-2 justify-end">
                        <Button variant="outline" onClick={onClose} className="rounded-lg h-9 md:h-10 text-sm" disabled={isSubmitting}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 font-semibold px-4 md:px-6 rounded-lg transition-all active:scale-95 flex items-center gap-2 h-9 md:h-10 text-sm"
                            onClick={handleConfirmClearance}
                            disabled={isSubmitting || selectedIds.size === 0}
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirm Clearance
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <Card className="border-none shadow-sm ring-1 ring-slate-200">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver</p>
                                <p className="font-bold text-slate-900">{dispatch.driverName}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm ring-1 ring-slate-200">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle</p>
                                <p className="font-bold text-slate-900">{dispatch.vehiclePlate}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm ring-1 ring-slate-200">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items</p>
                                <p className="font-bold text-slate-900">
                                    {selectedIds.size > 0 ? `${selectedIds.size} / ` : ''}{invoices.length} Invoices
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm ring-1 ring-slate-200">
                            <CardContent className="p-4 space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                <p className="font-bold text-indigo-600">Ready for Clearance</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Reconciliation Table */}
                    <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-xl bg-white">
                        <CardHeader className="py-4 px-6 bg-slate-50/50 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Invoice Reconciliation Table</h3>
                                <p className="text-xs text-indigo-600 mt-1">
                                    Select status and mark items as cleared. Double-click a row to add remarks/details.
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
                            <Table className="min-w-[800px] md:min-w-full">
                                <TableHeader className="bg-slate-50/30">
                                    <TableRow className="border-slate-100">
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={invoices.length > 0 && selectedIds.size === invoices.length}
                                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                            />
                                        </TableHead>
                                        <TableHead className="text-slate-500 font-semibold text-xs py-3">Status</TableHead>
                                        <TableHead className="text-slate-500 font-semibold text-xs py-3">Order No.</TableHead>
                                        <TableHead className="text-slate-500 font-semibold text-xs py-3">Invoice No.</TableHead>
                                        <TableHead className="text-slate-500 font-semibold text-xs py-3">Invoice Date</TableHead>
                                        <TableHead className="text-slate-500 font-semibold text-xs py-3">Customer</TableHead>
                                        <TableHead className="text-right text-slate-500 font-semibold text-xs py-3 pr-6">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                                    <span className="text-sm text-slate-500">Loading invoices...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center text-slate-400 italic text-sm">
                                                No invoices attached to this dispatch.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((inv) => (
                                            <TableRow
                                                key={inv.id}
                                                className="hover:bg-slate-50 transition-colors border-slate-100 cursor-pointer select-none"
                                                onClick={() => handleRowDoubleClick(inv)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedIds.has(inv.id)}
                                                        onCheckedChange={() => handleToggleRow(inv.id)}
                                                    />
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Select
                                                        value={inv.status}
                                                        onValueChange={(val: any) => handleStatusChange(inv.id, val)}
                                                    >
                                                        <SelectTrigger className={`w-[190px] h-9 border-none text-xs font-bold ring-1 ring-inset ${STATUS_VARIANTS[inv.status]}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-slate-200 shadow-xl overflow-hidden p-1">
                                                            <SelectItem value="Fulfilled" className="rounded-lg mb-1 focus:bg-emerald-50 focus:text-emerald-700 font-bold hover:bg-emerald-50 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white">
                                                                <div className="flex items-center gap-2">
                                                                    <PackageCheck className="w-4 h-4" /> Fulfilled
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Unfulfilled" className="rounded-lg mb-1 focus:bg-rose-50 focus:text-rose-700 font-bold hover:bg-rose-50 data-[state=checked]:bg-rose-600 data-[state=checked]:text-white">
                                                                <div className="flex items-center gap-2">
                                                                    <PackageX className="w-4 h-4" /> Unfulfilled
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Fulfilled with Concerns" className="rounded-lg mb-1 focus:bg-amber-50 focus:text-amber-700 font-bold hover:bg-amber-50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white">
                                                                <div className="flex items-center gap-2">
                                                                    <AlertTriangle className="w-4 h-4" /> Fulfilled with Concerns
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Fulfilled with Returns" className="rounded-lg focus:bg-sky-50 focus:text-sky-700 font-bold hover:bg-sky-50 data-[state=checked]:bg-sky-600 data-[state=checked]:text-white">
                                                                <div className="flex items-center gap-2">
                                                                    <RotateCcw className="w-4 h-4" /> Fulfilled with Returns
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-medium text-sm">{inv.orderNo}</TableCell>
                                                <TableCell className="text-slate-600 font-medium text-sm">{inv.invoiceNo}</TableCell>
                                                <TableCell className="text-slate-400 text-xs">
                                                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-slate-900 font-bold text-sm">
                                                    {inv.customerName || 'No Name'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-900 pr-6">
                                                    ₱{inv.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
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
