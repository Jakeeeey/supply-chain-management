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
  Paperclip,
  Image as ImageIcon,
  Download,
  ExternalLink
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useStockAdjustmentManualForm } from "../hooks/useStockAdjustmentManualForm";
import { 
  StockAdjustmentManualDetail as DetailType,
  StockAdjustmentManualProduct 
} from "../types/stock-adjustment-manual.schema";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface StockAdjustmentManualDetailProps {
  id: number;
  onBack: () => void;
}

export function StockAdjustmentManualDetailView({ id, onBack }: StockAdjustmentManualDetailProps) {
  const { fetchById } = useStockAdjustmentManualForm();
  const [data, setData] = useState<DetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string, type: string, filename: string } | null>(null);

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

  // Robust check for isPosted (handles boolean, number, string, or Directus Buffer)
  const isPosted = isPostedStatus(data.isPosted);

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
    const tableRows: any[] = [];
    
    const supplierName = typeof data.supplier_id === 'object' ? data.supplier_id?.supplier_name : data.supplier_id || "Unknown Supplier";
    const stNumber = data.doc_no || "-";
    
    const groupedItems: Record<string, typeof data.items> = {};
    data.items?.forEach(item => {
      const sName = typeof supplierName === 'string' ? supplierName : String(supplierName);
      if (!groupedItems[sName]) groupedItems[sName] = [];
      groupedItems[sName].push(item);
    });

    Object.entries(groupedItems).forEach(([groupSupplier, items]) => {
      // Supplier Header Row
      tableRows.push([{
        content: `${groupSupplier} - ${stNumber}`,
        colSpan: 6,
        styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' }
      }]);

      let subTotalAmount = 0;

      // Items
      items?.forEach((item, index) => {
        const product = (item.product_id as unknown as StockAdjustmentManualProduct) || {};
        const qty = item.quantity || 0;
        const cost = item.cost_per_unit || product.price_per_unit || 0;
        subTotalAmount += (qty * cost);

        tableRows.push([
          index + 1,
          `${product.product_name || "Unknown"}\n(${product.product_code || "N/A"})`,
          item.brand_name || "N/A",
          item.category_name || "N/A",
          item.unit_name || product.unit_name || "pcs",
          qty
        ]);
      });

      // Sub Total Row
      tableRows.push([{
        content: `Sub Total: ${subTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        colSpan: 6,
        styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42], fillColor: [250, 250, 250] }
      }]);
    });

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
    doc.save(`StockAdjustmentManual_${data.doc_no}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full overflow-y-auto bg-background min-h-screen relative">
      {/* No longer using browser print styles as we switched to jsPDF */}
      <div className="print:hidden flex flex-col gap-6">
        {/* Module Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-sm">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">Stock Adjustment Module</h2>
              <p className="text-xs text-muted-foreground font-medium">Inventory Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={generatePDF}
              className="gap-2 h-10 border-border bg-background shadow-sm font-bold text-muted-foreground hover:bg-muted rounded-lg"
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
            className="rounded-full hover:bg-muted shadow-sm border border-border h-10 w-10 print:hidden"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.doc_no}</h1>
              <Badge variant="outline" className={data.type === 'IN' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 font-bold' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 font-bold'}>
                Stock {data.type === 'IN' ? 'In' : 'Out'}
              </Badge>
              {isPosted && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-primary/90 dark:text-primary/70 border-blue-200 dark:border-blue-800/50 flex items-center gap-1 font-bold">
                  <BadgeCheck className="h-3 w-3" />
                  Posted
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">View detailed stock adjustment information</p>
          </div>
        </div>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-primary dark:bg-blue-700 p-8 text-white relative overflow-hidden transition-colors duration-300">
              <div className="absolute right-[-20px] top-[-20px] opacity-10">
                {data.type === 'IN' ? <ArrowUpCircle className="h-48 w-48" /> : <ArrowDownCircle className="h-48 w-48" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                <div className="space-y-1">
                  <p className="text-primary-foreground/70 text-[10px] uppercase font-bold tracking-widest">Branch Location</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <MapPin className="h-4 w-4 text-primary-foreground/90" />
                    {typeof data.branch_id === 'object' ? data.branch_id?.branch_name : data.branch_id || "Main Warehouse"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-primary-foreground/70 text-[10px] uppercase font-bold tracking-widest">Date Created</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <Calendar className="h-4 w-4 text-primary-foreground/90" />
                    {data.created_at ? format(new Date(data.created_at), "MMM d, yyyy") : "-"}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-primary-foreground/70 text-[10px] uppercase font-bold tracking-widest">Created By</p>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <User className="h-4 w-4 text-primary-foreground/90" />
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
                  <p className="text-primary-foreground/70 text-[10px] uppercase font-bold tracking-widest">Total Amount</p>
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    ₱{data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-bold">Remarks & Notes</h3>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground min-h-[60px]">
                  {data.remarks || "No additional remarks provided."}
                </div>
              </div>

              <div className={`grid gap-4 ${isPosted ? "grid-cols-2" : "grid-cols-2"}`}>
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
                    <div className="bg-primary/5 dark:bg-blue-900/10 p-4 rounded-xl border border-primary/20 dark:border-blue-800/20 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary dark:text-primary/70" />
                        <p className="text-[10px] uppercase font-bold text-primary/70 dark:text-primary/70/70">Posted At</p>
                      </div>
                      <p className="font-bold text-primary/90 dark:text-blue-300">
                        {data.postedAt ? format(new Date(data.postedAt), "MMM d, yyyy, hh:mm a") : "-"}
                      </p>
                    </div>
                    <div className="bg-primary/5 dark:bg-blue-900/10 p-4 rounded-xl border border-primary/20 dark:border-blue-800/20 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3 text-primary dark:text-primary/70" />
                        <p className="text-[10px] uppercase font-bold text-primary/70 dark:text-primary/70/70">Posted By</p>
                      </div>
                      <p className="font-bold text-primary/90 dark:text-blue-300">
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

      {/* Product Line Items */}
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
                const product = (item.product_id as unknown as StockAdjustmentManualProduct) || {};
                const qty = item.quantity || 0;
                const cost = item.cost_per_unit || product.price_per_unit || 0;
                const total = qty * cost;
                const current = item.current_stock || 0;
                const newStock = data.type === 'IN' ? current + qty : current - qty;

                return (
                  <TableRow key={item.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center text-muted-foreground/50 font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{product.product_name || "Unknown Product"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-medium tracking-wider">{product.product_code || "N/A"}</span>
                          <span className="text-[10px] text-primary font-bold uppercase">{item.brand_name || "N/A"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-muted-foreground">{item.unit_name || product.unit_name || "pcs"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold px-2 py-1 rounded-md ${data.type === 'IN' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                        {data.type === 'OUT' ? `-${qty}` : `+${qty}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">₱{cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-primary dark:text-primary/70">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
              <span className={`font-bold text-lg ${data.type === 'IN' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {data.type === 'OUT' ? '-' : '+'}{data.items?.reduce((acc, item) => acc + (item.quantity || 0), 0)} units
              </span>
            </div>
            <div className="h-px bg-border w-full max-w-md" />
            <div className="flex items-center gap-12 w-full max-w-md justify-between">
              <span className="text-muted-foreground font-bold uppercase tracking-wider text-[11px]">Total Adjusted Amount:</span>
              <span className="text-2xl font-bold text-primary/90 dark:text-primary/70">₱{data.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      {data.stock_adjustment_attachment && data.stock_adjustment_attachment.length > 0 && (
        <div className="space-y-4 print:hidden">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            Attachments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.stock_adjustment_attachment.map((att: any, index: number) => {
              const uuid = typeof att.attachment === 'object' ? att.attachment.id : att.attachment;
              const filename = typeof att.attachment === 'object' ? att.attachment.filename_download : `Attachment-${index + 1}`;
              const fileType = typeof att.attachment === 'object' ? (att.attachment.type || '') : '';
              const filenameStr = String(filename || '').toLowerCase();
              const isImage = typeof att.attachment === 'object' && (fileType.startsWith('image') || filenameStr.match(/\.(jpg|jpeg|png|gif|webp|svg)$/));
              const fileSize = typeof att.attachment === 'object' && att.attachment.filesize 
                ? `${(att.attachment.filesize / 1024 / 1024).toFixed(2)} MB` 
                : '';
              const displayType = fileType || 'Unknown type';
              const downloadUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${uuid}?download`;
              const previewUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${uuid}`;

              return (
                <div 
                  key={uuid || index} 
                  className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all group relative cursor-pointer"
                  onClick={() => setPreviewAttachment({ url: previewUrl, type: fileType, filename: filename })}
                >
                  <div className="h-12 w-12 shrink-0 bg-muted rounded-lg flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    {isImage ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <p className="text-sm font-bold truncate text-foreground/90 leading-snug group-hover:text-primary transition-colors" title={filename}>
                      {filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider flex items-center gap-2">
                      <span>{fileSize || displayType}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewAttachment({ url: previewUrl, type: displayType, filename: filename }); }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                      title="Preview file"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <a
                      href={downloadUrl}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-full sm:max-w-5xl w-11/12 h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="truncate">{previewAttachment?.filename}</DialogTitle>
            <DialogDescription>
              Attachment preview
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-muted/30 overflow-hidden flex items-center justify-center relative bg-[url('https://transparenttextures.com/patterns/cubes.png')]">
            {previewAttachment?.type?.startsWith('image') || previewAttachment?.filename?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/) ? (
              <img 
                src={previewAttachment.url} 
                alt={previewAttachment.filename} 
                className="max-w-full max-h-full object-contain drop-shadow-md"
              />
            ) : previewAttachment?.type === 'application/pdf' || previewAttachment?.filename?.toLowerCase().match(/\.pdf$/) ? (
              <iframe 
                src={previewAttachment.url} 
                className="w-full h-full border-0" 
                title={previewAttachment.filename}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground p-8">
                <FileText className="h-16 w-16 opacity-50" />
                <p className="text-center font-medium">Preview not available for this file type.</p>
                <a 
                  href={previewAttachment?.url + '?download'} 
                  className="text-primary hover:underline font-bold flex items-center gap-2 mt-4 bg-background px-4 py-2 border rounded-md shadow-sm"
                >
                  <Download className="h-4 w-4" /> Download File
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
