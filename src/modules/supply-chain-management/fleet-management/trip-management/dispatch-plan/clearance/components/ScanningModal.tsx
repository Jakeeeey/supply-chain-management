'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Scan,
    X,
    CheckCircle2,
    Loader2,
    Plus,
    Minus,
    ArrowRight,
    Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
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
import { InvoiceLine, RFIDMapping } from '../types';

interface ScanningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scannedQtys: Record<string | number, number>, scannedRFIDs: Record<string | number, string[]>) => void;
    items: InvoiceLine[];
    rfidTags?: RFIDMapping[];
    initialScanned?: Record<string | number, number>;
    initialScannedRFIDs?: Record<string | number, string[]>;
}

const ScanningModal: React.FC<ScanningModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    items,
    initialScanned = {},
    initialScannedRFIDs = {},
    rfidTags = []
}) => {
    const [scannedQtys, setScannedQtys] = useState<Record<string | number, number>>(initialScanned);
    const scannedQtysRef = useRef<Record<string | number, number>>(initialScanned);
    const scannedRFIDsRef = useRef<Record<string | number, string[]>>(initialScannedRFIDs);
    const [scannedTags, setScannedTags] = useState<Set<string>>(new Set());
    const scannedTagsRef = useRef<Set<string>>(new Set());
    const [lastScanned, setLastScanned] = useState<InvoiceLine | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    
    const bufferRef = useRef('');
    const lastKeystrokeTime = useRef(0);

    const playSound = (type: 'success' | 'error') => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } else {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setScannedQtys(initialScanned);
            scannedQtysRef.current = initialScanned;
            scannedRFIDsRef.current = initialScannedRFIDs;
            setScannedTags(new Set());
            scannedTagsRef.current = new Set();
            bufferRef.current = '';
            setLastScanned(null);
            setIsScanning(true);
        }
    }, [isOpen, initialScanned]);

    const handleRFIDScan = (input: string) => {
        const rawInput = input.trim().toUpperCase();
        if (!rawInput) return;

        let tags: string[] = [];
        if (rawInput.length > 24 && !/[\s\n\r,]+/.test(rawInput)) {
            for (let i = 0; i < rawInput.length; i += 24) {
                const chunk = rawInput.substring(i, i + 24);
                if (chunk.length === 24) tags.push(chunk);
            }
        } else {
            tags = rawInput.split(/[\s\n\r,]+/).filter(Boolean);
        }

        if (tags.length === 0) return;

        tags.forEach(tag => {
            if (scannedTagsRef.current.has(tag)) {
                if (tags.length < 5) toast.warning(`RFID Tag ${tag} already scanned!`);
                playSound('error');
                return;
            }

            const mapping = rfidTags.find(t => t.rfid?.toUpperCase() === tag);
            
            if (!mapping) {
                toast.error(`Invalid RFID Tag: ${tag.substring(0, 8)}...`);
                playSound('error');
                return;
            }

            const item = items.find(i => Number(i.product_id) === Number(mapping.product_id));

            if (!item) {
                toast.error(`Product for Tag ${tag.substring(0, 8)}... not in manifest.`);
                playSound('error');
                return;
            }

            const currentQty = scannedQtysRef.current[item.id] || 0;
            if (currentQty >= item.qty) {
                if (tags.length < 5) toast.warning(`Product ${item.product_name} is already fully scanned.`);
                playSound('error');
                // Track so we don't warn again rapidly
                scannedTagsRef.current.add(tag);
                setScannedTags(new Set(scannedTagsRef.current));
                return;
            }

            const newQty = currentQty + 1;
            scannedTagsRef.current.add(tag);
            setScannedTags(new Set(scannedTagsRef.current));
            
            scannedQtysRef.current = { ...scannedQtysRef.current, [item.id]: newQty };
            setScannedQtys(scannedQtysRef.current);

            // Track the exact tag for the API payload
            const previousTags = scannedRFIDsRef.current[item.id] || [];
            scannedRFIDsRef.current = { ...scannedRFIDsRef.current, [item.id]: [...previousTags, tag] };

            setLastScanned(item);
            
            if (tags.length < 5) toast.success(`Scanned: ${item.product_name}`);
            playSound('success');
        });
    };

    // Global Keydown Listener for Hardware Scanners
    useEffect(() => {
        if (!isOpen || !isScanning) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is manually typing elsewhere (shouldn't happen without input, but safe)
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const now = Date.now();
            // Reset buffer if delay is too long (>100ms indicates human typing, hardware scanners are 5-30ms)
            if (now - lastKeystrokeTime.current > 100) {
                bufferRef.current = '';
            }
            lastKeystrokeTime.current = now;

            if (e.key === 'Enter') {
                if (bufferRef.current) {
                    handleRFIDScan(bufferRef.current);
                    bufferRef.current = '';
                }
            } else if (e.key.length === 1) {
                bufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isScanning, rfidTags, items, scannedQtys, scannedTags]);

    // Internal simulation for RFID scan - Updated to use real RFID tags
    const simulateScan = () => {
        // 1. If we have real RFID tags from the database, use them
        if (rfidTags && rfidTags.length > 0) {
            // Available tags are those whose product_id is in this invoice and item not fully scanned
            const availableTags = rfidTags.filter(tag => {
                const item = items.find(i => Number(i.product_id) === Number(tag.product_id));
                return item && (scannedQtysRef.current[item.id] || 0) < item.qty;
            });

            if (availableTags.length === 0) {
                setIsScanning(false);
                toast.info("No more valid unscanned tags found in data.");
                return;
            }

            const randomIndex = Math.floor(Math.random() * availableTags.length);
            const tagToScan = availableTags[randomIndex];
            
            if (tagToScan && tagToScan.rfid) {
                handleRFIDScan(tagToScan.rfid);
            }
            return;
        }

        // Fallback to original simulation if no rfidTags provided or if rfidTags is empty
        const remainingItems = items.filter(item => (scannedQtysRef.current[item.id] || 0) < item.qty);
        if (remainingItems.length === 0) {
            setIsScanning(false);
            toast.info("All items already scanned.");
            return;
        }
        const randomIndex = Math.floor(Math.random() * remainingItems.length);
        const item = remainingItems[randomIndex];
        const newQty = (scannedQtysRef.current[item.id] || 0) + 1;
        
        scannedQtysRef.current = { ...scannedQtysRef.current, [item.id]: newQty };
        setScannedQtys(scannedQtysRef.current);

        // Map dummy/generated simulation tag if no real tags are supplied, to prevent API payload errors
        const previousTags = scannedRFIDsRef.current[item.id] || [];
        const simTag = `SIMULATED-${item.id}-${newQty}`.padEnd(24, '0').substring(0, 24);
        scannedRFIDsRef.current = { ...scannedRFIDsRef.current, [item.id]: [...previousTags, simTag] };

        setLastScanned(item);
        toast.success(`Simulated scan for: ${item.product_name}`);
        
        // Check if all items are scanned after this simulation
        const totalRequired = items.reduce((acc, i) => acc + i.qty, 0);
        const totalScannedNow = Object.values(scannedQtysRef.current).reduce((acc, q) => acc + q, 0);
        if (totalScannedNow >= totalRequired) {
            setIsScanning(false);
            toast.success("Manifest completed!");
        }
    };

    const handleConfirm = () => {
        // Ensure ALL items have a value (at least 0) to distinguish from "not yet reconciled"
        const finalScanned = { ...scannedQtys };
        items.forEach(item => {
            if (finalScanned[item.id] === undefined) {
                finalScanned[item.id] = 0;
            }
        });
        onConfirm(finalScanned, scannedRFIDsRef.current);
        onClose();
    };

    const totalRequired = items.reduce((acc, item) => acc + item.qty, 0);
    const totalScanned = Object.values(scannedQtys).reduce((acc, qty) => acc + qty, 0);
    const progressPercent = (totalScanned / totalRequired) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="sm:max-w-2xl w-[95vw] p-0 bg-background rounded-2xl md:rounded-3xl border-none shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-4 md:p-6 pb-2 shrink-0 bg-card border-b border-border">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                                <Scan className={`w-4 h-4 md:w-5 md:h-5 ${isScanning ? 'animate-pulse' : ''}`} />
                            </div>
                            <div className="space-y-0.5 truncate">
                                <DialogTitle className="text-lg md:text-xl font-bold truncate text-foreground">RFID Scanning</DialogTitle>
                                <p className="text-[10px] md:text-xs text-muted-foreground font-medium truncate">
                                    {isScanning ? 'Waiting for RFID tag detection...' : 'All items accounted for.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isScanning && (
                                <>
                                    {/* Manual Input Removed for Security/Scanner-only Constraint */}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={simulateScan}
                                        className="bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider h-7 md:h-8 px-2 md:px-3 whitespace-nowrap"
                                    >
                                        Simulate Scan
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2 space-y-6 custom-scrollbar bg-background">
                    {/* Total Progress Card */}
                    <div className="p-4 md:p-6 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/10 relative overflow-hidden shrink-0">
                        <div className="relative z-10 flex items-center justify-between mb-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">Global Progress</p>
                                <h3 className="text-2xl md:text-3xl font-black">
                                    {totalScanned} <span className="text-sm md:text-lg font-medium text-primary-foreground/70">/ {totalRequired} Boxes</span>
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
                        <div className="absolute bottom-[-10%] left-[-5%] w-24 md:w-32 h-24 md:h-32 bg-primary-foreground/10 rounded-full blur-xl" />
                    </div>

                    {/* Last Scanned Item (Real-time feedback) */}
                    {lastScanned && (
                        <div className="p-3 md:p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shrink-0">
                            <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                <div className="p-2 rounded-lg bg-emerald-500 text-white shrink-0">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5 truncate">
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Detected Tag</p>
                                    <p className="text-xs md:text-sm font-bold text-foreground truncate">{lastScanned.product_name}</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">Unit</p>
                                <p className="text-xs md:text-sm font-black text-foreground">{lastScanned.unit}</p>
                            </div>
                        </div>
                    )}

                    {/* Items List */}
                    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
                        <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detail Manifest</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{items.length} Unique SKUs</p>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <Table className="min-w-[500px] md:min-w-full">
                                <TableHeader className="bg-card sticky top-0 z-10 shadow-sm border-b border-border">
                                    <TableRow className="hover:bg-transparent border-border">
                                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase py-3 pl-4">Product Description</TableHead>
                                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase text-center py-3">Total Required</TableHead>
                                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase text-center py-3">Scanned Qty</TableHead>
                                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase text-right py-3 pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => {
                                        const scanned = scannedQtys[item.id] || 0;
                                        const isComplete = scanned >= item.qty;

                                        return (
                                            <TableRow key={item.id} className={`group hover:bg-muted/30 transition-colors border-border ${isComplete ? 'opacity-60' : ''}`}>
                                                <TableCell className="py-3 md:py-4 pl-4">
                                                    <div className="space-y-1">
                                                        <p className="text-xs md:text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{item.product_name}</p>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase tracking-tighter border border-border">
                                                            {item.unit}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-muted-foreground text-xs md:text-sm py-3 md:py-4 tabular-nums">{item.qty}</TableCell>
                                                <TableCell className="text-center py-3 md:py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-base md:text-lg font-black tabular-nums ${isComplete ? 'text-emerald-500' : 'text-foreground'}`}>
                                                            {scanned}
                                                        </span>
                                                        <div className="w-10 md:w-12 h-1 bg-muted rounded-full overflow-hidden border border-border">
                                                            <div
                                                                className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-primary'}`}
                                                                style={{ width: `${Math.min(100, (scanned / item.qty) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-3 md:py-4 pr-6">
                                                    {isComplete ? (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">OK</span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
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

                <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 md:p-6 pt-2 md:pt-4 border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0 z-20 shrink-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl md:rounded-2xl px-6 md:px-8 h-10 md:h-12 font-bold text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all text-sm md:text-base order-2 sm:order-1 border-border">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl md:rounded-2xl px-6 md:px-12 h-10 md:h-12 font-black shadow-xl shadow-primary/10 flex items-center justify-center gap-2 md:gap-3 group transition-all text-sm md:text-base order-1 sm:order-2"
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
