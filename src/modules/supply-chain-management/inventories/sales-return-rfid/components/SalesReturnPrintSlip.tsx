"use client";
import React, { forwardRef } from "react";
import { format } from "date-fns";
import { SalesReturnItem } from "../type";

// Extended interface to support the specific fields in the image
interface PrintData {
  returnNo: string;
  returnDate: string;
  createdAt?: string; // For "Received Date"
  status: string;
  remarks: string;
  salesmanName: string;
  salesmanCode: string;
  customerName: string;
  customerCode: string;
  branchName: string;
  priceType?: string; // Added to match image
  items: SalesReturnItem[];
  totalAmount: number;
}

interface SalesReturnPrintSlipProps {
  data: PrintData | null;
}

export const SalesReturnPrintSlip = forwardRef<
  HTMLDivElement,
  SalesReturnPrintSlipProps
>(({ data }, ref) => {
  if (!data) return null;

  // 1. Group items by Return Type (e.g., "Bad Order", "Good Order")
  const groupedItems = data.items.reduce(
    (acc, item) => {
      const type = item.returnType || "Others";
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    },
    {} as Record<string, SalesReturnItem[]>,
  );

  return (
    <div
      ref={ref}
      className="p-10 bg-background text-black font-sans text-sm hidden print:block"
    >
      <style type="text/css" media="print">
        {`
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; }
            .print-hidden { display: none !important; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 6px 4px; }
          `}
      </style>

      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wider mb-2">
          SALES RETURN SLIP {data.returnNo}
        </h1>
      </div>

      <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-4">
        {/* Company Info (Left) */}
        <div>
          <h2 className="font-bold text-lg">
            Men2 Marketing & Distribution Enterprise Corporation
          </h2>
          <p className="text-xs text-foreground">
            Gonzales, Bonuan Boquig, Dagupan City, Pangasinan • Phone:
            09125846321
          </p>
        </div>

        {/* Dates (Right) */}
        <div className="text-right text-xs">
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="font-semibold text-muted-foreground">Return Date:</span>
            <span className="font-bold">{data.returnDate}</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="font-semibold text-muted-foreground">Received Date:</span>
            <span className="font-bold">
              {data.createdAt || data.returnDate}
            </span>
          </div>
        </div>
      </div>

      {/* --- METADATA --- */}
      <div className="mb-6 text-sm">
        <div className="grid grid-cols-[120px_1fr] gap-1">
          <span className="font-bold">Customer:</span>
          <span className="uppercase">{data.customerName}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-1">
          <span className="font-bold">Salesman:</span>
          <span className="uppercase">{data.salesmanName}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-1">
          <span className="font-bold">Price Type:</span>
          <span className="uppercase">{data.priceType || "A"}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-1">
          <span className="font-bold">Salesman Code:</span>
          <span className="uppercase">{data.salesmanCode}</span>
        </div>
      </div>

      {/* --- DYNAMIC TABLES BY RETURN TYPE --- */}
      {Object.entries(groupedItems).map(([type, items]) => {
        const subtotal = items.reduce(
          (sum, i) => sum + Number(i.totalAmount || 0),
          0,
        );

        return (
          <div key={type} className="mb-6">
            {/* Section Header */}
            <h3 className="font-bold text-base border-b border-black mb-1">
              {type}
            </h3>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="font-bold w-[40%]">Product Name</th>
                  <th className="font-bold w-[10%]">Unit</th>
                  <th className="font-bold w-[10%] text-center">Quantity</th>
                  <th className="font-bold w-[15%] text-right">Unit Price</th>
                  <th className="font-bold w-[20%] text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="align-top">{item.description}</td>
                    <td className="align-top">{item.unit || "Pieces"}</td>
                    <td className="align-top text-center">{item.quantity}</td>
                    <td className="align-top text-right">
                      {Number(item.unitPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="align-top text-right">
                      {Number(item.totalAmount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right font-bold pt-2">
                    Subtotal:
                  </td>
                  <td className="text-right font-bold pt-2">
                    {subtotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      <hr className="border-black mb-4" />

      {/* --- FOOTER --- */}
      <div className="flex justify-between items-start">
        {/* Remarks (Left) */}
        <div className="flex-1">
          <span className="font-bold block mb-1">Remarks:</span>
          <div className="text-sm border-b border-border pb-1 min-w-[300px] max-w-[500px]">
            {data.remarks || "-"}
          </div>
        </div>

        {/* Grand Total (Right) */}
        <div className="text-right pl-4">
          <div className="text-xl font-bold flex flex-row items-baseline justify-end gap-3 whitespace-nowrap">
            <span className="shrink-0 text-muted-foreground uppercase text-xs tracking-wider">Grand Total:</span>
            <span>
              {Number(data.totalAmount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

SalesReturnPrintSlip.displayName = "SalesReturnPrintSlip";
