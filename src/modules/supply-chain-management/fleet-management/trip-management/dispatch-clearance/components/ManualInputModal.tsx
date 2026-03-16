'use client';

import React, { useState, useEffect } from 'react';
import {
    Edit3,
    CheckCircle2,
    Loader2,
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
import { Input } from '@/components/ui/input';
import { InvoiceLine } from '../types';

interface ManualInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (inputQtys: Record<string | number, number>) => void;
    items: InvoiceLine[];
    initialValues?: Record<string | number, number>;
}

const ManualInputModal: React.FC<ManualInputModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    items,
    initialValues = {}
}) => {
    const [inputQtys, setInputQtys] = useState<Record<string | number, number>>(initialValues);

    useEffect(() => {
        if (isOpen) {
            setInputQtys(initialValues);
        }
    }, [isOpen, initialValues]);

    const handleQtyChange = (itemId: string | number, value: string, maxQty: number) => {
        // Only allow numbers
        if (value && !/^\d+$/.test(value)) return;
        
        let numValue = parseInt(value, 10);
        
        if (isNaN(numValue)) {
            // Allow empty string to reset, but map internally as 0 or undefined.
            // When confirming, if we want to default to 0, we can.
            const newQtys = { ...inputQtys };
            delete newQtys[itemId]; // effectively resetting
            setInputQtys(newQtys);
            return;
        }

        // Prevent exceeding required amount for fulfillment concern items mapped by this component loosely 
        // (UI rules dictate you can't manually input more returns/missing than total orig qty)
        if (numValue > maxQty) {
            numValue = maxQty;
        }

        setInputQtys(prev => ({
            ...prev,
            [itemId]: numValue
        }));
    };

    const handleConfirm = () => {
        onConfirm(inputQtys);
        onClose();
    };

    const totalRequired = items.reduce((acc, item) => acc + item.qty, 0);
    const totalInput = Object.values(inputQtys).reduce((acc, qty) => acc + qty, 0);
    const progressPercent = (totalInput / totalRequired) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl w-[95vw] p-0 bg-white rounded-2xl md:rounded-3xl border-none shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
                <DialogHeader className="p-4 md:p-6 pb-2 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                                <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div className="space-y-0.5 truncate">
                                <DialogTitle className="text-lg md:text-xl font-bold truncate">Manual Input</DialogTitle>
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">
                                    Please enter the quantities manually.
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2 space-y-6 custom-scrollbar">
                    {/* Total Progress Card */}
                    <div className="p-4 md:p-6 rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-100 relative overflow-hidden shrink-0">
                        <div className="relative z-10 flex items-center justify-between mb-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-100">Global Progress</p>
                                <h3 className="text-2xl md:text-3xl font-black">
                                    {totalInput} <span className="text-sm md:text-lg font-medium text-orange-100">/ {totalRequired} Boxes</span>
                                </h3>
                            </div>
                            <div className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md">
                                <Edit3 className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                        </div>
                        <div className="relative z-10 h-2 md:h-3 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-500 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                style={{ width: `${Math.min(100, progressPercent)}%` }}
                            />
                        </div>

                        {/* Abstract Background Decoration */}
                        <div className="absolute top-[-20%] right-[-10%] w-32 md:w-48 h-32 md:h-48 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute bottom-[-10%] left-[-5%] w-24 md:w-32 h-24 md:h-32 bg-orange-300/20 rounded-full blur-xl" />
                    </div>

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
                                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-center py-3">Input Qty</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-right py-3 pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => {
                                        const inputQty = inputQtys[item.id] || 0;
                                        const isComplete = inputQty >= item.qty;

                                        return (
                                            <TableRow key={item.id} className={`group hover:bg-slate-50/50 transition-colors border-slate-50 ${isComplete ? 'opacity-60' : ''}`}>
                                                <TableCell className="py-3 md:py-4">
                                                    <div className="space-y-1">
                                                        <p className="text-xs md:text-sm font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition-colors">{item.product_name}</p>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-tighter">
                                                            {item.unit}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-slate-500 text-xs md:text-sm py-3 md:py-4">{item.qty}</TableCell>
                                                <TableCell className="text-center py-3 md:py-4">
                                                    <div className="flex justify-center">
                                                        <Input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={inputQtys[item.id] !== undefined ? inputQtys[item.id] : ''}
                                                            onChange={(e) => handleQtyChange(item.id, e.target.value, item.qty)}
                                                            className="w-20 text-center font-black h-10 border-slate-200 focus-visible:ring-orange-500 rounded-lg text-lg bg-orange-50/30"
                                                            placeholder="0"
                                                        />
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
                        className="bg-orange-500 hover:bg-slate-900 text-white rounded-xl md:rounded-2xl px-6 md:px-12 h-10 md:h-12 font-black shadow-2xl shadow-orange-100 flex items-center justify-center gap-2 md:gap-3 group transition-all text-sm md:text-base order-1 sm:order-2"
                    >
                        Confirm Manual Entries
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ManualInputModal;
