"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORTemplate, ORFieldConfig } from "../types";
import { Upload, Move, Type, Save, Trash2, Maximize2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { InvoicingService } from "../services/InvoicingService";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: ORTemplate) => void;
    initialTemplate?: ORTemplate;
}

const DEFAULT_TEMPLATE: ORTemplate = {
    id: 'default-or',
    name: 'Default Official Receipt',
    width: 210,
    height: 265,
    fields: {
        customer_name: { x: 33, y: 30, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Customer Name' },
        date: { x: 180, y: 30, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Date' },
        store_name: { x: 45, y: 38, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Store Name' },
        payment_name: { x: 180, y: 38, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Terms' },
        customer_tin: { x: 20, y: 46, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'TIN' },
        address: { x: 33, y: 55, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Address' },
        vatable_sales: { x: 180, y: 145, fontSize: 10, fontFamily: 'courier', fontWeight: 'bold', label: 'Vatable Sales' },
        vat_amount: { x: 180, y: 151, fontSize: 10, fontFamily: 'courier', fontWeight: 'bold', label: 'VAT Amount' },
        gross_total: { x: 180, y: 157, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Gross Total' },
        discount_total: { x: 180, y: 163, fontSize: 10, fontFamily: 'courier', fontWeight: 'bold', label: 'Discount Total' },
        net_total: { x: 180, y: 175, fontSize: 12, fontFamily: 'courier', fontWeight: 'bold', label: 'Net Total' },
        po_no: { x: 10, y: 185, fontSize: 10, fontFamily: 'courier', fontWeight: 'bold', label: 'PO Number' },
        salesman: { x: 10, y: 191, fontSize: 10, fontFamily: 'courier', fontWeight: 'bold', label: 'Salesman Name' },
        total_amount_due: { x: 180, y: 200, fontSize: 12, fontFamily: 'courier', fontWeight: 'bold', label: 'Total Amount Due' },
        barcode: { x: 170, y: 5, fontSize: 12, fontFamily: 'courier', fontWeight: 'bold', label: 'Barcode' },
    },
    tableSettings: {
        startY: 65,
        rowHeight: 12.2,
        fontSize: 10,
        product_name_width: 85, // Default width in mm
        columns: {
            product_name: { x: 10 },
            quantity: { x: 105 },
            unit_price: { x: 126 },
            discount: { x: 153 },
            net_amount: { x: 184 }
        }
    }
};

export const ReceiptTemplateEditor: React.FC<Props> = ({ isOpen, onClose, onSave, initialTemplate }) => {
    const [template, setTemplate] = useState<ORTemplate>(DEFAULT_TEMPLATE);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync state when initialTemplate changes or modal opens
    useEffect(() => {
        if (isOpen && initialTemplate) {
            setTemplate({
                ...initialTemplate,
                fields: {
                    ...DEFAULT_TEMPLATE.fields,
                    ...(initialTemplate.fields || {})
                },
                tableSettings: {
                    ...DEFAULT_TEMPLATE.tableSettings,
                    ...(initialTemplate.tableSettings || {})
                }
            });
        } else if (isOpen && !initialTemplate) {
            setTemplate(DEFAULT_TEMPLATE);
        }
    }, [isOpen, initialTemplate]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Still show a quick preview with base64 for UX if you want, 
        // but better to just upload immediately to solve the size issue.
        setIsUploading(true);
        try {
            const fileId = await InvoicingService.uploadFile(file);
            setTemplate(prev => ({ ...prev, backgroundImage: fileId }));
            toast.success("Background image uploaded successfully");
        } catch (err: any) {
            console.error("Upload failed:", err);
            toast.error(err.message || "Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const updateField = (key: string, updates: Partial<ORFieldConfig>) => {
        setTemplate(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [key]: { ...prev.fields[key], ...updates }
            }
        }));
    };

    const handleDrag = (key: string, e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = template.fields[key].x;
        const initialY = template.fields[key].y;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) * (template.width / rect.width);
            const dy = (moveEvent.clientY - startY) * (template.height / rect.height);
            
            updateField(key, {
                x: Math.max(0, Math.min(template.width, initialX + dx)),
                y: Math.max(0, Math.min(template.height, initialY + dy))
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleTableDrag = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const startY = e.clientY;
        const initialStartY = template.tableSettings.startY;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dy = (moveEvent.clientY - startY) * (template.height / rect.height);
            setTemplate(prev => ({
                ...prev,
                tableSettings: {
                    ...prev.tableSettings,
                    startY: Math.max(0, Math.min(template.height, initialStartY + dy))
                }
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleColumnDrag = (colKey: string, e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const startX = e.clientX;
        // @ts-ignore
        const initialX = template.tableSettings.columns?.[colKey]?.x || 0;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) * (template.width / rect.width);
            setTemplate(prev => ({
                ...prev,
                tableSettings: {
                    ...prev.tableSettings,
                    columns: {
                        ...prev.tableSettings.columns,
                        [colKey]: { x: Math.max(0, Math.min(template.width, initialX + dx)) }
                    }
                }
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    const handleRowHeightDrag = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const startY = e.clientY;
        const initialRowHeight = template.tableSettings.rowHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dy = (moveEvent.clientY - startY) * (template.height / rect.height);
            setTemplate(prev => ({
                ...prev,
                tableSettings: {
                    ...prev.tableSettings,
                    rowHeight: Math.max(1, initialRowHeight + dy)
                }
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const fitToWidth = () => {
        if (!canvasRef.current || !scrollRef.current) return;
        const availableWidth = scrollRef.current.clientWidth - 100; // padding
        const templateWidthPx = template.width * 3.7795275591; // mm to px approx
        setZoom(Math.max(0.1, Math.min(2, availableWidth / templateWidthPx)));
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(fitToWidth, 100);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !translate-x-0 !translate-y-0 !m-0 !rounded-none flex flex-col p-0 overflow-hidden border-none shadow-none bg-background !top-0 !left-0">
                <DialogHeader className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
                    <DialogTitle className="flex items-center justify-between text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <Type className="w-5 h-5 text-primary" />
                            </div>
                            Official Receipt Template Designer
                        </div>
                        <div className="flex items-center gap-4 mr-8">
                            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                                    <span className="text-lg">-</span>
                                </Button>
                                <span 
                                    className="text-xs font-mono min-w-[3rem] text-center cursor-pointer hover:bg-background rounded"
                                    onClick={fitToWidth}
                                    title="Click to Fit to Width"
                                >
                                    {Math.round(zoom * 100)}%
                                </span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
                                    <span className="text-lg">+</span>
                                </Button>
                            </div>
                            <Button variant="outline" size="sm" onClick={fitToWidth} className="h-8 text-[10px] uppercase font-bold">
                                <Maximize2 className="w-3 h-3 mr-1" />
                                Fit to Screen
                            </Button>
                            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                {template.width}mm × {template.height}mm
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                    {/* Sidebar / Tools */}
                    <div className="w-96 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-6 overflow-y-auto">
                        <section className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Page Setup</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label>Width (mm)</Label>
                                    <Input 
                                        type="number" 
                                        value={template.width} 
                                        onChange={e => setTemplate(prev => ({ ...prev, width: Number(e.target.value) }))} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Height (mm)</Label>
                                    <Input 
                                        type="number" 
                                        value={template.height} 
                                        onChange={e => setTemplate(prev => ({ ...prev, height: Number(e.target.value) }))} 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-[10px] h-7"
                                    onClick={() => setTemplate(prev => ({ ...prev, width: 215.9, height: 279.4 }))}
                                >
                                    Letter (8.5x11)
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-[10px] h-7"
                                    onClick={() => setTemplate(prev => ({ ...prev, width: 210, height: 297 }))}
                                >
                                    A4 size
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label>Background Image (Form Scan)</Label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="w-full relative overflow-hidden" disabled={isUploading}>
                                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        {isUploading ? "Uploading..." : "Upload Image"}
                                        <input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </Button>
                                    {template.backgroundImage && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => setTemplate(prev => ({ ...prev, backgroundImage: undefined }))}
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                <div className="flex items-center gap-2 text-amber-800">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase">Printing Tip</span>
                                </div>
                                <p className="text-[10px] text-amber-700 leading-tight">
                                    Para sa 100% alignment, siguraduhin na ang <b>Scale</b> sa Print Dialog ay naka-set sa <b>"100%"</b> o <b>"Actual Size"</b> (hindi Default).
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Fields Configuration</Label>
                            <div className="space-y-2">
                                {Object.entries(template.fields).map(([key, config]) => (
                                    <div 
                                        key={key}
                                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${activeField === key ? 'bg-primary/10 border-primary ring-1 ring-primary/20' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-primary/50'}`}
                                        onClick={() => setActiveField(key)}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium uppercase">{config.label}</span>
                                            <Move className="w-3 h-3 text-muted-foreground" />
                                        </div>
                                        {activeField === key && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">Font Size</Label>
                                                    <Input 
                                                        type="number" 
                                                        bs-size="sm"
                                                        value={config.fontSize} 
                                                        onChange={e => updateField(key, { fontSize: Number(e.target.value) })} 
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">Weight</Label>
                                                    <Select 
                                                        value={config.fontWeight} 
                                                        onValueChange={v => updateField(key, { fontWeight: v as any })}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="normal">Normal</SelectItem>
                                                            <SelectItem value="bold">Bold</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">Spacing</Label>
                                                    <Input 
                                                        type="number" 
                                                        step="0.1"
                                                        value={config.charSpacing ?? 0} 
                                                        onChange={e => updateField(key, { charSpacing: Number(e.target.value) })} 
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">ScaleX</Label>
                                                    <Input 
                                                        type="number" 
                                                        step="0.05"
                                                        value={config.scaleX ?? 1} 
                                                        onChange={e => updateField(key, { scaleX: Number(e.target.value) })} 
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Table Settings</Label>
                            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Table Font Size (pt)</Label>
                                    <Input 
                                        type="number" 
                                        value={template.tableSettings.fontSize} 
                                        onChange={e => setTemplate(prev => ({
                                            ...prev,
                                            tableSettings: { ...prev.tableSettings, fontSize: Number(e.target.value) }
                                        }))}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Row Height (mm)</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="number" 
                                            step="0.1"
                                            value={template.tableSettings.rowHeight} 
                                            onChange={e => setTemplate(prev => ({
                                                ...prev,
                                                tableSettings: { ...prev.tableSettings, rowHeight: Number(e.target.value) }
                                            }))}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <div className="flex flex-col gap-0.5">
                                            <Button variant="outline" size="icon" className="h-4 w-7" onClick={() => setTemplate(prev => ({ ...prev, tableSettings: { ...prev.tableSettings, rowHeight: Number((prev.tableSettings.rowHeight + 0.1).toFixed(2)) } }))}>+</Button>
                                            <Button variant="outline" size="icon" className="h-4 w-7" onClick={() => setTemplate(prev => ({ ...prev, tableSettings: { ...prev.tableSettings, rowHeight: Math.max(0, Number((prev.tableSettings.rowHeight - 0.1).toFixed(2))) } }))}>-</Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Desc. Width (mm / chars)</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="number" 
                                            step="1"
                                            value={template.tableSettings.product_name_width ?? 85} 
                                            onChange={e => setTemplate(prev => ({
                                                ...prev,
                                                tableSettings: { ...prev.tableSettings, product_name_width: Number(e.target.value) }
                                            }))}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <div className="flex flex-col gap-0.5">
                                            <Button variant="outline" size="icon" className="h-4 w-7" onClick={() => setTemplate(prev => ({ ...prev, tableSettings: { ...prev.tableSettings, product_name_width: (prev.tableSettings.product_name_width ?? 85) + 1 } }))}>+</Button>
                                            <Button variant="outline" size="icon" className="h-4 w-7" onClick={() => setTemplate(prev => ({ ...prev, tableSettings: { ...prev.tableSettings, product_name_width: Math.max(0, (prev.tableSettings.product_name_width ?? 85) - 1) } }))}>-</Button>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-muted-foreground mt-1">
                                        * Approx {Math.floor((template.tableSettings.product_name_width ?? 85) / 1.8)} characters (monospace).
                                    </p>
                                </div>
                                <p className="text-[9px] italic text-muted-foreground">* You can also drag the handle on the 2nd row to adjust height.</p>
                            </div>
                        </section>
                    </div>

                    {/* Canvas Area */}
                    <div ref={scrollRef} className="flex-1 bg-zinc-200 dark:bg-zinc-950 flex items-start justify-center overflow-auto relative p-12">
                        <div 
                            ref={canvasRef}
                            className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden ring-1 ring-zinc-300 dark:ring-white/10 transition-transform origin-top"
                            style={{
                                width: `${template.width}mm`,
                                height: `${template.height}mm`,
                                minWidth: `${template.width}mm`,
                                transform: `scale(${zoom})`,
                            }}
                        >
                            {template.backgroundImage && (
                                <img 
                                    src={InvoicingService.getImageUrl(template.backgroundImage)} 
                                    className="absolute inset-0 w-full h-full object-fill opacity-70 select-none pointer-events-none"
                                    alt="Background"
                                />
                            )}

                            {Object.entries(template.fields).map(([key, config]) => (
                                <div
                                    key={key}
                                    onMouseDown={(e) => {
                                        setActiveField(key);
                                        handleDrag(key, e);
                                    }}
                                    className={`absolute cursor-move border border-dashed p-0.5 whitespace-nowrap select-none transition-shadow text-zinc-900 ${
                                        activeField === key ? 'border-primary ring-1 ring-primary z-50' : 'border-slate-300 z-10'
                                    }`}
                                    style={{
                                        left: `${config.x}mm`,
                                        top: `${config.y}mm`,
                                        fontSize: `${config.fontSize}pt`,
                                        fontFamily: config.fontFamily === 'courier' ? 'monospace' : config.fontFamily,
                                        fontWeight: config.fontWeight,
                                        letterSpacing: `${config.charSpacing ?? 0}pt`,
                                        transform: `scaleX(${config.scaleX ?? 1})`,
                                        transformOrigin: 'left center',
                                        backgroundColor: activeField === key ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.7)'
                                    }}
                                >
                                    {key === 'barcode' ? (
                                        <div style={{ opacity: 0.8 }}>
                                            <Barcode 
                                                value="12345678"
                                                height={30}
                                                width={1.2}
                                                fontSize={10}
                                                margin={0}
                                                background="transparent"
                                                renderer="canvas"
                                            />
                                        </div>
                                    ) : (
                                        config.label
                                    )}
                                </div>
                            ))}

                            {/* Table Start Visualization (Draggable) */}
                            <div 
                                className="absolute left-0 right-0 border-t-2 border-red-400 border-dashed z-40 flex items-center justify-center cursor-ns-resize hover:bg-red-400/10 group"
                                style={{ top: `${template.tableSettings.startY}mm`, height: '4mm', marginTop: '-2mm' }}
                                onMouseDown={handleTableDrag}
                            >
                                <span className="bg-red-400 text-white text-[10px] px-1 rounded-sm select-none opacity-50 group-hover:opacity-100 transition-opacity">
                                    TABLE START (Drag to move)
                                </span>
                            </div>

                            {/* Row Height Handle (Draggable handle on the 2nd row's top) */}
                            <div 
                                className="absolute left-0 right-0 border-t border-red-300/30 border-dashed z-40 flex items-center justify-end cursor-ns-resize hover:bg-zinc-400/10 group"
                                style={{ 
                                    top: `${template.tableSettings.startY + template.tableSettings.rowHeight}mm`, 
                                    height: '4mm', 
                                    marginTop: '-2mm' 
                                }}
                                onMouseDown={handleRowHeightDrag}
                            >
                                <span className="mr-8 bg-zinc-800 text-white text-[8px] px-1 rounded-sm select-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    Row Height: {template.tableSettings.rowHeight}mm (Drag to adjust)
                                </span>
                            </div>

                            {/* Sample Data Rows for Alignment */}
                            {(() => {
                                const cols = template.tableSettings.columns;
                                if (!cols) return null;
                                
                                // Standardized widths to match Preview logic
                                const w = {
                                    product_name: 85,
                                    quantity: 22,
                                    unit_price: 28,
                                    discount: 25,
                                    net_amount: 30
                                };

                                return [
                                    { product_name: 'SAMPLE PRODUCT NAME 48X180G', quantity: '90 BOX', unit_price: 'P2,208.00', discount: 'L4', net_amount: 'P190,771.20' },
                                    { product_name: 'ANOTHER SAMPLE ITEM 50X100G', quantity: '120 BOX', unit_price: 'P996.00', discount: 'L3', net_amount: 'P114,739.20' }
                                ].map((item, idx) => (
                                    <div 
                                        key={`sample-row-${idx}`}
                                    className="absolute w-full flex items-center pointer-events-none opacity-40 select-none grayscale text-zinc-900"
                                        style={{ 
                                            top: `${template.tableSettings.startY + (idx * template.tableSettings.rowHeight)}mm`,
                                            height: `${template.tableSettings.rowHeight}mm`,
                                            fontFamily: 'monospace',
                                            fontSize: `${template.tableSettings.fontSize}pt`,
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <div className="absolute truncate" style={{ left: `${cols.product_name?.x || 10}mm`, width: `${w.product_name}mm` }}>{item.product_name}</div>
                                        <div className="absolute text-center" style={{ left: `${(cols.quantity?.x || 105) - (w.quantity / 2)}mm`, width: `${w.quantity}mm` }}>{item.quantity}</div>
                                        <div className="absolute text-right" style={{ left: `${(cols.unit_price?.x || 126) - w.unit_price}mm`, width: `${w.unit_price}mm` }}>{item.unit_price}</div>
                                        <div className="absolute text-right" style={{ left: `${(cols.discount?.x || 153) - w.discount}mm`, width: `${w.discount}mm` }}>{item.discount}</div>
                                        <div className="absolute text-right" style={{ left: `${(cols.net_amount?.x || 184) - w.net_amount}mm`, width: `${w.net_amount}mm` }}>{item.net_amount}</div>
                                    </div>
                                ));
                            })()}

                            {/* Table Columns Visualization (Draggable) */}
                            {template.tableSettings.columns && Object.entries(template.tableSettings.columns).map(([colKey, colConfig]) => (
                                <div
                                    key={`col-${colKey}`}
                                    className="absolute border-l-2 border-blue-500 border-dashed z-30 flex flex-col items-start cursor-ew-resize hover:bg-blue-500/10 group"
                                    style={{ 
                                        left: `${colConfig.x}mm`, 
                                        top: `${template.tableSettings.startY}mm`,
                                        height: `${template.tableSettings.rowHeight * 4}mm`, // Show 4 rows high
                                        width: '6mm',
                                        marginLeft: '-3mm'
                                    }}
                                    onMouseDown={(e) => handleColumnDrag(colKey, e)}
                                >
                                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap select-none shadow-sm opacity-80 group-hover:opacity-100 transition-opacity transform -rotate-90 origin-left mt-6 font-bold">
                                        {colKey.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between sm:justify-between items-center shrink-0">
                    <div className="text-[10px] text-muted-foreground italic font-medium">
                        * Drag items to align. Coordinates are in Millimeters (mm).
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-widest border-zinc-200 dark:border-zinc-800" onClick={onClose}>Cancel</Button>

                        <Button className="h-10 px-8 rounded-xl font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-primary/20" onClick={() => onSave(template)}>
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Save Template
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
