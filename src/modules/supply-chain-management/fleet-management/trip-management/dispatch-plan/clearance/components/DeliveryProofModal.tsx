'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, MapPin, Calendar, Clock, User, FileText, CheckCircle2, Download } from 'lucide-react';
import { DeliveryProof } from '../types';

interface DeliveryProofModalProps {
    isOpen: boolean;
    onClose: () => void;
    proof: DeliveryProof | null;
    invoiceNo?: string;
    orderNo?: string;
    customerName?: string;
}

export const DeliveryProofModal: React.FC<DeliveryProofModalProps> = ({
    isOpen,
    onClose,
    proof,
    invoiceNo,
    orderNo,
    customerName,
}) => {
    const [zoom, setZoom] = useState<number>(1);

    if (!proof) return null;

    const directusBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
    const photoUrl = proof.photoFileId ? `${directusBase}/assets/${proof.photoFileId}` : null;

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setZoom(1);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setZoom(1);
            onClose();
        }
    };

    const handleDownload = async () => {
        if (!photoUrl) return;
        try {
            const response = await fetch(photoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Delivery_Proof_${invoiceNo || proof.id}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            // Fallback direct link download
            const fallbackLink = document.createElement('a');
            fallbackLink.href = `${photoUrl}?download=true`;
            fallbackLink.download = `Delivery_Proof_${invoiceNo || proof.id}.jpg`;
            fallbackLink.target = '_blank';
            document.body.appendChild(fallbackLink);
            fallbackLink.click();
            document.body.removeChild(fallbackLink);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[850px] w-[95vw] max-h-[92vh] p-0 flex flex-col overflow-hidden bg-background border-border rounded-2xl shadow-2xl [&>button]:hidden">
                <DialogHeader className="p-4 md:p-5 bg-card border-b border-border flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                Proof of Delivery
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Invoice: <span className="font-semibold text-foreground">{invoiceNo || 'N/A'}</span>
                                {orderNo && <span> • Order: <span className="font-semibold text-foreground">{orderNo}</span></span>}
                                {customerName && <span> • Customer: <span className="font-semibold text-foreground">{customerName}</span></span>}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                    {/* Controls Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border border-border">
                        <span className="text-xs font-semibold text-muted-foreground pl-1">
                            Delivery Photo
                        </span>

                        <div className="flex items-center gap-2">
                            {/* Download Button */}
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5 border-border hover:bg-muted"
                                onClick={handleDownload}
                                disabled={!photoUrl}
                                title="Download Photo"
                            >
                                <Download className="w-3.5 h-3.5 text-primary" />
                                <span>Download</span>
                            </Button>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-lg border border-border">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={handleZoomOut}
                                    disabled={zoom <= 0.5}
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <span className="text-xs font-mono font-medium px-1 min-w-[48px] text-center">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={handleZoomIn}
                                    disabled={zoom >= 3}
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={handleResetZoom}
                                    disabled={zoom === 1}
                                    title="Reset Zoom"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Image Viewer Frame */}
                    <div className="relative w-full h-[360px] md:h-[420px] bg-muted/20 border border-border rounded-xl overflow-hidden flex items-center justify-center p-2">
                        {photoUrl ? (
                            <div className="w-full h-full overflow-auto flex items-center justify-center custom-scrollbar">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photoUrl}
                                    alt="Proof of delivery photo"
                                    className="max-w-none transition-transform duration-150 ease-out object-contain select-none shadow-md rounded-lg"
                                    style={{
                                        transform: `scale(${zoom})`,
                                        transformOrigin: 'center center',
                                        maxHeight: zoom <= 1 ? '100%' : 'none',
                                        maxWidth: zoom <= 1 ? '100%' : 'none',
                                    }}
                                    draggable={false}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                <ImageIcon className="w-10 h-10 stroke-1" />
                                <p className="text-sm">No image available.</p>
                            </div>
                        )}
                    </div>

                    {/* Proof Details Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                        {proof.recipientName && (
                            <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
                                <User className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recipient</p>
                                    <p className="text-xs font-bold text-foreground truncate">{proof.recipientName}</p>
                                </div>
                            </div>
                        )}

                        {proof.outcome && (
                            <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Outcome</p>
                                    <p className="text-xs font-bold text-foreground truncate">{proof.outcome}</p>
                                </div>
                            </div>
                        )}

                        {proof.capturedAt && (
                            <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
                                <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Captured At</p>
                                    <p className="text-xs font-bold text-foreground truncate">
                                        {new Date(proof.capturedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {proof.receivedAt && (
                            <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
                                <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Received At</p>
                                    <p className="text-xs font-bold text-foreground truncate">
                                        {new Date(proof.receivedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {(proof.latitude !== null && proof.latitude !== undefined && proof.longitude !== null && proof.longitude !== undefined) && (
                            <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
                                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Coordinates</p>
                                    <p className="text-xs font-mono font-bold text-foreground truncate">
                                        {proof.latitude}, {proof.longitude}
                                    </p>
                                </div>
                            </div>
                        )}

                        {proof.remarks && (
                            <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg border border-border sm:col-span-2 md:col-span-3">
                                <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Proof Remarks</p>
                                    <p className="text-xs text-foreground">{proof.remarks}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-3 md:p-4 bg-card border-t border-border flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
