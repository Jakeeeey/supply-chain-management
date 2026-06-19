'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Scan,
    X,
    Wifi,
    Tag,
    Trash2,
    Plus,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BulkRegisterModal } from './BulkRegisterModal';
import { ProductSearchSelect } from './ProductSearchSelect';

interface CylinderTaggingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: (serials: string[]) => void;
}

const CylinderTaggingModal: React.FC<CylinderTaggingModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    // serials = existing/registered serials
    const [serials, setSerials] = useState<string[]>([]);
    // unregisteredSerials = serials not found in cylinder_assets table
    const [unregisteredSerials, setUnregisteredSerials] = useState<string[]>([]);
    
    const [inputValue, setInputValue] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Product states
    const [products, setProducts] = useState<{ product_id: number; product_name: string; product_code: string }[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    // Fetch serialized products
    useEffect(() => {
        if (isOpen) {
            setIsLoadingProducts(true);
            fetch('/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial/cylinder-assets/products')
                .then(res => res.json())
                .then(data => {
                    setProducts(data.data || []);
                })
                .catch(err => {
                    console.error('Failed to load products:', err);
                    toast.error('Failed to load product list.');
                })
                .finally(() => {
                    setIsLoadingProducts(false);
                });
        }
    }, [isOpen]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSerials([]);
            setUnregisteredSerials([]);
            setInputValue('');
            setSelectedProductId('');
            setIsConfirming(false);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 150);
        }
    }, [isOpen]);

    const handleAddSerial = async () => {
        const trimmed = inputValue.trim().toUpperCase();
        if (!trimmed) return;

        // Check duplicates
        if (serials.includes(trimmed) || unregisteredSerials.includes(trimmed)) {
            toast.warning(`Serial number "${trimmed}" is already in the list.`);
            return;
        }

        setIsValidating(true);
        try {
            const response = await fetch(
                `/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial/cylinder-assets?serial_number=${encodeURIComponent(trimmed)}`
            );
            if (!response.ok) {
                throw new Error('API failure');
            }
            const data = await response.json();

            if (data.exists) {
                setSerials(prev => [trimmed, ...prev]);
                toast.success(`Serial verified and added: ${trimmed}`);
            } else {
                setUnregisteredSerials(prev => [...prev, trimmed]);
                toast.warning(`Serial "${trimmed}" is unregistered.`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to validate serial number with database.');
        } finally {
            setIsValidating(false);
            setInputValue('');
            // Re-focus input for quick entry
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    };

    const handleRemoveSerial = (indexToRemove: number) => {
        setSerials(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleRemoveUnregistered = (indexToRemove: number) => {
        setUnregisteredSerials(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleRegisterAll = () => {
        setIsBulkOpen(true);
    };

    const handleRegisterSuccess = (registeredList: string[]) => {
        setSerials(prev => [...registeredList, ...prev]);
        setUnregisteredSerials([]);
    };

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            if (serials.length > 0) {
                const response = await fetch('/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial/cylinder-assets/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        serials,
                        selectedProductId
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to confirm serials');
                }
            }

            if (onConfirm) {
                onConfirm(serials);
            }
            toast.success(`Successfully confirmed ${serials.length} serial numbers.`);
            onClose();
        } catch (error) {
            console.error('Failed to confirm serials:', error);
            toast.error('Failed to confirm serials during finalization.');
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] w-[95vw] p-0 bg-background rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col">
                
                {/* Custom Header with Theme-adaptable bg-primary color */}
                <div className="p-6 bg-primary text-primary-foreground relative shrink-0">
                    <button 
                        onClick={onClose} 
                        className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/10 text-primary-foreground/85 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/15 rounded-xl shrink-0">
                            <Scan className="w-6 h-6 text-white" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight text-white">
                            Serial Number Input
                        </DialogTitle>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[55vh] custom-scrollbar bg-background">
                    
                    {/* Product Selection Dropdown */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Select Product
                        </label>
                        <ProductSearchSelect
                            options={products}
                            value={selectedProductId}
                            disabled={isLoadingProducts}
                            onValueChange={setSelectedProductId}
                            placeholder={isLoadingProducts ? "Loading products..." : "Select Product"}
                        />
                    </div>

                    {/* Input Field Section */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Input Serial Number
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    ref={inputRef}
                                    placeholder={selectedProductId ? "Type or scan serial number..." : "Please select a product first..."}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={isValidating || !selectedProductId}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSerial();
                                        }
                                    }}
                                    className="h-11 rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-medium shadow-sm transition-all pr-10"
                                />
                                {isValidating && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <Button 
                                onClick={handleAddSerial}
                                disabled={isValidating || !inputValue.trim() || !selectedProductId}
                                className="h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 italic font-medium">
                            Tip: Press Enter after typing to add the serial number.
                        </p>
                    </div>

                    {/* Wifi / Ready Status Banner */}
                    <div className="py-2.5 px-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 flex items-center justify-center gap-2 text-primary">
                        <Wifi className="w-4 h-4 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider">
                            Ready for Manual Input
                        </span>
                    </div>

                    {/* Unregistered Warning Box */}
                    {unregisteredSerials.length > 0 && (
                        <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/50 space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-orange-600">
                                    <AlertTriangle className="w-4.5 h-4.5" />
                                    <span className="text-[11px] font-black uppercase tracking-wider">
                                        {unregisteredSerials.length} Unregistered {unregisteredSerials.length === 1 ? 'Serial' : 'Serials'}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleRegisterAll}
                                    className="h-7 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                    Register All
                                </Button>
                            </div>
                            
                            {/* Unregistered tags list */}
                            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto p-1 custom-scrollbar">
                                {unregisteredSerials.map((serial, idx) => (
                                    <span 
                                        key={serial}
                                        className="h-8 pl-3 pr-2.5 rounded-lg border border-orange-200 bg-orange-100 text-orange-800 text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm"
                                    >
                                        {serial}
                                        <button 
                                            onClick={() => handleRemoveUnregistered(idx)}
                                            className="text-orange-500 hover:text-orange-800 transition-colors p-0.5 rounded"
                                            title="Delete unregistered serial"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Serial List Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Serial List
                            </label>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/15 shadow-sm">
                                {serials.length} {serials.length === 1 ? 'Serial' : 'Serials'}
                            </span>
                        </div>

                        {/* List Area */}
                        <div className="border border-border rounded-xl min-h-[160px] max-h-[220px] overflow-y-auto bg-card shadow-inner flex flex-col custom-scrollbar">
                            {serials.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/60 space-y-2">
                                    <Tag className="w-10 h-10 text-muted-foreground/45 stroke-[1.5]" />
                                    <span className="text-sm font-medium">
                                        No serial numbers added yet
                                    </span>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {serials.map((serial, index) => (
                                        <div 
                                            key={serial} 
                                            className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all group"
                                        >
                                            <span className="font-mono text-sm font-bold text-foreground">
                                                {serial}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveSerial(index)}
                                                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-80 group-hover:opacity-100"
                                                title="Remove serial"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="flex items-center justify-between p-4 border-t border-border bg-card shrink-0">
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        disabled={isConfirming}
                        className="rounded-xl font-bold text-muted-foreground hover:text-foreground transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={serials.length === 0 || isConfirming}
                        className="rounded-xl font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm {serials.length} {serials.length === 1 ? 'Serial' : 'Serials'}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>

        <BulkRegisterModal
            isOpen={isBulkOpen}
            onClose={() => setIsBulkOpen(false)}
            unregisteredSerials={unregisteredSerials}
            onRegisterSuccess={handleRegisterSuccess}
            productId={Number(selectedProductId)}
        />
        </>
    );
};

export default CylinderTaggingModal;
