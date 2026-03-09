"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import { cn } from "@/lib/utils";
import type { TaggingPODetail, TaggingPOItem } from "../types";
import { ArrowLeft, BadgeCheck, BadgeX, ScanLine, Radio } from "lucide-react";

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

    const [sku, setSku] = React.useState("");
    const [rfid, setRfid] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    const skuRef = React.useRef<HTMLInputElement | null>(null);
    const rfidRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        setSku("");
        setRfid("");
        setSaving(false);
    }, [po?.id]);

    const matched: TaggingPOItem | null = React.useMemo(() => {
        if (!po) return null;
        const s = sku.trim().toLowerCase();
        if (!s) return null;
        return po.items.find((x) => x.sku.toLowerCase() === s) ?? null;
    }, [po, sku]);

    // ✅ Strict toggle removed: still show clear feedback if SKU is not part of PO
    const skuRejected = React.useMemo(() => {
        const s = sku.trim();
        if (!s) return false;
        return !matched;
    }, [sku, matched]);

    // ✅ Tagging requires matched SKU + scanned RFID
    const canTag = Boolean(matched && rfid.trim() && !saving);

    const totalExpected = po ? sumExpected(po) : 0;
    const totalTagged = po ? sumTagged(po) : 0;

    async function tagNow() {
        if (!po) return;
        if (!canTag) return;

        try {
            setSaving(true);

            // ✅ Strict UI removed, but keep strict enforcement ON internally (safer; prevents duplicates/over-tagging)
            const updated = await props.onTagItem(sku.trim(), rfid.trim(), true);

            props.onChange(updated);

            // keep SKU (scanner usually repeats SKU), clear RFID
            setRfid("");
            rfidRef.current?.focus();
        } finally {
            setSaving(false);
        }
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
                        {/* ✅ RESPONSIVE SCAN PANEL */}
                        <div
                            className={cn(
                                "rounded-2xl border border-border shadow-sm overflow-hidden",
                                "bg-card text-card-foreground"
                            )}
                        >
                            <div className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                            1. Scan Barcode (SKU)
                                        </div>
                                    </div>

                                    {/* Right-side actions intentionally removed */}
                                    <div />
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
                                                "h-12 rounded-xl bg-background border-border",
                                                "placeholder:text-muted-foreground/60 focus-visible:ring-primary/20",
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
                                            <div className="text-xs italic text-muted-foreground/80">
                                                Waiting for scan...
                                            </div>
                                        ) : null}

                                        {skuRejected ? (
                                            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                                                <BadgeX className="h-5 w-5 shrink-0" />
                                                <div>
                                                    <div className="font-black">
                                                        REJECTED: SKU &apos;{sku.trim()}&apos; is NOT listed in this PO.
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
                                            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                                2. Scan RFID Tag
                                            </div>
                                            {/* ✅ Strict toggle removed */}
                                            <div />
                                        </div>

                                        <Input
                                            ref={rfidRef}
                                            value={rfid}
                                            onChange={(e) => {
                                                const val = e.target.value.substring(0, 24);
                                                setRfid(val);
                                            }}
                                            placeholder="Scan RFID..."
                                            maxLength={24}
                                            className={cn(
                                                "h-12 rounded-xl bg-background border-border",
                                                "placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
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
                                    <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                                Matched Product
                                            </div>
                                            <div className="text-lg font-black mt-1 text-foreground">{matched.name}</div>
                                            <div className="text-xs text-muted-foreground/80 mt-1">
                                                SKU: {matched.sku}
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                                Progress
                                            </div>
                                            <div className="text-2xl font-black mt-1 text-foreground">
                                                {matched.taggedQty}{" "}
                                                <span className="text-muted-foreground/60">/</span>{" "}
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
        </div>
    );
}
