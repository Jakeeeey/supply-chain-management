"use client";

import React from "react";
import type { ReturnToSupplier } from "../types/rts.schema";

interface Props {
  data: ReturnToSupplier[];
  filters: any;
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
          <h1 className="text-2xl font-bold text-slate-900 uppercase">
            Return to Supplier Summary Report
          </h1>
          <div className="text-xs text-slate-500 mt-2 space-y-1">
            <p>Generated: {new Date().toLocaleString()}</p>
            <p>
              Filters: <span className="font-medium">{filters.dateRange}</span>{" "}
              | Supplier:{" "}
              <span className="font-medium">{filters.supplier}</span> | Branch:{" "}
              <span className="font-medium">{filters.branch}</span> | Status:{" "}
              <span className="font-medium">{filters.status}</span>
            </p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300">
              <th className="py-2 px-2 font-bold text-slate-700 uppercase">
                Return No
              </th>
              <th className="py-2 px-2 font-bold text-slate-700 uppercase">
                Date
              </th>
              <th className="py-2 px-2 font-bold text-slate-700 uppercase">
                Supplier
              </th>
              <th className="py-2 px-2 font-bold text-slate-700 uppercase">
                Branch
              </th>
              <th className="py-2 px-2 font-bold text-slate-700 uppercase text-center">
                Status
              </th>
              <th className="py-2 px-2 font-bold text-slate-700 uppercase text-right">
                Gross
              </th>
              <th className="py-2 px-2 font-bold text-slate-700 uppercase text-right">
                Disc
              </th>
              <th className="py-2 px-2 font-bold text-slate-700 uppercase text-right">
                Net
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-slate-400 italic"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-1.5 px-2 font-mono text-blue-700">
                    {item.returnNo}
                  </td>
                  <td className="py-1.5 px-2 text-slate-600">
                    {new Date(item.returnDate).toLocaleDateString()}
                  </td>
                  <td className="py-1.5 px-2 text-slate-800 font-medium truncate max-w-[150px]">
                    {item.supplier}
                  </td>
                  <td className="py-1.5 px-2 text-slate-800 truncate max-w-[150px]">
                    {item.branch}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === "Posted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  {/* ✅ FIX: Apply strict formatting */}
                  <td className="py-1.5 px-2 text-right text-slate-600">
                    {formatCurrency(item.grossAmount)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-red-500">
                    {item.discountAmount > 0
                      ? `(${formatCurrency(item.discountAmount)})`
                      : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                    {formatCurrency(item.totalAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-50">
              <td
                colSpan={5}
                className="py-2 px-2 text-right font-bold text-slate-700 uppercase"
              >
                Grand Total
              </td>
              <td className="py-2 px-2 text-right font-bold text-slate-700">
                {formatCurrency(totalGross)}
              </td>
              <td className="py-2 px-2 text-right font-bold text-red-600">
                ({formatCurrency(totalDisc)})
              </td>
              <td className="py-2 px-2 text-right font-extrabold text-slate-900 text-sm">
                {formatCurrency(totalNet)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  },
);
PrintableReportSummary.displayName = "PrintableReportSummary";
