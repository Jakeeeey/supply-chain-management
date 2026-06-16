'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    ClipboardCheck,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface BulkRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    unregisteredSerials: string[];
    onRegisterSuccess: (registeredSerials: string[]) => void;
    productId: number;
    branchId?: number;
    cost?: number;
}

interface CylinderAssetInput {
    serial_number: string;
    product_id: string;
    cylinder_condition: 'GOOD' | 'FOR_REPAIR' | 'DAMAGED' | 'SCRAP';
    expiration_date: string;
    tare_weight: string;
}

export function BulkRegisterModal({
    isOpen,
    onClose,
    unregisteredSerials,
    onRegisterSuccess,
    productId,
    branchId: _branchId,
    cost
}: BulkRegisterModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Bulk Apply states
    const [bulkCondition, setBulkCondition] = useState<'GOOD' | 'FOR_REPAIR' | 'DAMAGED' | 'SCRAP'>('GOOD');
    const [bulkExpiration, setBulkExpiration] = useState('');
    const [bulkTare, setBulkTare] = useState('');

    // Individual states
    const [assets, setAssets] = useState<CylinderAssetInput[]>([]);

    // Initialize list when modal opens or products load
    useEffect(() => {
        if (isOpen) {
            setAssets(
                unregisteredSerials.map(serial => ({
                    serial_number: serial,
                    product_id: String(productId || ''),
                    cylinder_condition: 'GOOD',
                    expiration_date: '',
                    tare_weight: ''
                }))
            );
            setBulkCondition('GOOD');
            setBulkExpiration('');
            setBulkTare('');
        }
    }, [isOpen, unregisteredSerials, productId]);

    const handleApplyCondition = () => {
        setAssets(prev => prev.map(asset => ({
            ...asset,
            cylinder_condition: bulkCondition
        })));
        toast.info(`Applied condition "${bulkCondition}" to all serials.`);
    };

    const handleApplyExpiration = () => {
        setAssets(prev => prev.map(asset => ({
            ...asset,
            expiration_date: bulkExpiration
        })));
        toast.info('Applied expiration date to all serials.');
    };

    const handleApplyTarget = () => {
        setAssets(prev => prev.map(asset => ({
            ...asset,
            tare_weight: bulkTare
        })));
        toast.info('Applied tare weight to all serials.');
    };

    const handleAssetChange = (index: number, field: keyof CylinderAssetInput, value: string) => {
        setAssets(prev => prev.map((asset, idx) => {
            if (idx === index) {
                return { ...asset, [field]: value };
            }
            return asset;
        }));
    };

    const handleClearAll = () => {
        setAssets(prev => prev.map(asset => ({
            ...asset,
            product_id: String(productId || ''),
            cylinder_condition: 'GOOD',
            expiration_date: '',
            tare_weight: ''
        })));
        setBulkCondition('GOOD');
        setBulkExpiration('');
        setBulkTare('');
        toast.info('Cleared all form inputs.');
    };

    const handleSubmit = async () => {
        const hasMissingProduct = assets.some(a => !a.product_id);
        if (hasMissingProduct) {
            toast.error('Please select a product for all serial numbers.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payloads = assets.map(asset => ({
                product_id: Number(asset.product_id),
                serial_number: asset.serial_number,
                cylinder_status: 'EMPTY',
                cylinder_condition: asset.cylinder_condition,
                current_branch_id: 196,
                expiration_date: asset.expiration_date || null,
                tare_weight: asset.tare_weight ? parseFloat(asset.tare_weight) : null,
                cost: cost || null
            }));

            const response = await fetch('/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial/cylinder-assets/draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payloads)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Registration failed');
            }

            toast.success(`Successfully registered ${assets.length} cylinders.`);
            onRegisterSuccess(assets.map(a => a.serial_number));
            onClose();
        } catch (error: unknown) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to register cylinder assets.';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] w-[95vw] p-0 bg-background rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Section */}
                <div className="p-6 bg-card border-b border-border relative shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                            <ClipboardCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                Bulk Register Cylinders
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground font-medium">
                                Apply specific fields to all <span className="text-primary font-bold">{unregisteredSerials.length}</span> serials.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-background">
                    
                    {/* Bulk Application Controls Box */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Bulk Condition */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bulk Condition</label>
                                <button onClick={handleApplyCondition} className="text-[10px] font-black uppercase text-primary hover:underline">Apply to All</button>
                            </div>
                            <Select 
                                value={bulkCondition} 
                                onValueChange={(val: 'GOOD' | 'FOR_REPAIR' | 'DAMAGED' | 'SCRAP') => setBulkCondition(val)}
                            >
                                <SelectTrigger className="h-10 bg-background border-border rounded-lg text-xs font-bold">
                                    <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    <SelectItem value="GOOD">GOOD</SelectItem>
                                    <SelectItem value="FOR_REPAIR">FOR REPAIR</SelectItem>
                                    <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                                    <SelectItem value="SCRAP">SCRAP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Bulk Expiration */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bulk Expiration</label>
                                <button onClick={handleApplyExpiration} className="text-[10px] font-black uppercase text-primary hover:underline">Apply to All</button>
                            </div>
                            <Input
                                type="date"
                                value={bulkExpiration}
                                onChange={(e) => setBulkExpiration(e.target.value)}
                                className="h-10 bg-background border-border rounded-lg text-xs font-medium"
                            />
                        </div>

                        {/* Bulk Tare Weight */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bulk Tare (KG)</label>
                                <button onClick={handleApplyTarget} className="text-[10px] font-black uppercase text-primary hover:underline">Apply to All</button>
                            </div>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={bulkTare}
                                onChange={(e) => setBulkTare(e.target.value)}
                                className="h-10 bg-background border-border rounded-lg text-xs font-medium"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Table View of items */}
                    <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    <th className="p-3.5 pl-6">Serial Number</th>
                                    <th className="p-3.5">Cylinder Condition</th>
                                    <th className="p-3.5">Expiration Date</th>
                                    <th className="p-3.5 pr-6">Tare Weight (KG)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset, index) => (
                                    <tr key={asset.serial_number} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                        <td className="p-3.5 pl-6 font-mono text-sm font-bold text-primary">
                                            {asset.serial_number}
                                        </td>
                                        <td className="p-3.5 w-48">
                                            <Select 
                                                value={asset.cylinder_condition} 
                                                onValueChange={(val: 'GOOD' | 'FOR_REPAIR' | 'DAMAGED' | 'SCRAP') => handleAssetChange(index, 'cylinder_condition', val)}
                                            >
                                                <SelectTrigger className="h-9 bg-background border-border rounded-lg text-xs font-bold">
                                                    <SelectValue placeholder="Select condition" />
                                                </SelectTrigger>
                                                <SelectContent className="border-border">
                                                    <SelectItem value="GOOD">GOOD</SelectItem>
                                                    <SelectItem value="FOR_REPAIR">FOR REPAIR</SelectItem>
                                                    <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                                                    <SelectItem value="SCRAP">SCRAP</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="p-3.5 w-48">
                                            <Input
                                                type="date"
                                                value={asset.expiration_date}
                                                onChange={(e) => handleAssetChange(index, 'expiration_date', e.target.value)}
                                                className="h-9 bg-background border-border rounded-lg text-xs font-medium"
                                            />
                                        </td>
                                        <td className="p-3.5 pr-6">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={asset.tare_weight}
                                                onChange={(e) => handleAssetChange(index, 'tare_weight', e.target.value)}
                                                className="h-9 bg-background border-border rounded-lg text-xs font-medium"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="flex items-center justify-between p-4 border-t border-border bg-card shrink-0">
                    <button
                        onClick={handleClearAll}
                        disabled={isSubmitting}
                        className="text-xs font-black uppercase text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors pl-2"
                    >
                        Clear All
                    </button>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="rounded-xl font-bold text-muted-foreground hover:text-foreground border-border"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || assets.length === 0}
                            className="rounded-xl font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Register All Assets
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
