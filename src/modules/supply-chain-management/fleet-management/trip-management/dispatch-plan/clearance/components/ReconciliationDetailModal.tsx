'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    AlertTriangle,
    Loader2,
    Scan,
    Keyboard,
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { InvoiceDetail, ReconciliationRow, RFIDMapping } from '../types';
import { fetchInvoiceDetails } from '../providers/fetchProviders';
import ScanningModal from './ScanningModal';
import ManualInputModal from './ManualInputModal';

interface ReconciliationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reconciliation: ReconciliationRow | null;
    onSave: (invoiceId: number, status: string, remarks: string, missingQtys: Record<string | number, number>, scannedQtys: Record<string | number, number>, scannedRFIDs: Record<string | number, string[]>) => void;
    rfidTags?: RFIDMapping[];
}

const ReconciliationDetailModal: React.FC<ReconciliationDetailModalProps> = ({
    isOpen,
    onClose,
    onSave,
    reconciliation,
    rfidTags = []
}) => {
    const [detail, setDetail] = useState<InvoiceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [missingQtys, setMissingQtys] = useState<Record<string | number, number>>({});
    const [remarks, setRemarks] = useState('');
    const [scannedQtys, setScannedQtys] = useState<Record<string | number, number>>({});
    const [scannedRFIDs, setScannedRFIDs] = useState<Record<string | number, string[]>>({});
    const [isScanningOpen, setIsScanningOpen] = useState(false);
    const [isManualInputOpen, setIsManualInputOpen] = useState(false);
    const [selectedLineIds, setSelectedLineIds] = useState<Set<string | number>>(new Set());

    // 🟢 Link Sales Return State
    const [returnMode, setReturnMode] = useState<'create' | 'link'>('create');
    const [existingReturns, setExistingReturns] = useState<{ id: number; returnNo: string; returnDate: string; totalAmount: number }[]>([]);
    const [selectedReturnNo, setSelectedReturnNo] = useState<string>('');

    // Reset/initialize state when modal opens — intentional reset pattern
    useEffect(() => {
        if (isOpen && reconciliation?.invoiceId) {
            setIsLoading(true);
            const invoiceNo = reconciliation.invoiceNo;
            
            Promise.all([
                fetchInvoiceDetails(reconciliation.invoiceId),
                reconciliation.status === 'Fulfilled with Returns' 
                    ? import('../providers/fetchProviders').then(m => m.fetchSalesReturnsByInvoice(invoiceNo))
                    : Promise.resolve([])
            ])
                .then(([data, returns]) => {
                    setDetail(data);
                    setExistingReturns(returns);
                    setMissingQtys(reconciliation.missingQtys || {});
                    setScannedQtys(reconciliation.scannedQtys || {});
                    setScannedRFIDs(reconciliation.scannedRFIDs || {});
                    setRemarks(reconciliation.remarks || '');
                    
                    // Initialize selected lines if they exist in the previous data
                    const initialSelected = new Set<string | number>();
                    const currentScanned = reconciliation.scannedQtys || {};
                    const currentMissing = reconciliation.missingQtys || {};
                    
                    data.lines.forEach(line => {
                        if (currentScanned[line.id] !== undefined || currentMissing[line.id] !== undefined) {
                            initialSelected.add(line.id);
                        }
                    });
                    setSelectedLineIds(initialSelected);
                })
                .catch(err => console.error("Failed to fetch invoice details:", err))
                .finally(() => setIsLoading(false));
        } else {
            setDetail(null);
            setRemarks('');
            setMissingQtys({});
            setScannedQtys({});
            setSelectedLineIds(new Set());
            setReturnMode('create');
            setExistingReturns([]);
            setSelectedReturnNo('');
        }
    }, [isOpen, reconciliation]);

    if (!reconciliation) return null;

    const handleSave = () => {
        // Only include data for selected lines if status is Concerns
        const finalMissingQtys: Record<string | number, number> = {};
        const finalScannedQtys: Record<string | number, number> = {};
        const finalScannedRFIDs: Record<string | number, string[]> = {};

        if (reconciliation.status === 'Fulfilled with Concerns') {
            selectedLineIds.forEach(id => {
                if (missingQtys[id] !== undefined) finalMissingQtys[id] = missingQtys[id];
                if (scannedQtys[id] !== undefined) finalScannedQtys[id] = scannedQtys[id];
                if (scannedRFIDs[id] !== undefined) finalScannedRFIDs[id] = scannedRFIDs[id];
            });
        } else {
            // Include all for other unfulfilled statuses (like Unfulfilled)
            detail?.lines.forEach(line => {
                if (missingQtys[line.id] !== undefined) finalMissingQtys[line.id] = missingQtys[line.id];
                if (scannedQtys[line.id] !== undefined) finalScannedQtys[line.id] = scannedQtys[line.id];
                if (scannedRFIDs[line.id] !== undefined) finalScannedRFIDs[line.id] = scannedRFIDs[line.id];
            });
        }

        onSave(reconciliation.id, reconciliation.status, remarks, finalMissingQtys, finalScannedQtys, finalScannedRFIDs);
        onClose();
    };


    const handleScanningConfirm = (scanned: Record<string | number, number>, returnedRFIDs: Record<string | number, string[]> = {}) => {
        setScannedQtys(scanned);
        setScannedRFIDs(returnedRFIDs);

        // Auto-calculate missing quantities based on the scan/input
        const newQtys: Record<string | number, number> = {};
        detail?.lines.forEach(line => {
            // Only calculate for selected if status is Concerns, otherwise calculate for all
            if (reconciliation?.status !== 'Fulfilled with Concerns' || selectedLineIds.has(line.id)) {
                const scanCount = scanned[line.id] || 0;
                const diff = Math.max(0, line.qty - scanCount);
                if (diff > 0 || (reconciliation?.status !== 'Fulfilled' && scanCount > 0)) {
                    newQtys[line.id] = diff;
                }
            }
        });
        setMissingQtys(newQtys);
    };

    // Use the exact same calculation logic for manual input
    const handleManualInputConfirm = (inputs: Record<string | number, number>) => {
        handleScanningConfirm(inputs);
    };

    const toggleLineSelection = (lineId: string | number) => {
        setSelectedLineIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(lineId)) {
                newSet.delete(lineId);
                // Also clear its data when unselected to be safe
                setScannedQtys(s => { const n = { ...s }; delete n[lineId]; return n; });
                setMissingQtys(m => { const n = { ...m }; delete n[lineId]; return n; });
            } else {
                newSet.add(lineId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (!detail) return;
        if (selectedLineIds.size === detail.lines.length) {
            setSelectedLineIds(new Set());
            setScannedQtys({});
            setMissingQtys({});
        } else {
            setSelectedLineIds(new Set(detail.lines.map(l => l.id)));
        }
    };

    const renderHeader = () => {
        if (!reconciliation) return null;
        const Icon = reconciliation.status === 'Fulfilled' ? CheckCircle2 :
            reconciliation.status === 'Unfulfilled' ? AlertCircle :
                reconciliation.status === 'Fulfilled with Concerns' ? AlertTriangle : RotateCcw;

        const colorClass = reconciliation.status === 'Fulfilled' ? 'text-emerald-500' :
            reconciliation.status === 'Unfulfilled' ? 'text-rose-500' :
                reconciliation.status === 'Fulfilled with Concerns' ? 'text-amber-500' : 'text-primary';

        const titlePrefix = reconciliation.status === 'Fulfilled' ? 'Invoice No' :
            reconciliation.status === 'Fulfilled with Returns' ? 'Invoice No' : 'Invoice No';

        return (
            <div className="flex items-center gap-3">
                <Icon className={`w-6 h-6 ${colorClass}`} />
                <DialogTitle className="text-lg font-bold text-foreground">
                    {titlePrefix}: {reconciliation.invoiceNo}
                </DialogTitle>
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">Fetching invoice details...</p>
                </div>
            );
        }

        if (!detail) {
            return (
                <div className="py-12 text-center text-muted-foreground italic">
                    Failed to load details or no data found.
                </div>
            );
        }

        if (reconciliation.status === 'Fulfilled with Returns') {
            return (
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        This customer has a return flag. How do you want to process this transaction?
                    </p>

                    <div className="space-y-3">
                        {/* Create New Option */}
                        <div 
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                returnMode === 'create' 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border bg-background hover:border-primary/30'
                            }`}
                            onClick={() => setReturnMode('create')}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    returnMode === 'create' ? 'border-primary' : 'border-muted-foreground/30'
                                }`}>
                                    {returnMode === 'create' && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground">Open Sales Return</p>
                                    <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                                        Create a new Sales Return record for this invoice
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Link Existing Option */}
                        <div 
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                returnMode === 'link' 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border bg-background hover:border-primary/30'
                            }`}
                            onClick={() => setReturnMode('link')}
                        >
                            <div className="items-start flex gap-4">
                                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    returnMode === 'link' ? 'border-primary' : 'border-muted-foreground/30'
                                }`}>
                                    {returnMode === 'link' && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div className="space-y-1">
                                        <p className="font-bold text-foreground">Link Sales Return</p>
                                        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                                            Attach this invoice to an existing Sales Return record
                                        </p>
                                    </div>
                                    
                                    {returnMode === 'link' && (
                                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {existingReturns.length > 0 ? (
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Existing Return</Label>
                                                    <Select value={selectedReturnNo} onValueChange={setSelectedReturnNo}>
                                                        <SelectTrigger className="w-full bg-background border-border h-11 rounded-xl focus:ring-1 focus:ring-primary shadow-sm">
                                                            <SelectValue placeholder="Choose a Sales Return..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-border shadow-xl">
                                                            {existingReturns.map((sr) => (
                                                                <SelectItem key={sr.id} value={sr.returnNo} className="cursor-pointer hover:bg-primary/5 focus:bg-primary/5 py-3 border-b border-border/50 last:border-0">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-bold text-primary">{sr.returnNo}</span>
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                                                            Date: {sr.returnDate} | Total: ₱{sr.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ) : (
                                                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                                    <p className="text-xs font-semibold text-amber-600">No existing Sales Returns found for this invoice.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Remarks for Returns */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-sm font-bold text-foreground">
                                Remarks (Mandatory)
                            </p>
                            <Textarea
                                placeholder="E.g. Customer returned items, linked to existing SR..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="rounded-xl border-border bg-muted/30 focus:ring-1 focus:ring-primary min-h-[80px] text-sm resize-none text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button variant="outline" onClick={onClose} className="rounded-xl px-6 border-border">Cancel</Button>
                        <Button 
                            onClick={() => {
                                if (returnMode === 'create') {
                                    const returnData = {
                                        invoiceId: reconciliation.invoiceId,
                                        invoiceNo: reconciliation.invoiceNo,
                                        orderNo: reconciliation.orderNo,
                                        customerCode: detail?.header.customer_code || reconciliation.customer || '',
                                        customerName: reconciliation.customerName,
                                        salesmanId: detail?.header.salesman_id,
                                        salesmanName: detail?.header.salesman_name,
                                        salesmanCode: detail?.header.salesman_code,
                                        branchId: detail?.header.branch_id,
                                        branchName: detail?.header.branch_name,
                                    };
                                    localStorage.setItem('scm_dispatch_return_data', JSON.stringify(returnData));
                                    window.open('/scm/inventories/sales-return-rfid?fromClearance=true', '_blank');
                                } else {
                                    if (!selectedReturnNo) {
                                        toast.error("Please select a Sales Return to link.");
                                        return;
                                    }
                                    const returnData = {
                                        invoiceNo: reconciliation.invoiceNo,
                                        orderNo: reconciliation.orderNo,
                                        isLinking: true
                                    };
                                    localStorage.setItem('scm_dispatch_return_link_data', JSON.stringify(returnData));
                                    window.open(`/scm/inventories/sales-return-rfid?fromClearance=true&editReturnNo=${selectedReturnNo}&prefillInvoiceNo=${reconciliation.invoiceNo}&prefillOrderNo=${reconciliation.orderNo}`, '_blank');
                                }
                                handleSave(); // Also save the clearance status
                            }} 
                            disabled={(returnMode === 'link' && !selectedReturnNo) || !remarks.trim()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            Open & Confirm
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Info Card */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/30">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Customer</p>
                        <p className="text-sm font-bold text-foreground">{reconciliation.customerName}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</p>
                        <p className={`text-sm font-bold ${reconciliation.status === 'Fulfilled' ? 'text-emerald-500' :
                            reconciliation.status === 'Unfulfilled' ? 'text-rose-500' : 'text-amber-500'
                            }`}>{reconciliation.status}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                    <div className="bg-muted px-4 py-2 border-b border-border">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Transaction Details</p>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[600px] md:min-w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                                    {reconciliation.status === 'Fulfilled with Concerns' && (
                                        <TableHead className="w-12 text-center">
                                            <Checkbox 
                                                checked={detail.lines.length > 0 && selectedLineIds.size === detail.lines.length}
                                                onCheckedChange={toggleSelectAll}
                                                className="translate-y-0.5"
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead className="text-xs font-bold text-muted-foreground">Product / Unit of Measure</TableHead>
                                    <TableHead className="text-xs font-bold text-muted-foreground text-center">
                                        {reconciliation.status === 'Fulfilled' ? 'Qty' : 'Orig Qty'}
                                    </TableHead>
                                    {reconciliation.status !== 'Fulfilled' && (
                                        <>
                                            <TableHead className="text-xs font-bold text-muted-foreground text-center">
                                                Scanned Qty
                                            </TableHead>
                                            <TableHead className="text-xs font-bold text-muted-foreground text-right border-r border-border/50">
                                                Scanned Amount
                                            </TableHead>
                                            <TableHead className="text-xs font-bold text-muted-foreground text-center">
                                                Missing
                                            </TableHead>
                                            <TableHead className="text-xs font-bold text-muted-foreground text-right">
                                                Missing Amount
                                            </TableHead>
                                        </>
                                    )}
                                    <TableHead className="text-xs font-bold text-muted-foreground text-right pr-6">
                                        {reconciliation.status === 'Fulfilled' ? 'Amount' : 'Orig Amount'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detail.lines.map((line) => (
                                    <TableRow 
                                        key={line.id} 
                                        className={`hover:bg-muted/30 transition-colors border-border ${
                                            reconciliation.status === 'Fulfilled with Concerns' && !selectedLineIds.has(line.id) 
                                            ? 'opacity-40 grayscale-[0.5]' 
                                            : ''
                                        }`}
                                    >
                                        {reconciliation.status === 'Fulfilled with Concerns' && (
                                            <TableCell className="text-center">
                                                <Checkbox 
                                                    checked={selectedLineIds.has(line.id)}
                                                    onCheckedChange={() => toggleLineSelection(line.id)}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                     <p className="text-sm font-bold text-foreground">{line.product_name}</p>
                                                     {(reconciliation.status === 'Unfulfilled' || reconciliation.status === 'Fulfilled with Concerns') && (reconciliation.status !== 'Fulfilled with Concerns' || selectedLineIds.has(line.id)) && (
                                                         <Badge variant="outline" className="text-[10px] h-4 bg-emerald-500/5 text-emerald-500 border-emerald-500/10 gap-1 px-1.5 font-medium">
                                                            <Scan className="w-2.5 h-2.5" /> {(scannedQtys[line.id] !== undefined ? scannedQtys[line.id] : "-")} Scanned
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-bold uppercase border border-border">{line.unit}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm font-bold text-foreground text-center tabular-nums">{line.qty}</TableCell>
                                        {reconciliation.status !== 'Fulfilled' && (
                                            <>
                                                 <TableCell className="text-center w-24">
                                                     <div className="flex items-center justify-center">
                                                         <div className="h-9 w-16 flex items-center justify-center font-bold rounded-lg border border-border transition-colors bg-muted/50 text-muted-foreground tabular-nums">
                                                             {(reconciliation.status !== 'Fulfilled with Concerns' || selectedLineIds.has(line.id)) ? (scannedQtys[line.id] !== undefined ? scannedQtys[line.id] : "-") : "-"}
                                                         </div>
                                                     </div>
                                                 </TableCell>
                                                 <TableCell className="text-right text-sm font-bold text-muted-foreground tabular-nums border-r border-border/50">
                                                     ₱{(reconciliation.status !== 'Fulfilled with Concerns' || selectedLineIds.has(line.id)) ? (((line.net_total || 0) / (line.qty || 1)) * (scannedQtys[line.id] || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                                                 </TableCell>
 
                                                 <TableCell className="text-center w-24">
                                                     <div className="flex items-center justify-center">
                                                         <div className={`h-9 w-16 flex items-center justify-center font-bold rounded-lg border transition-colors tabular-nums ${
                                                             (reconciliation.status !== 'Fulfilled with Concerns' || selectedLineIds.has(line.id)) && (missingQtys[line.id] || 0) > 0 
                                                             ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                                                             : 'bg-muted/50 text-muted-foreground border-border'
                                                         }`}>
                                                             {(reconciliation.status !== 'Fulfilled with Concerns' || selectedLineIds.has(line.id)) ? (missingQtys[line.id] || 0) : "-"}
                                                         </div>
                                                     </div>
                                                 </TableCell>
                                                 <TableCell className="text-right text-sm font-bold text-rose-500 tabular-nums">
                                                     ₱{(reconciliation.status !== 'Fulfilled with Concerns' || selectedLineIds.has(line.id)) ? (((line.net_total || 0) / (line.qty || 1)) * (missingQtys[line.id] || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                                                 </TableCell>
                                            </>
                                        )}
                                        <TableCell className="text-right text-sm font-bold text-foreground pr-6 tabular-nums">
                                            ₱{Number(line.net_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                    <p className="text-sm font-bold text-foreground">
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
                        className="rounded-xl border-border bg-muted/30 focus:ring-1 focus:ring-primary min-h-[100px] text-sm resize-none text-foreground placeholder:text-muted-foreground"
                    />
                </div>

                <div className="flex flex-col md:flex-row justify-end items-center gap-3 pt-4 border-t border-border mt-auto">
                    {reconciliation.status !== 'Fulfilled' && (
                        <div className="flex items-center gap-2 w-full md:w-auto md:mr-auto">
                            <Button
                                variant="outline"
                                onClick={() => setIsScanningOpen(true)}
                                className="flex-1 md:flex-none rounded-xl px-6 font-bold text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 flex items-center gap-2 h-10 transition-all active:scale-95"
                            >
                                <Scan className="w-4 h-4" />
                                Start Scan
                            </Button>
                            
                            <Button
                                variant="outline"
                                onClick={() => setIsManualInputOpen(true)}
                                className="flex-1 md:flex-none rounded-xl px-6 font-bold text-orange-500 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 flex items-center gap-2 h-10 transition-all active:scale-95"
                            >
                                <Keyboard className="w-4 h-4" />
                                Manual Input
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button variant="outline" onClick={onClose} className="flex-1 md:flex-none rounded-xl px-6 font-semibold border-border h-10">Cancel</Button>
                        <Button
                            onClick={handleSave}
                            disabled={
                                reconciliation.status !== 'Fulfilled' && (
                                    !remarks.trim() || 
                                    !detail || 
                                    (reconciliation.status === 'Fulfilled with Concerns' && selectedLineIds.size === 0) || // No products selected when needed
                                    (reconciliation.status === 'Fulfilled with Concerns' 
                                        ? Array.from(selectedLineIds).some(id => scannedQtys[id] === undefined) 
                                        : detail.lines.some(line => scannedQtys[line.id] === undefined)) // Some products not scanned
                                )
                            }
                            className={`flex-1 md:flex-none rounded-xl px-8 font-bold text-primary-foreground shadow-lg transition-all active:scale-95 h-10 ${
                                reconciliation.status === 'Fulfilled' 
                                ? 'bg-emerald-600 hover:bg-emerald-700' 
                                : 'bg-primary hover:bg-primary/90'
                            }`}
                        >
                            Save & Mark Cleared
                        </Button>
                    </div>
                </div>

                <ScanningModal
                    isOpen={isScanningOpen}
                    onClose={() => setIsScanningOpen(false)}
                    onConfirm={handleScanningConfirm}
                    items={reconciliation.status === 'Fulfilled with Concerns' ? detail.lines.filter(l => selectedLineIds.has(l.id)) : detail.lines}
                    initialScanned={scannedQtys}
                    initialScannedRFIDs={scannedRFIDs}
                    rfidTags={rfidTags}
                />

                <ManualInputModal
                    isOpen={isManualInputOpen}
                    onClose={() => setIsManualInputOpen(false)}
                    onConfirm={handleManualInputConfirm}
                    items={reconciliation.status === 'Fulfilled with Concerns' ? detail.lines.filter(l => selectedLineIds.has(l.id)) : detail.lines}
                    initialValues={scannedQtys}
                />
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl w-[95vw] p-4 md:p-6 bg-card rounded-2xl md:rounded-3xl border-border shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
                <DialogHeader className="mb-2 shrink-0 border-b border-border pb-4">
                    {renderHeader()}
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mt-4">
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReconciliationDetailModal;
