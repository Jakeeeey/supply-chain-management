import React from "react";
import { Search, Loader2, CheckCircle2, Box, PlusCircle } from "lucide-react";
import { useReceivingProductsManual, ReceivingPODetail, ReceivingPOItem } from "../../providers/ReceivingProductsManualProvider";
import { useKeyboardScanner } from "../../hooks/useKeyboardScanner";
import { AddExtraProductModal } from "../AddExtraProductModal";

interface ScanBarcodeStepProps {
    poDetail: ReceivingPODetail;
    onContinue: () => void;
}

export default function ScanBarcodeStep({ poDetail, onContinue }: ScanBarcodeStepProps) {
    const { verifyBarcode, verifiedBarcodes, scanError } = useReceivingProductsManual();
    const [inputValue, setInputValue] = React.useState("");
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const checkBarcode = async (code: string) => {
        if (!code) return;
        setIsVerifying(true);
        try {
            await verifyBarcode(code);
        } finally {
            setIsVerifying(false);
            setInputValue("");
            if (inputRef.current) inputRef.current.focus();
        }
    };

    useKeyboardScanner({
        enabled: !isVerifying,
        onScan: (code: string) => {
            checkBarcode(code);
        },
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            checkBarcode(inputValue);
        }
    };

    const allocs = Array.isArray(poDetail.allocations) ? poDetail.allocations : [];
    const allItemsInPO: ReceivingPOItem[] = allocs.flatMap((a) => a.items);

    // Include all items (Box + extra)
    const eligibleItems = allItemsInPO.filter((it) => {
        if (it.isExtra) return true;
        return true; // Manual mode: all items are eligible
    });

    const verifiedItems = eligibleItems.filter((it: ReceivingPOItem) => verifiedBarcodes.includes(it.productId));

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex-1 w-full md:w-auto space-y-1">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Box className="w-5 h-5 text-indigo-500" />
                        Verify Products via Barcode
                    </h3>
                    <p className="text-sm text-slate-500 max-w-xl">
                        Scan or enter the product barcode to activate it for manual receiving. Only verified products will appear in the quantity entry step.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-sm sticky top-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">
                            Product Barcode
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                                placeholder="Scan barcode..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isVerifying}
                                autoFocus
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            {isVerifying && (
                                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
                            )}
                        </div>

                        {scanError && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm text-red-600 font-medium">{scanError}</p>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-slate-100">
                             <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-500 font-medium">Items in PO</span>
                                <span className="text-indigo-600 font-semibold">{eligibleItems.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-medium">Verified</span>
                                <span className="text-emerald-600 font-semibold">{verifiedItems.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white border flex flex-col border-slate-200/60 shadow-sm rounded-2xl overflow-hidden min-h-[400px]">
                         <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                            <h4 className="font-semibold text-slate-800 text-sm">Product List</h4>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add Product
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {eligibleItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 ring-1 ring-slate-100">
                                        <Search className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-600">No products found</p>
                                    <p className="text-sm mt-1 max-w-sm text-center">
                                        No products match the criteria in this PO. 
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {eligibleItems.map((item) => {
                                        const isVerified = verifiedBarcodes.includes(item.productId);
                                        return (
                                            <div key={item.productId} className={`flex items-center p-4 transition-colors ${isVerified ? "bg-emerald-50/30" : "hover:bg-slate-50/50"}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ring-1 ${isVerified ? "bg-emerald-50 text-emerald-600 ring-emerald-100/50" : "bg-slate-50 text-slate-400 ring-slate-200"}`}>
                                                    {isVerified ? <CheckCircle2 className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className={`font-medium truncate ${isVerified ? "text-slate-800" : "text-slate-600"}`}>{item.name}</h5>
                                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                                        <span className={`font-mono px-2 py-0.5 rounded-md border ${isVerified ? "text-slate-600 bg-slate-100/80 border-slate-200" : "text-slate-400 bg-slate-50 border-slate-100"}`}>
                                                            {item.barcode || item.productId}
                                                        </span>
                                                        <span className={isVerified ? "text-slate-600" : "text-slate-400"}>
                                                            Expected: {item.expectedQty}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!isVerified && (
                                                    <div className="text-xs font-semibold text-slate-400 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
                                                        Pending Scan
                                                    </div>
                                                )}
                                                {isVerified && (
                                                    <div className="text-xs font-bold text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                                                        Verified
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                            <button
                                onClick={onContinue}
                                disabled={verifiedItems.length === 0}
                                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                Continue to Quantity Entry
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AddExtraProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
}
