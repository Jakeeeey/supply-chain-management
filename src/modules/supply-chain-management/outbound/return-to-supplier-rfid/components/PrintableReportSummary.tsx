"use client";

import React from "react";
import type { ReturnToSupplier } from "../types/rts.schema";

interface Props {
  data: ReturnToSupplier[];
  filters: {
    dateRange: string;
    supplier?: string;
    branch?: string;
    status: string;
    customStart?: string;
    customEnd?: string;
  };
}

export const PrintableReportSummary = React.forwardRef<HTMLDivElement, Props>(
  ({ data, filters }, ref) => {
    // Totals
    const totalGross = data.reduce(
      (sum, item) => sum + (item.grossAmount || 0),
      0,
    );
    const totalDisc = data.reduce(
      (sum, item) => sum + (item.discountAmount || 0),
      0,
    );
    const totalNet = data.reduce(
      (sum, item) => sum + (item.totalAmount || 0),
      0,
    );

    // ✅ HELPER: Strict 2 decimal formatting
    const formatCurrency = (amount: number) => {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // ✅ HELPER: Format display date for filter header
    const formatDisplayDate = (
      range: string,
      start?: string,
      end?: string,
    ) => {
      const now = new Date();
      if (range === "today") {
        return now.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      if (range === "tomorrow") {
        const tmrw = new Date(now);
        tmrw.setDate(tmrw.getDate() + 1);
        return tmrw.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      if (range === "thisWeek") {
        const d1 = new Date(now);
        const first = new Date(d1.setDate(d1.getDate() - d1.getDay()));
        const d2 = new Date(now);
        const last = new Date(d2.setDate(d2.getDate() - d2.getDay() + 6));
        return `${first.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })} - ${last.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
      }
      if (range === "thisMonth") {
        return now.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });
      }
      if (range === "thisYear") {
        return now.getFullYear().toString();
      }
      if (range === "custom" && start && end) {
        return `${new Date(start).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} - ${new Date(end).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
      }
      return "All Time";
    };

    return (
      <div
        ref={ref}
        className="font-sans text-black bg-white w-full h-full mx-auto p-8"
        style={{ width: "297mm", height: "210mm" }}
      >
        <style type="text/css" media="print">
          {`@page { size: landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; }`}
        </style>

        <div className="mb-6">
          <h1 className="text-2xl font-bold uppercase">
            Return to Supplier Summary Report
          </h1>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p>Generated: {new Date().toLocaleString()}</p>
            <p>
              Filters:{" "}
              <span className="font-medium">
                {formatDisplayDate(
                  filters.dateRange,
                  filters.customStart,
                  filters.customEnd,
                )}
              </span>{" "}
              | Supplier:{" "}
              <span className="font-medium">{filters.supplier}</span> | Branch:{" "}
              <span className="font-medium">{filters.branch}</span> | Status:{" "}
              <span className="font-medium">{filters.status}</span>
            </p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-y">
              <th className="py-2 px-2 font-bold uppercase">Return No</th>
              <th className="py-2 px-2 font-bold uppercase">Date</th>
              <th className="py-2 px-2 font-bold uppercase">Supplier</th>
              <th className="py-2 px-2 font-bold uppercase">Branch</th>
              <th className="py-2 px-2 font-bold uppercase text-right">Gross</th>
              <th className="py-2 px-2 font-bold uppercase text-right">Disc</th>
              <th className="py-2 px-2 font-bold uppercase text-right">Net</th>
              <th className="py-2 px-2 font-bold uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground italic"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-1.5 px-2 font-mono text-primary">
                    {item.returnNo}
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground">
                    {new Date(item.returnDate).toLocaleDateString()}
                  </td>
                  <td className="py-1.5 px-2 font-medium truncate max-w-[150px]">
                    {item.supplier}
                  </td>
                  <td className="py-1.5 px-2 truncate max-w-[150px]">
                    {item.branch}
                  </td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground">
                    {formatCurrency(item.grossAmount)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-destructive">
                    {item.discountAmount > 0
                      ? `(${formatCurrency(item.discountAmount)})`
                      : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-foreground">
                    {formatCurrency(item.totalAmount)}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === "Posted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground bg-muted/30">
              <td
                colSpan={4}
                className="py-2 px-2 text-right font-bold uppercase"
              >
                Grand Total
              </td>
              <td className="py-2 px-2 text-right font-bold">
                {formatCurrency(totalGross)}
              </td>
              <td className="py-2 px-2 text-right font-bold text-destructive">
                ({formatCurrency(totalDisc)})
              </td>
              <td className="py-2 px-2 text-right font-extrabold text-sm">
                {formatCurrency(totalNet)}
              </td>
              <td className="py-2 px-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  },
);
PrintableReportSummary.displayName = "PrintableReportSummary";
