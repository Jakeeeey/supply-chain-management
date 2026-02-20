"use client";

import * as React from "react";
import type { PendingInvoiceRow } from "../types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "../utils/money";

function StatusBadge({ status }: { status: PendingInvoiceRow["pending_status"] }) {
  const map: Record<string, string> = {
    Unlinked: "bg-slate-100 text-slate-600 border-slate-200",
    "For Dispatch": "bg-blue-50 text-blue-700 border-blue-200",
    Inbound: "bg-orange-50 text-orange-700 border-orange-200",
    Cleared: "bg-green-50 text-green-700 border-green-200",
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
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-[140px] text-xs font-bold text-slate-500 uppercase">INVOICE NO</TableHead>
            <TableHead className="w-[130px] text-xs font-bold text-slate-500 uppercase">INVOICE DATE</TableHead>
            <TableHead className="text-xs font-bold text-slate-500 uppercase">CUSTOMER</TableHead>
            <TableHead className="w-[200px] text-xs font-bold text-slate-500 uppercase">SALESMAN</TableHead>
            <TableHead className="w-[140px] text-center text-xs font-bold text-slate-500 uppercase">NET AMOUNT</TableHead>
            <TableHead className="w-[180px] text-center text-xs font-bold text-slate-500 uppercase">DISPATCH PLAN</TableHead>
            <TableHead className="w-[120px] text-xs font-bold text-slate-500 uppercase">STATUS</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((r, index) => {
            const isHidden = hiddenIndices.has(index);
            const rowSpan = spanMap.get(index);
            const groupTotal = sumMap.get(index);

            return (
              <TableRow key={r.id} className="hover:bg-slate-50/80">
                <TableCell>
                  <button
                    onClick={() => onOpenInvoice(r.invoice_no)}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
                  >
                    {r.invoice_no}
                  </button>
                </TableCell>

                <TableCell className="text-sm text-slate-600">{r.invoice_date ?? "-"}</TableCell>

                <TableCell className="text-sm text-slate-700 font-medium truncate max-w-[250px]" title={r.customer ?? ""}>
                  {r.customer ?? "-"}
                </TableCell>

                <TableCell className="text-sm text-slate-600 truncate max-w-[180px]" title={r.salesman ?? ""}>
                  {r.salesman ?? "-"}
                </TableCell>

                <TableCell className="text-center text-sm font-medium text-slate-900">{money(r.net_amount)}</TableCell>

                {!isHidden && (
                  <TableCell
                    rowSpan={rowSpan}
                    className={`text-xs text-slate-500 align-middle text-center ${
                      rowSpan && rowSpan > 1 ? "bg-white/50 border-b border-l border-r border-slate-100" : ""
                    }`}
                    style={{ verticalAlign: "middle" }}
                  >
                    {r.dispatch_plan && r.dispatch_plan !== "unlinked" ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-700">{r.dispatch_plan}</span>
                        {groupTotal !== undefined && <span className="text-[11px] text-slate-500">{money(groupTotal)}</span>}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
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
