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
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  UserCheck,
  Tag,
  Image as ImageIcon
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useStockAdjustmentForm } from "../hooks/useStockAdjustmentForm";
import {
  StockAdjustmentDetail as DetailType,
  StockAdjustmentProduct
} from "../types/stock-adjustment.schema";
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
import { isPostedStatus } from "../utils/status-utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StockAdjustmentDetailProps {
  id: number;
  onBack: () => void;
  mode?: "creation" | "posting";
  isModal?: boolean;
}

export function StockAdjustmentDetailView({ id, onBack, mode = "creation", isModal = false }: StockAdjustmentDetailProps) {
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

  const isPosted = isPostedStatus(data.isPosted);

  const generatePDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // enterprise-blue
    doc.text("STOCK ADJUSTMENT SLIP", pageWidth / 2, 15, { align: "center" });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 12, 18, pageWidth / 2 + 12, 18);

    // --- Metadata Section ---
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    // Left Column
    doc.setFont("helvetica", "bold");
    doc.text("Document No:", 20, 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
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
    const adjTypeFull = data.type === 'IN' ? 'Stock In' : data.type === 'OUT' ? 'Stock Out' : (data.type || "-");
    doc.text(adjTypeFull, 145, 36);

    // --- Product Table ---
    const tableRows = data.items?.map((item) => {
      const product = (item.product_id as unknown as StockAdjustmentProduct) || {};
      const unitPrice = item.cost_per_unit || product.price_per_unit || 0;
      const totalAmount = (item.quantity || 0) * unitPrice;
      
      return [
        item.brand_name || "N/A",
        `${product.product_name || "Unknown"}\n(${product.product_code || "N/A"})`,
        item.quantity || 0,
        `PHP ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    }) || [];

    autoTable(doc, {
      startY: 45,
      head: [["Brand", "Product Name", "Qty", "Unit Price", "Total Amount"]],
      body: tableRows,
      headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      columnStyles: {
        0: { halign: 'left', cellWidth: 35 },
        1: { cellWidth: 60 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
      },
      theme: 'grid',
      styles: { cellPadding: 1.5 }
    });

    const finalY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100) + 8;

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

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    const formattedAmount = Math.abs(data.amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    doc.text(formattedAmount, pageWidth - 20, finalY + 7, { align: 'right' });

    // --- Signatures Section ---
    const pageHeight = doc.internal.pageSize.getHeight();
    let sigY = finalY + 25;

    if (sigY + 20 > pageHeight) {
      doc.addPage();
      sigY = 30;
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    
    doc.setLineWidth(0.2);
    doc.setDrawColor(148, 163, 184);
    
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

    doc.save(`StockAdjustment_${data.doc_no}.pdf`);
  };

  return (
    <div className={`flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full relative ${isModal ? "bg-transparent min-h-0" : "bg-background min-h-screen overflow-y-auto"}`}>
      <div className="print:hidden flex flex-col gap-6">
        {/* Module Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-sm">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">
                {mode === "posting" ? "Stock Adjustment Posting" : "Stock Adjustment Module"}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">Inventory Management System</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 print:hidden ${isModal ? "mr-10" : ""}`}>
            <Button
              variant="outline"
              onClick={generatePDF}
              className="gap-2 h-10 border-border bg-background shadow-sm font-bold text-muted-foreground hover:bg-muted rounded-lg transition-all"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-muted shadow-sm border border-border h-10 w-10 print:hidden transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.doc_no}</h1>
              <Badge variant="outline" className={data.type === 'IN' ? 'bg-success-bg text-success border-success/20 font-bold uppercase' : 'bg-destructive/10 text-destructive border-destructive/20 font-bold uppercase'}>
                Stock {data.type === 'IN' ? 'In' : 'Out'}
              </Badge>
              {isPosted && (
                <Badge variant="outline" className="bg-info-bg text-info border-info/20 flex items-center gap-1 font-bold uppercase">
                  <BadgeCheck className="h-3 w-3" />
                  Posted
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">View detailed stock adjustment information</p>
          </div>
        </div>

        <Card className="border-none shadow-sm bg-card overflow-hidden rounded-xl border border-border/40">
          <CardContent className="p-0">
            {/* Vibrant Hero Section */}
            <div className="bg-primary p-8 text-white relative overflow-hidden transition-colors duration-300">
              <div className="absolute right-[-20px] top-[-20px] opacity-10">
                {data.type === 'IN' ? <ArrowUpCircle className="h-48 w-48" /> : <ArrowDownCircle className="h-48 w-48" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                <div className="space-y-1">
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Branch Location</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <MapPin className="h-4 w-4 text-white/80" />
                    {typeof data.branch_id === 'object' ? data.branch_id?.branch_name : data.branch_id || "Main Warehouse"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Date Created</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <Calendar className="h-4 w-4 text-white/80" />
                    {data.created_at ? format(new Date(data.created_at), "MMM d, yyyy") : "-"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Created By</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <User className="h-4 w-4 text-white/80" />
                    {(() => {
                      const createdBy = data.created_by;
                      if (typeof createdBy === 'object' && createdBy !== null) {
                        const fname = createdBy.user_fname || "";
                        const lname = createdBy.user_lname || "";
                        const fullName = `${fname} ${lname}`.trim();
                        return fullName || "System User";
                      }
                      return createdBy || "System User";
                    })()}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Total Amount</p>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    ₱{data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-foreground mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-bold">Remarks & Notes</h3>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground min-h-[60px]">
                    {data.remarks || "No additional remarks provided."}
                  </div>
                </div>

                {data.stock_adjustment_attachment && data.stock_adjustment_attachment.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <div className="flex items-center gap-2 text-foreground">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <h3 className="font-bold">Attachments ({data.stock_adjustment_attachment.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data.stock_adjustment_attachment.map((att, idx) => {
                        const file = att.attachment;
                        if (!file) return null;
                        const fileId = typeof file === 'object' ? file.id : file;
                        const isImage = typeof file === 'object' && file.type?.startsWith('image');
                        const filename = typeof file === 'object' ? file.filename_download : `Attachment ${idx + 1}`;
                        const sizeInMb = typeof file === 'object' && file.filesize 
                          ? (Number(file.filesize) / (1024 * 1024)).toFixed(2)
                          : null;

                        const directusBase = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
                        const cleanBase = directusBase.trim().replace(/\/$/, "");
                        const fileUrl = `${cleanBase}/assets/${fileId}`;

                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-xl shadow-xs hover:bg-muted/20 transition-colors">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-none p-0 focus:outline-none"
                              title="Click to view file in new tab"
                            >
                              <div className="h-9 w-9 shrink-0 bg-primary/5 rounded-lg flex items-center justify-center text-primary">
                                {isImage ? <ImageIcon className="h-4.5 w-4.5" /> : <FileText className="h-4.5 w-4.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate text-foreground hover:text-primary transition-colors">{filename}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {sizeInMb && (
                                    <span className="text-[9px] text-muted-foreground font-semibold">
                                      {sizeInMb} MB
                                    </span>
                                  )}
                                  <span className="text-[9px] text-primary font-bold uppercase tracking-wider">
                                    View File
                                  </span>
                                </div>
                              </div>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-1">Status</p>
                  <p className="font-bold text-foreground/80">{isPosted ? "Posted (Finalized)" : "Draft (Pending Posting)"}</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-1">Items Count</p>
                  <p className="font-bold text-foreground/80">{data.items?.length || 0} Products</p>
                </div>
                {isPosted && (
                  <>
                    <div className="bg-primary/5 dark:bg-blue-900/10 p-4 rounded-xl border border-primary/20 dark:border-blue-800/20 flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary" />
                        <p className="text-[10px] uppercase font-bold text-primary/70">Posted At</p>
                      </div>
                      <p className="font-bold text-primary/95">
                        {data.postedAt ? format(new Date(data.postedAt), "MMM d, yyyy, hh:mm a") : "-"}
                      </p>
                    </div>
                    <div className="bg-primary/5 dark:bg-blue-900/10 p-4 rounded-xl border border-primary/20 dark:border-blue-800/20 flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3 text-primary" />
                        <p className="text-[10px] uppercase font-bold text-primary/70">Posted By</p>
                      </div>
                      <p className="font-bold text-primary/95">
                        {(() => {
                          const postedBy = data.posted_by;
                          if (typeof postedBy === 'object' && postedBy !== null) {
                            const fname = postedBy.user_fname || "";
                            const lname = postedBy.user_lname || "";
                            const fullName = `${fname} ${lname}`.trim();
                            return fullName || "System User";
                          }
                          return postedBy || "System User";
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

      {/* Product Line Items with Expected Stock & RFID Arrays */}
      <div className="space-y-4 print:hidden">
        <h3 className="text-lg font-bold text-foreground">Product Line Items</h3>

        <div className="rounded-xl border border-border overflow-hidden shadow-sm bg-card">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">#</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Information</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Unit</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Adj. Qty</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Cost/Unit</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Total Price</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">New Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items?.map((item, idx) => {
                const product = (item.product_id as unknown as StockAdjustmentProduct) || {};
                const qty = item.quantity || 0;
                const cost = item.cost_per_unit || product.price_per_unit || 0;
                const total = qty * cost;
                const current = item.current_stock || 0;
                
                // Color-coded Delta quantities
                const isIncoming = data.type === 'IN';
                const newStock = isIncoming ? current + qty : current - qty;

                return (
                  <TableRow key={item.id} className="border-border hover:bg-muted/35 transition-colors duration-150">
                    <TableCell className="text-center text-muted-foreground/50 font-bold">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 py-1">
                        <span className="font-bold text-foreground leading-tight">{product.product_name || "Unknown Product"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">{product.product_code || "N/A"}</span>
                          <span className="text-[10px] text-primary font-bold uppercase">{item.brand_name || "N/A"}</span>
                        </div>
                        {/* Serial Pill Arrays: RFID Tags */}
                        {item.rfid_tags && item.rfid_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 animate-in fade-in duration-300">
                            {item.rfid_tags.map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30 font-mono text-[9px] py-0.5 px-2 flex items-center gap-1 rounded-md shadow-sm"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-muted-foreground/80">{item.unit_name || product.unit_name || "pcs"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-black px-2.5 py-1 rounded-full text-xs ${isIncoming ? 'bg-success-bg text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {isIncoming ? `+${qty}` : `-${qty}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">₱{cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    {/* Live New Stock Preview */}
                    <TableCell className="text-center">
                      <span className="font-bold text-foreground">
                        {newStock}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="p-8 bg-muted/30 border-t border-border flex flex-col items-end gap-3">
            <div className="flex items-center gap-12 w-full max-w-md justify-between">
              <span className="text-muted-foreground font-bold uppercase tracking-wider text-[11px]">Total Quantity:</span>
              <span className={`font-black text-lg ${data.type === 'IN' ? 'text-success' : 'text-destructive'}`}>
                {data.type === 'OUT' ? '-' : '+'}{data.items?.reduce((acc, item) => acc + (item.quantity || 0), 0)} units
              </span>
            </div>
            <div className="h-px bg-border w-full max-w-md" />
            <div className="flex items-center gap-12 w-full max-w-md justify-between">
              <span className="text-muted-foreground font-bold uppercase tracking-wider text-[11px]">Total Adjusted Amount:</span>
              <span className="text-2xl font-bold text-primary">
                ₱{data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
