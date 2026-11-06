"use client";

import * as React from "react";
import type { Branch, StockInTransactionHeader, StockMovement } from "../types";
import type { VehiclePart } from "../../registration/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, Inbox, Building2, Eye, Package } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { StockInDetailsDialog } from "./StockInDetailsDialog";

interface StockInTableProps {
  movements: StockMovement[];
  branches?: Branch[];
  loading: boolean;
}

export function StockInTable({ movements, branches = [], loading }: StockInTableProps) {
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [selectedTransaction, setSelectedTransaction] = React.useState<StockInTransactionHeader | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState<boolean>(false);

  const branchMap = React.useMemo(() => {
    const map = new Map<number | string, string>();
    branches.forEach((b) => {
      map.set(b.id, b.branch_name);
      map.set(String(b.id), b.branch_name);
    });
    return map;
  }, [branches]);

  // Group individual movements by reference_no (Header-Detail Structure)
  const transactions = React.useMemo<StockInTransactionHeader[]>(() => {
    const map = new Map<string, StockInTransactionHeader>();

    movements.forEach((m) => {
      const ref = (m.reference_no && m.reference_no.trim()) || `REF-${m.id}`;

      const branchObj =
        typeof m.branch_id === "object" && m.branch_id !== null
          ? (m.branch_id as Branch)
          : null;
      const branchName =
        branchObj?.branch_name ||
        (m.branch_id ? branchMap.get(m.branch_id as number) : null) ||
        "Main Branch";

      const lineTotal = Number(m.quantity || 0) * Number(m.unit_cost || 0);

      if (!map.has(ref)) {
        map.set(ref, {
          reference_no: ref,
          created_at: m.created_at,
          branch_id: m.branch_id,
          branch_name: branchName,
          total_items: 1,
          total_quantity: Number(m.quantity || 0),
          total_amount: lineTotal,
          remarks: m.remarks,
          items: [m],
        });
      } else {
        const header = map.get(ref)!;
        header.total_items += 1;
        header.total_quantity += Number(m.quantity || 0);
        header.total_amount += lineTotal;
        header.items.push(m);
        // If header remarks was empty and item has remarks, fallback to it
        if (!header.remarks && m.remarks) {
          header.remarks = m.remarks;
        }
      }
    });

    return Array.from(map.values());
  }, [movements, branchMap]);

  // Reset to page 1 whenever total records change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length]);

  const totalRows = transactions.length;
  const paginatedTransactions = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, currentPage, pageSize]);

  const handleOpenDetails = (tx: StockInTransactionHeader) => {
    setSelectedTransaction(tx);
    setDetailsOpen(true);
  };

  if (loading && movements.length === 0) {
    return (
      <div className="rounded-md border p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/60 mb-3" />
        <h3 className="text-sm font-semibold">No stock-in transactions found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click &quot;Stock In Items&quot; to record newly delivered supplies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[140px]">Reference No.</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-center">Items Received</TableHead>
              <TableHead className="text-right">Total Qty</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((tx) => {
              const dateStr = tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "—";

              return (
                <TableRow
                  key={tx.reference_no}
                  className="hover:bg-muted/40 cursor-pointer"
                  onClick={() => handleOpenDetails(tx)}
                >
                  <TableCell className="text-xs text-muted-foreground">{dateStr}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {tx.reference_no}
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tx.branch_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs font-normal gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      {tx.total_items} {tx.total_items === 1 ? "kind" : "kinds"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    <span className="text-emerald-600 font-bold">+{tx.total_quantity}</span>{" "}
                    <span className="text-xs text-muted-foreground font-normal">units</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs">
                    ₱{tx.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                    {tx.remarks || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[11px] gap-1">
                      <ArrowDownLeft className="h-3 w-3" />
                      Stock In
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenDetails(tx)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Items
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalRows > 0 && (
        <div className="py-2 border-t">
          <DataTablePagination
            pageIndex={currentPage}
            pageSize={pageSize}
            rowCount={totalRows}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      <StockInDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        transaction={selectedTransaction}
      />
    </div>
  );
}
