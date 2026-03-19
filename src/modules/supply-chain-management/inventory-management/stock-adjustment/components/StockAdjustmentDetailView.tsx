"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  Printer,
  Calendar,
  User,
  MapPin,
  FileText,
  BadgeCheck,
  Package,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Clock,
  UserCheck
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useStockAdjustmentForm } from "../hooks/useStockAdjustmentForm";
import { StockAdjustmentDetail as DetailType } from "../types/stock-adjustment.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface StockAdjustmentDetailProps {
  id: number;
  onBack: () => void;
}

export function StockAdjustmentDetailView({ id, onBack }: StockAdjustmentDetailProps) {
  const { fetchById } = useStockAdjustmentForm();
  const [data, setData] = useState<DetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const details = await fetchById(id);
        setData(details);
      } catch (error) {
        console.error("Failed to load details:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id, fetchById]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data) return <div className="p-12 text-center font-bold">Record not found.</div>;

  const isPosted = data.isPosted === true || (typeof data.isPosted === 'object' && data.isPosted?.data?.[0] === 1);

  const generatePDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.setFontSize(18); // Reduced from 22
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text("STOCK ADJUSTMENT SLIP", pageWidth / 2, 15, { align: "center" });
    
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 12, 18, pageWidth / 2 + 12, 18);

    // --- Metadata Section ---
    doc.setFontSize(9); // Reduced from 10
    doc.setTextColor(100, 116, 139); // slate-500
    
    // Left Column
    doc.setFont("helvetica", "bold");
    doc.text("Document No:", 20, 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(data.doc_no || "-", 50, 30);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Date Created:", 20, 36);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(data.created_at ? format(new Date(data.created_at), "yyyy-MM-dd h:mm a") : "-", 50, 36);

    // Right Column
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Branch:", 110, 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const branchName = typeof data.branch_id === 'object' ? data.branch_id?.branch_name : data.branch_id || "Main Warehouse";
    doc.text(String(branchName).toUpperCase(), 145, 30);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Adjustment Type:", 110, 36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(data.type === 'IN' ? 22 : 185, data.type === 'IN' ? 101 : 28, data.type === 'IN' ? 52 : 28);
    doc.text(data.type || "-", 145, 36);

    // --- Product Table ---
    const tableRows = data.items?.map((item, index) => {
      const product = (item.product_id as any) || {};
      return [
        index + 1,
        `${product.product_name || "Unknown"}\n(${product.product_code || "N/A"})`,
        item.brand_name || "N/A",
        item.category_name || "N/A",
        item.unit_name || product.unit_name || "pcs",
        item.quantity || 0
      ];
    }) || [];

    autoTable(doc, {
      startY: 45, // Moved up
      head: [["#", "Product Information", "Brand", "Category", "Unit", "Qty"]],
      body: tableRows,
      headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 75 },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' }
      },
      theme: 'grid',
      styles: { cellPadding: 1.5 } // Tightened padding
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // --- Totals & Remarks Section ---
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Total Adjusted Amount", pageWidth - 20, finalY, { align: 'right' });
    
    // Remarks on the left
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("REMARKS:", 20, finalY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(30, 41, 59);
    const remarks = data.remarks || "N/A";
    const splitRemarks = doc.splitTextToSize(remarks.toUpperCase(), 100);
    doc.text(splitRemarks, 20, finalY + 5);

    doc.setFontSize(14); // Reduced from 16
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    const formattedAmount = Math.abs(data.amount || 0).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    doc.text(formattedAmount, pageWidth - 20, finalY + 7, { align: 'right' });

    // --- Signatures Section ---
    const pageHeight = doc.internal.pageSize.getHeight();
    let sigY = finalY + 25; // Tightened space to signatures

    // Check if signatures will fit on the current page
    if (sigY + 20 > pageHeight) {
      doc.addPage();
      sigY = 30; // Reset to top of new page
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont("helvetica", "normal");
    
    // Set thin line style
    doc.setLineWidth(0.2);
    doc.setDrawColor(148, 163, 184); // slate-400
    
    // Prepared By
    doc.text("PREPARED BY:", 20, sigY);
    doc.line(20, sigY + 12, 70, sigY + 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    const createdBy = typeof data.created_by === 'object' ? `${data.created_by?.user_fname} ${data.created_by?.user_lname}` : data.created_by || "System";
    doc.text(createdBy, 20, sigY + 10);

    // Approved By
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("APPROVED BY:", pageWidth / 2 - 25, sigY);
    doc.line(pageWidth / 2 - 25, sigY + 12, pageWidth / 2 + 25, sigY + 12);

    // Received By
    doc.text("RECEIVED BY:", pageWidth - 70, sigY);
    doc.line(pageWidth - 70, sigY + 12, pageWidth - 20, sigY + 12);

    // --- Save the PDF ---
    doc.save(`StockAdjustment_${data.doc_no}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full overflow-y-auto bg-slate-50/30 min-h-screen relative">
      {/* No longer using browser print styles as we switched to jsPDF */}
      <div className="print:hidden flex flex-col gap-6">
        {/* Module Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Stock Adjustment Module</h2>
              <p className="text-xs text-slate-500 font-medium">Inventory Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={generatePDF}
              className="gap-2 h-10 border-slate-200 bg-white shadow-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 mb-4 print:mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-white shadow-sm border border-slate-100 h-10 w-10 print:hidden"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.doc_no}</h1>
              <Badge variant="outline" className={data.type === 'IN' ? 'bg-green-50 text-green-700 border-green-200 font-bold' : 'bg-red-50 text-red-700 border-red-200 font-bold'}>
                Stock {data.type === 'IN' ? 'In' : 'Out'}
              </Badge>
              {isPosted && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-bold">
                  <BadgeCheck className="h-3 w-3" />
                  Posted
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">View detailed stock adjustment information</p>
          </div>
        </div>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
              <div className="absolute right-[-20px] top-[-20px] opacity-10">
                {data.type === 'IN' ? <ArrowUpCircle className="h-48 w-48" /> : <ArrowDownCircle className="h-48 w-48" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                <div className="space-y-1">
                  <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-widest">Branch Location</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <MapPin className="h-4 w-4 text-blue-200" />
                    {typeof data.branch_id === 'object' ? data.branch_id?.branch_name : data.branch_id || "Main Warehouse"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-widest">Date Created</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <Calendar className="h-4 w-4 text-blue-200" />
                    {data.created_at ? format(new Date(data.created_at), "MMM d, yyyy") : "-"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-widest">Created By</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <User className="h-4 w-4 text-blue-200" />
                    {typeof data.created_by === 'object' ? `${data.created_by?.user_fname} ${data.created_by?.user_lname}` : data.created_by || "System"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-blue-100/70 text-[10px] uppercase font-bold tracking-widest">Total Amount</p>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    ₱{data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <h3 className="font-bold">Remarks & Notes</h3>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 min-h-[60px]">
                  {data.remarks || "No additional remarks provided."}
                </div>
              </div>

              <div className={`grid gap-4 ${isPosted ? "grid-cols-2" : "grid-cols-2"}`}>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status</p>
                  <p className="font-bold text-slate-700">{isPosted ? "Posted (Finalized)" : "Draft (Pending Posting)"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Items Count</p>
                  <p className="font-bold text-slate-700">{data.items?.length || 0} Products</p>
                </div>
                {isPosted && (
                  <>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <p className="text-[10px] uppercase font-bold text-blue-400">Posted At</p>
                      </div>
                      <p className="font-bold text-blue-700">
                        {data.postedAt ? format(new Date(data.postedAt), "MMM d, yyyy, hh:mm a") : "-"}
                      </p>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3 text-blue-500" />
                        <p className="text-[10px] uppercase font-bold text-blue-400">Posted By</p>
                      </div>
                      <p className="font-bold text-blue-700">
                        {(() => {
                          const postedBy = data.posted_by;
                          return typeof postedBy === 'object' ? `${postedBy?.user_fname} ${postedBy?.user_lname}` : postedBy || "System User";
                        })()}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Line Items */}
      <div className="space-y-4 print:hidden">
        <h3 className="text-lg font-bold text-slate-800">Product Line Items</h3>

        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="w-12 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">#</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Information</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Unit</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Adj. Qty</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cost/Unit</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Price</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">New Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items?.map((item, idx) => {
                const product = (item.product_id as any) || {};
                const qty = item.quantity || 0;
                const cost = item.cost_per_unit || product.price_per_unit || 0;
                const total = qty * cost;
                const current = item.current_stock || 0;
                const newStock = data.type === 'IN' ? current + qty : current - qty;

                return (
                  <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{product.product_name || "Unknown Product"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-medium tracking-wider">{product.product_code || "N/A"}</span>
                          <span className="text-[10px] text-blue-500 font-bold uppercase">{item.brand_name || "N/A"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-600">{item.unit_name || product.unit_name || "pcs"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold px-2 py-1 rounded-md ${data.type === 'IN' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {data.type === 'OUT' ? `-${qty}` : `+${qty}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-600">₱{cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-slate-900">
                        {newStock}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col items-end gap-3">
            <div className="flex items-center gap-12 w-full max-w-md justify-between">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Total Quantity:</span>
              <span className={`font-bold text-lg ${data.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                {data.type === 'OUT' ? '-' : '+'}{data.items?.reduce((acc, item) => acc + (item.quantity || 0), 0)} units
              </span>
            </div>
            <div className="h-px bg-slate-200 w-full max-w-md" />
            <div className="flex items-center gap-12 w-full max-w-md justify-between">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Total Adjusted Amount:</span>
              <span className="text-2xl font-bold text-blue-700">₱{data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
