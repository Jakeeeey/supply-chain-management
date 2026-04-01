//src/modules/supply-chain-management/traceability-compliance/product-tracing/components/PhysicalInventorySummary.tsx
"use client";

import * as React from "react";
import { ProductMovementRow } from "../types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PackageSearch as PHIcon } from "lucide-react";

interface PHRow {
    docNo: string;
    units: Record<string, number>;
    totalBase: number;
    ts: string;
}

interface Props {
    movements: ProductMovementRow[];
    baseUnitName: string;
    baseUnitDivisor: number;
}

export const PhysicalInventorySummary: React.FC<Props> = ({ movements, baseUnitName, baseUnitDivisor }) => {
    // 1. Filter for Physical Inventory records (Check prefix PH or docType)
    const phMovements = movements.filter(m => 
        m.docNo.toUpperCase().startsWith("PH") || 
        m.docType?.toUpperCase() === "PHYSICAL INVENTORY"
    );

    if (phMovements.length === 0) return null;

    // 2. Group by docNo and pivot by unit
    const grouped = phMovements.reduce((acc, m) => {
        if (!acc[m.docNo]) {
            acc[m.docNo] = {
                docNo: m.docNo,
                units: {},
                totalBase: 0,
                ts: m.ts
            };
        }
        
        const unit = m.unit || "Base";
        const qty = (m.inBase || 0) / (m.unitCount || 1);
        acc[m.docNo].units[unit] = (acc[m.docNo].units[unit] || 0) + qty;
        acc[m.docNo].totalBase += (m.inBase || 0);
        
        return acc;
    }, {} as Record<string, PHRow>);

    const rows = Object.values(grouped).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    const allUnits = Array.from(new Set(phMovements.map(m => m.unit || "Base"))).sort();

    return (
        <Card className="rounded-[2rem] border shadow-sm bg-background border-border/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CardContent className="p-8">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <PHIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Physical Inventory List</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border/40">
                                <th className="pb-4 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">PH</th>
                                {allUnits.map(unit => (
                                    <th key={unit} className="pb-4 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-right">{unit}</th>
                                ))}
                                <th className="pb-4 text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] text-right">Run.Inv ({baseUnitName})</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {rows.map((row) => (
                                <tr key={row.docNo} className="group hover:bg-muted/5 transition-colors">
                                    <td className="py-4">
                                        <span className="text-sm font-black text-foreground uppercase tracking-tight">{row.docNo}</span>
                                    </td>
                                    {allUnits.map(unit => (
                                        <td key={unit} className="py-4 text-right">
                                            <span className="text-sm font-bold text-foreground/80 tabular-nums">
                                                {row.units[unit] ? row.units[unit].toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="py-4 text-right">
                                        <span className="text-sm font-black text-primary tabular-nums">
                                            {(row.totalBase / baseUnitDivisor).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
