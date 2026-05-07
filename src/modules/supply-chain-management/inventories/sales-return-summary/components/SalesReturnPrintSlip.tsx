import React from "react";
import { SummaryReturnHeader } from "../type";

interface Props {
  data: SummaryReturnHeader | null;
}

export const SalesReturnPrintSlip = React.forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    if (!data) return null;

    // Generate current print date & time
    const printTime = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    return (
      <div ref={ref} className="p-8 max-w-[1000px] mx-auto bg-white text-black font-sans flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Sales Return Slip</h1>
          <p className="text-sm text-gray-500 mt-1">Official Return Document</p>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm mb-6">
          <div className="space-y-1">
            <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span className="font-bold text-gray-600">Return No:</span>
              <span className="font-mono font-bold">{data.returnNumber}</span>
            </div>
            {/* 🟢 ADDED: Invoice Reference */}
            <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span className="font-bold text-gray-600">Invoice Ref:</span>
              <span className="font-mono font-bold">{data.invoiceNo || "-"}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span className="font-bold text-gray-600">Return Date:</span>
              <span>{data.returnDate ? data.returnDate.toString().split('T')[0] : "-"}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span className="font-bold text-gray-600">Status:</span>
              <span className="uppercase">{data.returnStatus}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span className="font-bold text-gray-600">Customer:</span>
              <span>{data.customerName}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span className="font-bold text-gray-600">Remarks:</span>
              <span>{data.remarks}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span className="font-bold text-gray-600">Salesman:</span>
              <span>{data.salesmanName}</span>
            </div>
          </div>
        </div>

        {/* Items Table - ALL COLUMNS INCLUDED */}
        <div className="mb-6 border border-gray-300 rounded overflow-hidden">
          <table className="w-full text-[10px] table-fixed">
            <thead className="bg-gray-100 border-b border-gray-300 text-gray-700">
              <tr>
                <th className="py-2 px-1 text-left font-bold w-[8%]">Code</th>
                <th className="py-2 px-1 text-left font-bold w-[20%]">Product</th>
                <th className="py-2 px-1 text-left font-bold w-[8%]">Brand</th>
                <th className="py-2 px-1 text-left font-bold w-[12%]">Supplier</th>
                <th className="py-2 px-1 text-left font-bold w-[10%]">Return Type</th>
                <th className="py-2 px-1 text-left font-bold w-[8%]">Reason</th>
                <th className="py-2 px-1 text-center font-bold w-[5%]">Qty</th>
                <th className="py-2 px-1 text-right font-bold w-[8%]">Price</th>
                <th className="py-2 px-1 text-right font-bold w-[8%]">Gross</th>
                <th className="py-2 px-1 text-right font-bold w-[6%]">Disc.</th>
                <th className="py-2 px-1 text-right font-bold w-[9%]">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items?.map((item, i) => (
                <tr key={i}>
                  <td className="py-1 px-1 font-mono truncate">{item.productCode}</td>
                  <td className="py-1 px-1 truncate" title={item.productName}>{item.productName}</td>
                  <td className="py-1 px-1 truncate">{item.brandName || "-"}</td>
                  <td className="py-1 px-1 truncate">{item.supplierName || "-"}</td>
                  <td className="py-1 px-1 truncate">{item.returnCategory || "-"}</td>
                  <td className="py-1 px-1 italic text-gray-500 truncate">{item.specificReason || "-"}</td>
                  <td className="py-1 px-1 text-center">{Number(item.quantity).toLocaleString()}</td>
                  <td className="py-1 px-1 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="py-1 px-1 text-right text-gray-500">{Number(item.grossAmount).toFixed(2)}</td>
                  <td className="py-1 px-1 text-right text-gray-500">{Number(item.discountAmount).toFixed(2)}</td>
                  <td className="py-1 px-1 text-right font-bold">{Number(item.netAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-1/3 space-y-1 text-sm">
             <div className="flex justify-between text-gray-500">
               <span>Total Gross:</span>
               <span>{data.items?.reduce((sum, item) => sum + (Number(item.grossAmount)||0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
             </div>
             <div className="flex justify-between text-gray-500 border-b border-gray-200 pb-1">
               <span>Total Discount:</span>
               <span>{data.items?.reduce((sum, item) => sum + (Number(item.discountAmount)||0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
             </div>
            <div className="flex justify-between items-center text-lg font-bold bg-gray-100 p-2 border border-gray-300 rounded mt-2">
              <span>NET TOTAL:</span>
              <span>{Number(data.netTotal).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-10 text-xs text-center text-gray-500 font-medium uppercase tracking-wide mt-auto">
          <div className="space-y-2">
            <div className="border-b border-black h-8"></div>
            <div>Prepared By</div>
          </div>
          <div className="space-y-2">
            <div className="border-b border-black h-8"></div>
            <div>Checked By</div>
          </div>
          <div className="space-y-2">
            <div className="border-b border-black h-8"></div>
            <div>Received By</div>
          </div>
        </div>

        {/* Footer: Print Timestamp */}
        <div className="mt-8 pt-2 border-t border-gray-200 flex justify-between text-[10px] text-gray-400">
            <span>System Generated Slip</span>
            <span>Printed: {printTime}</span>
        </div>

      </div>
    );
  }
);

SalesReturnPrintSlip.displayName = "SalesReturnPrintSlip";