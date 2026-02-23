"use client";

import * as React from "react";
import type { PendingInvoiceRow } from "../types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "../utils/money";

function StatusBadge({ status }: { status: PendingInvoiceRow["pending_status"] }) {
  const map: Record<string, string> = {
    Unlinked: "bg-muted text-muted-foreground border-border",
    "For Dispatch": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Inbound: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    Cleared: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };
  return (
    <Badge variant="outline" className={`font-normal ${map[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

export function PendingInvoicesTable({
  rows,
  onOpenInvoice,
}: {
  rows: PendingInvoiceRow[];
  onOpenInvoice: (invoiceNo: string) => void;
}) {
  const { spanMap, hiddenIndices, sumMap } = React.useMemo(() => {
    const spanMap = new Map<number, number>();
    const sumMap = new Map<number, number>();
    const hiddenIndices = new Set<number>();

    for (let i = 0; i < rows.length; i++) {
      if (hiddenIndices.has(i)) continue;

      const currentPlan = rows[i].dispatch_plan;

      if (!currentPlan || currentPlan === "unlinked") {
        spanMap.set(i, 1);
        continue;
      }

      let span = 1;
      let totalAmount = rows[i].net_amount || 0;

      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].dispatch_plan === currentPlan) {
          span++;
          totalAmount += rows[j].net_amount || 0;
          hiddenIndices.add(j);
        } else break;
      }

      spanMap.set(i, span);
      sumMap.set(i, totalAmount);
    }

    return { spanMap, hiddenIndices, sumMap };
  }, [rows]);

  return (
    <div className="rounded-md border bg-card text-card-foreground dark:border-white/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[140px] text-xs font-bold text-muted-foreground uppercase">INVOICE NO</TableHead>
            <TableHead className="w-[130px] text-xs font-bold text-muted-foreground uppercase">INVOICE DATE</TableHead>
            <TableHead className="text-xs font-bold text-muted-foreground uppercase">CUSTOMER</TableHead>
            <TableHead className="w-[200px] text-xs font-bold text-muted-foreground uppercase">SALESMAN</TableHead>
            <TableHead className="w-[140px] text-center text-xs font-bold text-muted-foreground uppercase">NET AMOUNT</TableHead>
            <TableHead className="w-[180px] text-center text-xs font-bold text-muted-foreground uppercase">DISPATCH PLAN</TableHead>
            <TableHead className="w-[120px] text-xs font-bold text-muted-foreground uppercase">STATUS</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((r, index) => {
            const isHidden = hiddenIndices.has(index);
            const rowSpan = spanMap.get(index);
            const groupTotal = sumMap.get(index);

            return (
              <TableRow key={r.id} className="hover:bg-muted/50">
                <TableCell>
                  <button
                    onClick={() => onOpenInvoice(r.invoice_no)}
                    className="text-primary hover:underline font-medium text-sm text-left"
                  >
                    {r.invoice_no}
                  </button>
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">{r.invoice_date ?? "-"}</TableCell>

                <TableCell className="text-sm font-medium truncate max-w-[250px]" title={r.customer ?? ""}>
                  {r.customer ?? "-"}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]" title={r.salesman ?? ""}>
                  {r.salesman ?? "-"}
                </TableCell>

                <TableCell className="text-center text-sm font-medium">{money(r.net_amount)}</TableCell>

                {!isHidden && (
                  <TableCell
                    rowSpan={rowSpan}
                    className={`text-xs text-muted-foreground align-middle text-center ${rowSpan && rowSpan > 1 ? "bg-muted/30 border-b border-l border-r" : ""
                      }`}
                    style={{ verticalAlign: "middle" }}
                  >
                    {r.dispatch_plan && r.dispatch_plan !== "unlinked" ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">{r.dispatch_plan}</span>
                        {groupTotal !== undefined && <span className="text-[11px] text-muted-foreground">{money(groupTotal)}</span>}
                      </div>
                    ) : (
                      <span className="text-muted/50">—</span>
                    )}
                  </TableCell>
                )}

                <TableCell>
                  <StatusBadge status={r.pending_status} />
                </TableCell>
              </TableRow>
            );
          })}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                No invoices found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
