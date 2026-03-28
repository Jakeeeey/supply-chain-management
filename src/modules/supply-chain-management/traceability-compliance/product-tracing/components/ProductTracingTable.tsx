//src/modules/supply-chain-management/traceability-compliance/product-tracing/components/ProductTracingTable.tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductMovementRow } from "../types";

import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ListIcon, EyeIcon } from "lucide-react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
    data: ProductMovementRow[];
    isLoading?: boolean;
};

export const ProductTracingTable = React.forwardRef<HTMLDivElement, Props>(({ data, isLoading, className, ...props }, ref) => {
    const [selectedDocNo, setSelectedDocNo] = React.useState<string | null>(null);

    // Calculate balances then group
    const groupedRows = React.useMemo(() => {
        let currentBaseBalance = 0;
        
        // Pass 1: Add individual balances
        const enriched = data.map(row => {
            currentBaseBalance += ((row.inBase || 0) - (row.outBase || 0));
            const divisor = row.unitCount && row.unitCount > 0 ? row.unitCount : 1;
            return { 
                ...row, 
                displayIn: (row.inBase || 0) / divisor,
                displayOut: (row.outBase || 0) / divisor,
                displayBase: (row.inBase || row.outBase || 0),
                displayBalance: currentBaseBalance 
            };
        });

        // Pass 2: Group by docNo
        const groups: Array<{
            main: typeof enriched[0];
            items: typeof enriched;
            isGroup: boolean;
        }> = [];

        enriched.forEach(row => {
            const lastGroup = groups.length > 0 ? groups[groups.length - 1] : null;
            
            // If it's a new docNo, create a group
            if (!lastGroup || lastGroup.main.docNo !== row.docNo) {
                groups.push({
                    main: { ...row },
                    items: [row],
                    isGroup: false
                });
            } else {
                // Same docNo, add to existing group
                lastGroup.items.push(row);
                lastGroup.isGroup = true;
                
                // Aggregate In/Out
                lastGroup.main.inBase = (lastGroup.main.inBase || 0) + (row.inBase || 0);
                lastGroup.main.outBase = (lastGroup.main.outBase || 0) + (row.outBase || 0);
                lastGroup.main.displayIn = (lastGroup.main.displayIn || 0) + (row.displayIn || 0);
                lastGroup.main.displayOut = (lastGroup.main.displayOut || 0) + (row.displayOut || 0);
                lastGroup.main.displayBase = (lastGroup.main.displayBase || 0) + (row.displayBase || 0);
                
                // Balance should be row's balance (the last item in sequence)
                lastGroup.main.displayBalance = row.displayBalance;
            }
        });

        return groups;
    }, [data]);

    const selectedGroup = React.useMemo(() => {
        if (!selectedDocNo) return null;
        return groupedRows.find(g => g.main.docNo === selectedDocNo);
    }, [selectedDocNo, groupedRows]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-16 w-full animate-pulse bg-muted/40 rounded-2xl border border-muted" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground border-2 border-dashed rounded-[2.5rem] bg-muted/5">
                <p className="text-xl font-bold text-foreground/80 mb-1">No Trace records</p>
                <p className="text-sm font-medium opacity-60 max-w-xs mx-auto">Try adjusting your filters or selecting a different date range.</p>
            </div>
        );
    }

    return (
        <Card ref={ref} className={cn("rounded-[2rem] border shadow-sm overflow-hidden bg-background/50 backdrop-blur-sm", className)} {...props}>
            <Table>
                <TableHeader className="bg-muted/40 border-b">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[150px] h-12 text-[10px] font-bold uppercase tracking-widest pl-6">TS / Reference</TableHead>
                        <TableHead className="h-12 text-[10px] font-bold uppercase tracking-widest text-center">Type</TableHead>
                        <TableHead className="max-w-[200px] h-12 text-[10px] font-bold uppercase tracking-widest underline decoration-dotted underline-offset-4">Description (Click to view)</TableHead>
                        <TableHead className="h-12 text-[10px] font-bold uppercase tracking-widest">UOM</TableHead>
                        <TableHead className="text-right h-12 text-[10px] font-bold uppercase tracking-widest">In</TableHead>
                        <TableHead className="text-right h-12 text-[10px] font-bold uppercase tracking-widest">Out</TableHead>
                        <TableHead className="text-right h-12 text-[10px] font-bold uppercase tracking-widest">Base (Pcs)</TableHead>
                        <TableHead className="text-right h-12 text-[10px] font-bold uppercase tracking-widest font-bold pr-6">Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groupedRows.map(({ main: row, items, isGroup }, index) => (
                        <TableRow 
                            key={`${row.docNo}-${index}`} 
                            className={cn(
                                "group transition-colors border-muted/50",
                                isGroup ? "hover:bg-primary/5 cursor-pointer" : "hover:bg-muted/30"
                            )}
                            onClick={() => isGroup && setSelectedDocNo(row.docNo)}
                        >
                            <TableCell className="py-4 pl-6">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase">{format(new Date(row.ts), "MMM dd, HH:mm")}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-sm font-bold tracking-tight">{row.docNo}</span>
                                        {isGroup && <ListIcon className="h-3 w-3 text-primary opacity-50" />}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="outline" className={cn(
                                    "font-bold text-[9px] uppercase tracking-wider py-0.5 px-2 rounded-full",
                                    row.inBase > 0 
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" 
                                        : "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                )}>
                                    {row.docType}
                                </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground font-medium text-sm" title={row.descr || ""}>
                                <div className="flex items-center gap-2">
                                    {isGroup ? (
                                        <span className="italic text-primary/80 flex items-center gap-1 font-bold">
                                            Consolidated ({items.length} items)
                                        </span>
                                    ) : (
                                        row.descr || "—"
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                {row.unit}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold tabular-nums">
                                {row.inBase > 0 ? (row.displayIn || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-amber-600 font-bold tabular-nums">
                                {row.outBase > 0 ? (row.displayOut || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground font-medium tabular-nums px-4">
                                {(row.displayBase || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-black tabular-nums text-foreground/90 bg-muted/20 group-hover:bg-muted/40 transition-colors px-4 pr-6">
                                {(row.displayBalance || 0).toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={!!selectedDocNo} onOpenChange={(open) => !open && setSelectedDocNo(null)}>
                <DialogContent className="sm:max-w-5xl w-full rounded-[1.5rem] border shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 bg-muted/30 border-b">
                        <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <EyeIcon className="h-5 w-5 text-primary" />
                            </div>
                            Consolidated Entries
                        </DialogTitle>
                        <DialogDescription className="font-mono mt-1 text-sm bg-background/50 px-2 py-1 rounded inline-block w-fit">
                            Ref: {selectedDocNo}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-muted/20 sticky top-0 backdrop-blur z-10">
                                <TableRow>
                                    <TableHead className="text-[10px] font-bold uppercase pl-6 py-2">Line Description</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase py-2">Qty</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase py-2">UOM</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase pr-6 py-2">Base (Pcs)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedGroup?.items.map((item, i) => (
                                    <TableRow key={i} className="hover:bg-muted/50 border-muted/50">
                                        <TableCell className="text-sm font-medium py-3 pl-6">{item.descr || "—"}</TableCell>
                                        <TableCell className={cn(
                                            "text-right text-sm font-bold tabular-nums py-3",
                                            item.inBase > 0 ? "text-emerald-600" : "text-amber-600"
                                        )}>
                                            {item.inBase > 0 
                                                ? (item.displayIn || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                : (item.displayOut || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                            }
                                        </TableCell>
                                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 py-3">{item.unit}</TableCell>
                                        <TableCell className="text-right text-sm font-mono text-muted-foreground py-3 pr-6">
                                            {(item.displayBase || 0).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    
                    <div className="p-6 bg-muted/30 border-t flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Group Total Movement</span>
                            <span className="text-lg font-black tabular-nums">
                                {((selectedGroup?.main.inBase || 0) - (selectedGroup?.main.outBase || 0)).toLocaleString()} PCS
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Balance Position</span>
                            <span className="text-lg font-black tabular-nums text-primary">
                                {(selectedGroup?.main.displayBalance || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
});

ProductTracingTable.displayName = "ProductTracingTable";
