'use client';

import React, { useState, useEffect } from 'react';
import {
    Scan,
    X,
    CheckCircle2,
    Loader2,
    Plus,
    Minus,
    ArrowRight,
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
import { InvoiceLine } from '../types';

interface ScanningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scannedQtys: Record<string | number, number>) => void;
    items: InvoiceLine[];
    initialScanned?: Record<string | number, number>;
}

const ScanningModal: React.FC<ScanningModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    items,
    initialScanned = {}
}) => {
    const [scannedQtys, setScannedQtys] = useState<Record<string | number, number>>(initialScanned);
    const [lastScanned, setLastScanned] = useState<InvoiceLine | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setScannedQtys(initialScanned);
            setLastScanned(null);
            setIsScanning(true);
        }
    }, [isOpen, initialScanned]);

    // Internal simulation for RFID scan
    const simulateScan = () => {
        // Pick a random item that isn't fully scanned yet
        const remainingItems = items.filter(item => (scannedQtys[item.id] || 0) < item.qty);

        if (remainingItems.length === 0) {
            setIsScanning(false);
            return;
        }

        const randomIndex = Math.floor(Math.random() * remainingItems.length);
        const item = remainingItems[randomIndex];
        const newQty = (scannedQtys[item.id] || 0) + 1;

        setScannedQtys(prev => ({
            ...prev,
            [item.id]: newQty
        }));
        setLastScanned(item);

        // Auto-stop when everything is scanned
        if (remainingItems.length === 1 && newQty === item.qty) {
            setIsScanning(false);
        }
    };

    const handleConfirm = () => {
        onConfirm(scannedQtys);
        onClose();
    };

    const totalRequired = items.reduce((acc, item) => acc + item.qty, 0);
    const totalScanned = Object.values(scannedQtys).reduce((acc, qty) => acc + qty, 0);
    const progressPercent = (totalScanned / totalRequired) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl w-[95vw] p-0 bg-white rounded-2xl md:rounded-3xl border-none shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
                <DialogHeader className="p-4 md:p-6 pb-2 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                <Scan className={`w-4 h-4 md:w-5 md:h-5 ${isScanning ? 'animate-pulse' : ''}`} />
                            </div>
                            <div className="space-y-0.5 truncate">
                                <DialogTitle className="text-lg md:text-xl font-bold truncate">RFID Scanning</DialogTitle>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">
                                    {isScanning ? 'Waiting for RFID tag detection...' : 'All items accounted for.'}
                                </p>
                            </div>
                        </div>
                        {isScanning && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={simulateScan}
                                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider h-7 md:h-8 px-2 md:px-3 whitespace-nowrap"
                            >
                                Simulate Scan
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2 space-y-6 custom-scrollbar">
                    {/* Total Progress Card */}
                    <div className="p-4 md:p-6 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 relative overflow-hidden shrink-0">
                        <div className="relative z-10 flex items-center justify-between mb-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Global Progress</p>
                                <h3 className="text-2xl md:text-3xl font-black">
                                    {totalScanned} <span className="text-sm md:text-lg font-medium text-indigo-200">/ {totalRequired} Boxes</span>
                                </h3>
                            </div>
                            <div className={`p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md ${isScanning ? 'animate-bounce' : ''}`}>
                                <Scan className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                        </div>
                        <div className="relative z-10 h-2 md:h-3 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-500 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        {/* Abstract Background Decoration */}
                        <div className="absolute top-[-20%] right-[-10%] w-32 md:w-48 h-32 md:h-48 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute bottom-[-10%] left-[-5%] w-24 md:w-32 h-24 md:h-32 bg-indigo-400/20 rounded-full blur-xl" />
                    </div>

                    {/* Last Scanned Item (Real-time feedback) */}
                    {lastScanned && (
                        <div className="p-3 md:p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shrink-0">
                            <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5 truncate">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Detected Tag</p>
                                    <p className="text-xs md:text-sm font-bold text-slate-900 truncate">{lastScanned.product_name}</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Unit</p>
                                <p className="text-xs md:text-sm font-black text-slate-900">{lastScanned.unit}</p>
                            </div>
                        </div>
                    )}

                    {/* Items List */}
                    <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                        <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detail Manifest</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{items.length} Unique SKUs</p>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <Table className="min-w-[500px] md:min-w-full">
                                <TableHeader className="bg-white sticky top-0 z-10 shadow-sm border-b border-slate-100">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3">Product Description</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-center py-3">Total Required</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-center py-3">Scanned Qty</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-right py-3 pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => {
                                        const scanned = scannedQtys[item.id] || 0;
                                        const isComplete = scanned >= item.qty;

                                        return (
                                            <TableRow key={item.id} className={`group hover:bg-slate-50/50 transition-colors border-slate-50 ${isComplete ? 'opacity-60' : ''}`}>
                                                <TableCell className="py-3 md:py-4">
                                                    <div className="space-y-1">
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{item.product_name}</p>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-tighter">
                                                            {item.unit}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-slate-500 text-xs md:text-sm py-3 md:py-4">{item.qty}</TableCell>
                                                <TableCell className="text-center py-3 md:py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-base md:text-lg font-black ${isComplete ? 'text-emerald-500' : 'text-slate-900'}`}>
                                                            {scanned}
                                                        </span>
                                                        <div className="w-10 md:w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                                style={{ width: `${Math.min(100, (scanned / item.qty) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-3 md:py-4 pr-6">
                                                    {isComplete ? (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">OK</span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 text-slate-400">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Wait</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 md:p-6 pt-2 md:pt-4 border-t border-slate-100 bg-white/80 backdrop-blur-sm sticky bottom-0 z-20 shrink-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl md:rounded-2xl px-6 md:px-8 h-10 md:h-12 font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all text-sm md:text-base order-2 sm:order-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="bg-indigo-600 hover:bg-slate-900 text-white rounded-xl md:rounded-2xl px-6 md:px-12 h-10 md:h-12 font-black shadow-2xl shadow-indigo-100 flex items-center justify-center gap-2 md:gap-3 group transition-all text-sm md:text-base order-1 sm:order-2"
                    >
                        Confirm Scanned Items
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ScanningModal;
