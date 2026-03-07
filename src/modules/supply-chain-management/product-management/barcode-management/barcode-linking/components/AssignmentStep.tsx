import React, { useRef, useState, useEffect, useCallback } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ScanLine,
    RefreshCcw,
    Keyboard,
    ArrowLeft,
    Scan,
    CheckCircle2,
    Settings2,
    Package,
    Wand2,
    Scale,
    Ruler,
} from "lucide-react";
import { Product, Category, Unit, RefData } from "../types";

interface DimensionState {
    length: string;
    width: string;
    height: string;
    unit: string;
    weight: string;
    weightUnit: string;
}

interface AssignmentStepProps {
    product: Product | null;
    barcode: string;
    setBarcode: (v: string) => void;
    activeTab: string;
    setActiveTab: (v: string) => void;
    scanSuccess: boolean;
    setScanSuccess: (v: boolean) => void;
    cameraError: string | null;
    setCameraError: (v: string | null) => void;
    selectedBarcodeTypeId: string;
    setSelectedBarcodeTypeId: (v: string) => void;
    recordDimensions: boolean;
    setRecordDimensions: (v: boolean) => void;
    dimensions: DimensionState;
    setDimensions: React.Dispatch<React.SetStateAction<DimensionState>>;
    barcodeTypes: RefData[];
    weightUnits: RefData[];
    cbmUnits: RefData[];
    onBack: () => void;
    onGenerate: () => void;
}

export function AssignmentStep({
    product,
    barcode,
    setBarcode,
    activeTab,
    setActiveTab,
    scanSuccess,
    setScanSuccess,
    setCameraError,
    selectedBarcodeTypeId,
    setSelectedBarcodeTypeId,
    recordDimensions,
    setRecordDimensions,
    dimensions,
    setDimensions,
    barcodeTypes,
    weightUnits,
    cbmUnits,
    onBack,
    onGenerate,
}: AssignmentStepProps) {
    // --- HELPERS ---
    const getCategoryName = () => {
        if (typeof product?.product_category === "object" && product?.product_category)
            return (product.product_category as Category).category_name;
        if (typeof product?.product_category === "string")
            return product.product_category;
        return "Uncategorized";
    };

    const getSelectedBarcodeTypeName = () =>
        barcodeTypes.find((t) => String(t.id) === selectedBarcodeTypeId)?.name || "EAN-13";

    // --- SCANNER SUPPORT (refs prevent stale closures in camera callback) ---
    const scannerInputRef = useRef<HTMLInputElement>(null);
    const [scanBuffer, setScanBuffer] = useState("");
    const scanSuccessRef = useRef(scanSuccess);
    scanSuccessRef.current = scanSuccess;

    // Auto-focus the hidden input when Scan tab is active and not yet scanned
    useEffect(() => {
        if (activeTab === "scan" && !scanSuccess) {
            const timer = setTimeout(() => scannerInputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [activeTab, scanSuccess]);

    // Handle hardware scanner: buffer chars, commit on Enter
    const handleHardwareKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (scanBuffer.trim()) {
                setBarcode(scanBuffer.trim());
                setScanSuccess(true);
                setScanBuffer("");
            }
            scannerInputRef.current?.focus();
        }
    };

    // Camera scan handler — uses ref so callback is stable and never stale
    const handleScan = useCallback((err: any, result: any) => {
        if (err?.name === "NotAllowedError") return;
        if (result && !scanSuccessRef.current) {
            const value = result.getText().trim();
            if (value) {
                setBarcode(value);
                setScanSuccess(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setBarcode, setScanSuccess]);

    return (
        <ScrollArea className="h-full">
            <div className="space-y-5 pr-3">
                {/* Product Summary Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                                {product?.description || product?.product_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-5">
                                    {product?.product_code}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                    {getCategoryName()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                    </Button>
                </div>

                <Separator />

                {/* Barcode Type Setting */}
                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                <Settings2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                    Barcode Format
                                </Label>
                                <p className="text-[11px] text-muted-foreground">Enforced on save</p>
                            </div>
                            <div className="w-[160px]">
                                <Select value={selectedBarcodeTypeId || undefined} onValueChange={setSelectedBarcodeTypeId}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {barcodeTypes.filter((t) => t?.id).map((t) => (
                                            <SelectItem key={String(t.id)} value={String(t.id)}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assignment Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="manual" className="text-xs">
                            <Keyboard className="h-3.5 w-3.5 mr-1.5" /> Manual
                        </TabsTrigger>
                        <TabsTrigger value="scan" className="text-xs">
                            <Scan className="h-3.5 w-3.5 mr-1.5" /> Scan
                        </TabsTrigger>
                        <TabsTrigger value="generate" className="text-xs">
                            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate
                        </TabsTrigger>
                    </TabsList>

                    <Card className="mt-3">
                        <CardContent className="p-4">
                            {/* Manual Tab */}
                            <TabsContent value="manual" className="mt-0 space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-xs">
                                        Barcode Value <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        placeholder="Enter barcode..."
                                        className="font-mono text-base"
                                        autoFocus
                                    />
                                </div>
                                {barcode && (
                                    <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 min-h-[80px] animate-in fade-in zoom-in duration-300">
                                        <Barcode
                                            value={barcode}
                                            format={getSelectedBarcodeTypeName().includes("EAN") ? "EAN13" : "CODE128"}
                                            width={1.5}
                                            height={50}
                                            fontSize={14}
                                        />
                                    </div>
                                )}
                            </TabsContent>

                            {/* Scan Tab */}
                            <TabsContent value="scan" className="mt-0 flex flex-col items-center gap-3">
                                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border flex items-center justify-center">
                                    {activeTab === "scan" && (
                                        <div className="absolute inset-0">
                                            <BarcodeScannerComponent
                                                onUpdate={handleScan}
                                                width="100%"
                                                height="100%"
                                                videoConstraints={{ facingMode: "environment" }}
                                            />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                                        <div className="relative w-64 h-32 flex flex-col items-center justify-center">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />
                                            {scanSuccess && barcode && (
                                                <div className="animate-in zoom-in duration-300 bg-white/20 backdrop-blur-sm p-3 rounded-full">
                                                    <CheckCircle2 className="w-10 h-10 text-green-400 drop-shadow-lg" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-4 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                                            Center barcode inside the frame
                                        </p>
                                    </div>
                                </div>

                                {/* Hardware scanner input — focusable but visually hidden */}
                                <input
                                    ref={scannerInputRef}
                                    type="text"
                                    className="sr-only"
                                    tabIndex={-1}
                                    aria-label="Hardware barcode scanner input"
                                    value={scanBuffer}
                                    onChange={(e) => setScanBuffer(e.target.value)}
                                    onKeyDown={handleHardwareKeyDown}
                                    onBlur={() => {
                                        // Re-focus if still on scan tab (keeps scanner ready)
                                        if (activeTab === "scan" && !scanSuccess) {
                                            setTimeout(() => scannerInputRef.current?.focus(), 50);
                                        }
                                    }}
                                />

                                <div className="w-full flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <ScanLine className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Scanned:</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono text-sm font-bold ${barcode ? "text-green-600" : "text-muted-foreground"}`}>
                                            {barcode || "Waiting..."}
                                        </span>
                                        {barcode && (
                                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                                                setBarcode("");
                                                setScanSuccess(false);
                                            }}>
                                                <RefreshCcw className="mr-1 h-3 w-3" /> Rescan
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {barcode && (
                                    <div className="w-full flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 min-h-[80px] animate-in fade-in zoom-in duration-300">
                                        <Barcode
                                            value={barcode}
                                            format={getSelectedBarcodeTypeName().includes("EAN") ? "EAN13" : "CODE128"}
                                            width={1.5}
                                            height={50}
                                            fontSize={14}
                                        />
                                    </div>
                                )}
                            </TabsContent>

                            {/* Generate Tab */}
                            <TabsContent value="generate" className="mt-0 space-y-3">
                                <Button onClick={onGenerate} className="w-full" size="sm">
                                    <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Generate {getSelectedBarcodeTypeName()}
                                </Button>
                                <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 min-h-[80px]">
                                    {barcode ? (
                                        <Barcode
                                            value={barcode}
                                            format={getSelectedBarcodeTypeName().includes("EAN") ? "EAN13" : "CODE128"}
                                            width={1.5}
                                            height={50}
                                            fontSize={14}
                                        />
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            Click Generate to create a code
                                        </span>
                                    )}
                                </div>
                                <Input value={barcode} readOnly className="bg-muted font-mono text-sm" />
                            </TabsContent>
                        </CardContent>
                    </Card>
                </Tabs>

                <Separator />

                {/* Logistics Section */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Scale className="h-4 w-4" /> Logistics Data
                    </h4>

                    {/* Weight (always visible) */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Weight <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="0.00"
                                type="number"
                                value={dimensions.weight}
                                onChange={(e) => setDimensions((prev) => ({ ...prev, weight: e.target.value }))}
                            />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Unit</Label>
                            <Select
                                value={dimensions.weightUnit || undefined}
                                onValueChange={(v) => setDimensions((prev) => ({ ...prev, weightUnit: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {weightUnits.filter((u) => u?.id).map((u) => (
                                        <SelectItem key={String(u.id)} value={String(u.id)}>
                                            {u.code || u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* CBM Toggle + Fields */}
                    <Card className="border-dashed">
                        <CardContent className="p-3 space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="dims"
                                    checked={recordDimensions}
                                    onCheckedChange={(c) => setRecordDimensions(!!c)}
                                />
                                <Label htmlFor="dims" className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
                                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                                    Record Dimensions (CBM)
                                </Label>
                            </div>

                            {recordDimensions && (
                                <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {(["length", "width", "height"] as const).map((field) => (
                                        <div key={field} className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground capitalize">{field}</Label>
                                            <Input
                                                placeholder="0"
                                                type="number"
                                                value={dimensions[field]}
                                                onChange={(e) => setDimensions((prev) => ({ ...prev, [field]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Unit</Label>
                                        <Select
                                            value={dimensions.unit || undefined}
                                            onValueChange={(v) => setDimensions((prev) => ({ ...prev, unit: v }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {cbmUnits.filter((u) => u?.id).map((u) => (
                                                    <SelectItem key={String(u.id)} value={String(u.id)}>
                                                        {u.code || u.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ScrollArea>
    );
}
