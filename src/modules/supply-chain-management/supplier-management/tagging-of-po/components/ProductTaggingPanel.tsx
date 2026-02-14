"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import type { TaggingPODetail, TaggingPOItem } from "../types";
import {
    ArrowLeft,
    BadgeCheck,
    BadgeX,
    ScanLine,
    Radio,
    Camera,
} from "lucide-react";

// ✅ webcam barcode scanner (camera)
// docs: default export is BarcodeScannerComponent
const BarcodeScannerComponent = dynamic(() => import("react-qr-barcode-scanner"), {
    ssr: false,
}) as any;

function sumExpected(po: TaggingPODetail) {
    return po.items.reduce((a, b) => a + (Number(b.expectedQty) || 0), 0);
}
function sumTagged(po: TaggingPODetail) {
    return po.items.reduce((a, b) => a + (Number(b.taggedQty) || 0), 0);
}
function pct(a: number, b: number) {
    if (!b) return 0;
    return Math.max(0, Math.min(100, Math.round((a / b) * 100)));
}

export default function ProductTaggingPanel(props: {
    po: TaggingPODetail | null;
    loading: boolean;
    onBack: () => void;
    onChange: (next: TaggingPODetail) => void;
    onTagItem: (sku: string, rfid: string, strict: boolean) => Promise<TaggingPODetail>;
}) {
    const po = props.po;

    const [strict, setStrict] = React.useState(true);
    const [sku, setSku] = React.useState("");
    const [rfid, setRfid] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    const skuRef = React.useRef<HTMLInputElement | null>(null);
    const rfidRef = React.useRef<HTMLInputElement | null>(null);

    // ✅ camera scanner dialog state
    const [scannerOpen, setScannerOpen] = React.useState(false);
    const [stopStream, setStopStream] = React.useState(false);

    React.useEffect(() => {
        setSku("");
        setRfid("");
        setSaving(false);
        setStrict(true);

        // reset scanner when switching PO
        setScannerOpen(false);
        setStopStream(false);
    }, [po?.id]);

    const matched: TaggingPOItem | null = React.useMemo(() => {
        if (!po) return null;
        const s = sku.trim().toLowerCase();
        if (!s) return null;
        return po.items.find((x) => x.sku.toLowerCase() === s) ?? null;
    }, [po, sku]);

    const skuRejected = React.useMemo(() => {
        const s = sku.trim();
        if (!s) return false;
        if (!strict) return false;
        return !matched;
    }, [sku, strict, matched]);

    const canTag = Boolean(matched && rfid.trim() && !saving && !(strict && skuRejected));

    const totalExpected = po ? sumExpected(po) : 0;
    const totalTagged = po ? sumTagged(po) : 0;

    async function tagNow() {
        if (!po) return;
        if (!canTag) return;

        try {
            setSaving(true);
            const updated = await props.onTagItem(sku.trim(), rfid.trim(), strict);
            props.onChange(updated);

            // keep SKU (scanner usually repeats SKU), clear RFID
            setRfid("");
            rfidRef.current?.focus();
        } finally {
            setSaving(false);
        }
    }

    function openScanner() {
        setStopStream(false);
        setScannerOpen(true);
    }

    function closeScanner() {
        setStopStream(true);
        setTimeout(() => setScannerOpen(false), 0);
    }

    function applyScannedSku(scanned: string) {
        const next = String(scanned ?? "").trim();
        if (!next) return;

        setSku(next);
        closeScanner();
        setTimeout(() => rfidRef.current?.focus(), 50);
    }

    return (
        <div className="w-full min-w-0 space-y-4">
            <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" className="h-9 px-2" onClick={props.onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-0">
                    <div className="text-2xl font-black leading-tight text-foreground">
                        Product Tagging
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                        PO: {po?.poNumber ?? "—"} • {po?.supplierName ?? "—"}
                    </div>
                </div>
            </div>

            {props.loading || !po ? (
                <div className="rounded-xl border border-border bg-background p-8 text-sm text-muted-foreground">
                    Loading PO tagging details...
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 min-w-0">
                    {/* LEFT */}
                    <div className="min-w-0 space-y-4">
                        {/* ✅ DARK SCAN PANEL (fixed for light mode using arbitrary colors) */}
                        <div
                            className={cn(
                                "rounded-2xl border border-border shadow-sm overflow-hidden",
                                "bg-[linear-gradient(180deg,#0b1220_0%,#070a14_100%)] text-[#F8FAFC]"
                            )}
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="text-xs font-black uppercase tracking-widest text-[rgba(248,250,252,0.82)]">
                                            1. Scan Barcode (SKU)
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-[rgba(255,255,255,0.10)] text-[#F8FAFC] border border-[rgba(255,255,255,0.12)] text-[11px] font-black"
                                        >
                                            Strict Validation Active
                                        </Badge>

                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="h-8 rounded-xl bg-[rgba(255,255,255,0.10)] text-[#F8FAFC] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.14)]"
                                            onClick={openScanner}
                                        >
                                            <Camera className="h-4 w-4 mr-2" />
                                            Scan
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                                    {/* SKU */}
                                    <div className="space-y-2">
                                        <Input
                                            ref={skuRef}
                                            value={sku}
                                            onChange={(e) => setSku(e.target.value)}
                                            placeholder="Scan SKU..."
                                            className={cn(
                                                "h-12 rounded-xl",
                                                "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.12)] text-[#F8FAFC]",
                                                "placeholder:text-[rgba(248,250,252,0.45)] focus-visible:ring-[rgba(248,250,252,0.22)]",
                                                skuRejected ? "border-destructive/70 ring-2 ring-destructive/30" : ""
                                            )}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    rfidRef.current?.focus();
                                                }
                                            }}
                                        />

                                        {!sku.trim() ? (
                                            <div className="text-xs italic text-[rgba(248,250,252,0.55)]">
                                                Waiting for scan...
                                            </div>
                                        ) : null}

                                        {skuRejected ? (
                                            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                                                <BadgeX className="h-5 w-5 shrink-0" />
                                                <div>
                                                    <div className="font-black">
                                                        REJECTED: SKU '{sku.trim()}' is NOT listed in this PO.
                                                    </div>
                                                    <div className="text-xs mt-1 opacity-90">
                                                        Please scan a valid SKU.
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* RFID */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-black uppercase tracking-widest text-[rgba(248,250,252,0.82)]">
                                                2. Scan RFID Tag
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Switch checked={strict} onCheckedChange={setStrict} id="strict" />
                                                <Label htmlFor="strict" className="text-xs font-bold text-[rgba(248,250,252,0.78)]">
                                                    Strict
                                                </Label>
                                            </div>
                                        </div>

                                        <Input
                                            ref={rfidRef}
                                            value={rfid}
                                            onChange={(e) => setRfid(e.target.value)}
                                            placeholder="Scan RFID..."
                                            className={cn(
                                                "h-12 rounded-xl",
                                                "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.12)] text-[#F8FAFC]",
                                                "placeholder:text-[rgba(248,250,252,0.45)] focus-visible:ring-[rgba(248,250,252,0.22)]"
                                            )}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    if (canTag) tagNow();
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* TAG BUTTON */}
                                    <div className="pt-7">
                                        <Button
                                            type="button"
                                            className="h-12 rounded-xl font-black w-full lg:w-[160px]"
                                            disabled={!canTag}
                                            onClick={tagNow}
                                        >
                                            <ScanLine className="h-4 w-4 mr-2" />
                                            {saving ? "Tagging..." : "Tag Item"}
                                        </Button>
                                    </div>
                                </div>

                                {/* MATCHED PRODUCT BOX */}
                                {matched ? (
                                    <div className="mt-4 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-[rgba(248,250,252,0.70)]">
                                                Matched Product
                                            </div>
                                            <div className="text-lg font-black mt-1">{matched.name}</div>
                                            <div className="text-xs text-[rgba(248,250,252,0.60)] mt-1">
                                                SKU: {matched.sku}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-black uppercase tracking-widest text-[rgba(248,250,252,0.70)]">
                                                Progress
                                            </div>
                                            <div className="text-2xl font-black mt-1">
                                                {matched.taggedQty}{" "}
                                                <span className="text-[rgba(248,250,252,0.55)]">/</span>{" "}
                                                {matched.expectedQty}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* RECENT ACTIVITY LOG */}
                        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                                <div className="text-base font-black text-foreground">Recent Activity Log</div>
                                <Badge variant="secondary" className="text-[11px] font-black">
                                    {po.activity.length}{" "}
                                    {po.activity.length === 1 ? "entry" : "entries"}
                                </Badge>
                            </div>

                            <div className="p-4">
                                {po.activity.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                        No activity yet. Scan a SKU and RFID to begin tagging.
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[160px]">SKU</TableHead>
                                                    <TableHead>Product Name</TableHead>
                                                    <TableHead className="w-[180px]">RFID Code</TableHead>
                                                    <TableHead className="w-[120px] text-right">Time</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {po.activity.map((a) => (
                                                    <TableRow key={a.id}>
                                                        <TableCell className="font-mono text-xs">{a.sku}</TableCell>
                                                        <TableCell className="font-bold">{a.productName}</TableCell>
                                                        <TableCell className="font-mono text-xs text-primary">{a.rfid}</TableCell>
                                                        <TableCell className="text-right text-xs text-muted-foreground">{a.time}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="min-w-0 space-y-4">
                        {/* TAGGING PROGRESS */}
                        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-border bg-muted/30">
                                <div className="text-base font-black text-foreground">Tagging Progress</div>
                            </div>

                            <div className="p-5 space-y-4">
                                {po.items.map((it) => {
                                    const p = pct(it.taggedQty, it.expectedQty);
                                    return (
                                        <div key={it.id} className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-sm font-bold truncate text-foreground">{it.name}</div>
                                                <div className="text-xs text-muted-foreground font-medium shrink-0">
                                                    {it.taggedQty}/{it.expectedQty}
                                                </div>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${p}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">Total Tagged</div>
                                    <div className="text-lg font-black text-foreground">
                                        {totalTagged} <span className="text-muted-foreground">/</span> {totalExpected}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {totalTagged >= totalExpected ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                            <BadgeCheck className="h-4 w-4 mr-1" />
                                            Completed
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-primary/15 text-primary border border-primary/20">
                                            <Radio className="h-4 w-4 mr-1" />
                                            Tagging
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* VALID SKUS CHEATSHEET */}
                        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-border bg-muted/30">
                                <div className="text-sm font-black uppercase tracking-wide text-foreground">
                                    Valid SKUs (Cheatsheet)
                                </div>
                            </div>

                            <div className="p-4 space-y-2">
                                {po.items.map((it) => (
                                    <div
                                        key={it.id}
                                        className="rounded-xl border border-border bg-background px-3 py-2 flex items-center justify-between gap-3"
                                    >
                                        <div className="font-mono text-xs font-bold text-foreground">{it.sku}</div>
                                        <div className="text-xs text-muted-foreground truncate text-right">{it.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Camera Scanner Dialog (shadcn) */}
            <Dialog
                open={scannerOpen}
                onOpenChange={(o) => {
                    if (o) openScanner();
                    else closeScanner();
                }}
            >
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>Scan SKU Barcode</DialogTitle>
                        <DialogDescription>
                            Point the camera at the SKU barcode. This will fill the SKU field automatically.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl border border-border overflow-hidden bg-black">
                        <div className="p-2">
                            <div className="text-xs text-muted-foreground mb-2">
                                Camera must be allowed. Works on https or localhost.
                            </div>

                            <div className="w-full">
                                <BarcodeScannerComponent
                                    width="100%"
                                    height={380}
                                    facingMode="environment"
                                    stopStream={stopStream}
                                    onUpdate={(err: any, result: any) => {
                                        if (result?.text) applyScannedSku(result.text);
                                    }}
                                    onError={(error: any) => {
                                        console.error("Barcode scanner error:", error);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={closeScanner}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
