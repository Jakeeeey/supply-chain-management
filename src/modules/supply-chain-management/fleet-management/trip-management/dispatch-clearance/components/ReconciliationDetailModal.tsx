'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    AlertTriangle,
    Loader2,
    Info,
    Calendar,
    User,
    ChevronDown,
    Scan,
} from 'lucide-react';
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
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { InvoiceDetail, InvoiceLine, ReconciliationRow } from '../types';
import { fetchInvoiceDetails } from '../providers/fetchProviders';
import ScanningModal from './ScanningModal';

interface ReconciliationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: number, data: any) => void;
    reconciliation: ReconciliationRow;
}

const ReconciliationDetailModal: React.FC<ReconciliationDetailModalProps> = ({
    isOpen,
    onClose,
    onSave,
    reconciliation
}) => {
    const [detail, setDetail] = useState<InvoiceDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [missingQtys, setMissingQtys] = useState<Record<string | number, number>>({});
    const [scannedQtys, setScannedQtys] = useState<Record<string | number, number>>({});
    const [isScanningOpen, setIsScanningOpen] = useState(false);

    useEffect(() => {
        if (isOpen && reconciliation.invoiceId) {
            loadDetails();
        } else {
            setDetail(null);
            setRemarks('');
            setMissingQtys({});
            setScannedQtys({});
        }
    }, [isOpen, reconciliation.invoiceId]);

    const loadDetails = async () => {
        setLoading(true);
        try {
            const data = await fetchInvoiceDetails(reconciliation.invoiceId);
            setDetail(data);
        } catch (error) {
            console.error('Failed to load invoice details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        onSave(reconciliation.id, {
            remarks,
            missingQtys,
            status: reconciliation.status
        });
        onClose();
    };

    const handleMissingQtyChange = (lineId: string | number, value: string) => {
        const num = parseInt(value) || 0;
        setMissingQtys(prev => ({ ...prev, [lineId]: num }));
    };

    const handleScanningConfirm = (scanned: Record<string | number, number>) => {
        setScannedQtys(scanned);

        // Auto-calculate quantities based on status
        const newQtys: Record<string | number, number> = {};
        detail?.lines.forEach(line => {
            const scanCount = scanned[line.id] || 0;

            if (reconciliation.status === 'Fulfilled with Concerns') {
                // For concerns, the scanning records the count of items returned/affected
                newQtys[line.id] = scanCount;
            } else {
                // For other statuses, we calculate what is missing
                const diff = Math.max(0, line.qty - scanCount);
                if (diff > 0) {
                    newQtys[line.id] = diff;
                }
            }
        });
        setMissingQtys(newQtys);
    };

    if (!isOpen) return null;

    const renderHeader = () => {
        const Icon = reconciliation.status === 'Fulfilled' ? CheckCircle2 :
            reconciliation.status === 'Unfulfilled' ? AlertCircle :
                reconciliation.status === 'Fulfilled with Concerns' ? AlertTriangle : RotateCcw;

        const colorClass = reconciliation.status === 'Fulfilled' ? 'text-emerald-500' :
            reconciliation.status === 'Unfulfilled' ? 'text-rose-500' :
                reconciliation.status === 'Fulfilled with Concerns' ? 'text-amber-500' : 'text-indigo-500';

        const titlePrefix = reconciliation.status === 'Fulfilled' ? 'Clearance' :
            reconciliation.status === 'Fulfilled with Returns' ? 'Process Return' : 'Reconciliation';

        return (
            <div className="flex items-center gap-3">
                <Icon className={`w-6 h-6 ${colorClass}`} />
                <DialogTitle className="text-lg font-bold">
                    {titlePrefix}: {reconciliation.invoiceNo}
                </DialogTitle>
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-sm text-slate-500 font-medium">Fetching invoice details...</p>
                </div>
            );
        }

        if (!detail) {
            return (
                <div className="py-12 text-center text-slate-500 italic">
                    Failed to load details or no data found.
                </div>
            );
        }

        if (reconciliation.status === 'Fulfilled with Returns') {
            return (
                <div className="space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        This customer has a return flag. How do you want to process this transaction?
                    </p>

                    <div className="p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/30 flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded-full border-2 border-indigo-400 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-slate-900">Link to Existing Sales Return</p>
                                <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                                    -- Select Pending SR -- <ChevronDown className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} className="rounded-xl px-6">Cancel</Button>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-bold">Confirm & Clear</Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Info Card */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Customer</p>
                        <p className="text-sm font-bold text-slate-900">{reconciliation.customerName}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Status</p>
                        <p className={`text-sm font-bold ${reconciliation.status === 'Fulfilled' ? 'text-emerald-600' :
                            reconciliation.status === 'Unfulfilled' ? 'text-rose-600' : 'text-amber-600'
                            }`}>{reconciliation.status}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Transaction Details</p>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[600px] md:min-w-full">
                            <TableHeader>
                                <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                                    <TableHead className="text-xs font-bold text-slate-600">Product / Unit of Measure</TableHead>
                                    <TableHead className="text-xs font-bold text-slate-600 text-center">
                                        {reconciliation.status === 'Fulfilled' ? 'Qty' : 'Orig Qty'}
                                    </TableHead>
                                    {reconciliation.status !== 'Fulfilled' && (
                                        <TableHead className="text-xs font-bold text-slate-600 text-center">
                                            {reconciliation.status === 'Fulfilled with Concerns' ? 'Count' : 'Missing'}
                                        </TableHead>
                                    )}
                                    <TableHead className="text-xs font-bold text-slate-600 text-right pr-6">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detail.lines.map((line) => (
                                    <TableRow key={line.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-slate-900">{line.product_name}</p>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold uppercase">{line.unit}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm font-bold text-slate-900 text-center">{line.qty}</TableCell>
                                        {reconciliation.status !== 'Fulfilled' && (
                                            <TableCell className="text-center w-24">
                                                <div className="flex items-center justify-center">
                                                    <div className={`h-9 w-16 flex items-center justify-center font-bold rounded-lg border border-slate-200 transition-colors ${(missingQtys[line.id] || 0) > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400'
                                                        }`}>
                                                        {missingQtys[line.id] || 0}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right text-sm font-bold text-slate-900 pr-6">
                                            ₱{line.net_total.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-900">
                        Remarks {reconciliation.status === 'Fulfilled' ? '(Optional)' : '(Mandatory)'}
                    </p>
                    <Textarea
                        placeholder={
                            reconciliation.status === 'Fulfilled' ? 'E.g. Received by guard, complete.' :
                                reconciliation.status === 'Unfulfilled' ? 'Reason for failure (e.g. Shop closed)' :
                                    'Details of damage/concern...'
                        }
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="rounded-xl border-slate-200 focus:ring-1 focus:ring-indigo-500 min-h-[100px] text-sm resize-none"
                    />
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                    {reconciliation.status !== 'Fulfilled' && (
                        <Button
                            variant="outline"
                            onClick={() => setIsScanningOpen(true)}
                            className="rounded-xl px-6 font-bold text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 flex items-center gap-2 mr-auto"
                        >
                            <Scan className="w-4 h-4" />
                            Start Scan
                        </Button>
                    )}

                    <Button variant="outline" onClick={onClose} className="rounded-xl px-6 font-semibold">Cancel</Button>
                    <Button
                        onClick={handleSave}
                        disabled={reconciliation.status !== 'Fulfilled' && !remarks.trim()}
                        className={`rounded-xl px-8 font-bold text-white shadow-lg transition-all active:scale-95 ${reconciliation.status === 'Fulfilled' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' :
                            'bg-slate-400 hover:bg-slate-500 shadow-slate-100' // Using indigo/violet shade from user image
                            }`}
                        style={reconciliation.status !== 'Fulfilled' ? { backgroundColor: '#a5b4fc' } : {}} // Match the light purple in image
                    >
                        Save & Mark Cleared
                    </Button>
                </div>

                <ScanningModal
                    isOpen={isScanningOpen}
                    onClose={() => setIsScanningOpen(false)}
                    onConfirm={handleScanningConfirm}
                    items={detail.lines}
                    initialScanned={scannedQtys}
                />
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl w-[95vw] p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border-none shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
                <DialogHeader className="mb-2 shrink-0">
                    {renderHeader()}
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReconciliationDetailModal;
