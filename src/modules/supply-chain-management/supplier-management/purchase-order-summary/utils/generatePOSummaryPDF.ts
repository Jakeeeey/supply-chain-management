import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PurchaseOrder, Supplier } from "../types";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { CompanyData } from "@/components/pdf-layout-design/types";
import { pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";

export const generatePOSummaryPDF = async (data: PurchaseOrder[], suppliers: Supplier[]) => {
  // --- 1. FETCH COMPANY DATA & TEMPLATE ---
  let companyData: CompanyData | null = null;
  try {
      const resp = await fetch("/api/pdf/company");
      if (resp.ok) {
          const body = await resp.json();
          companyData = body?.data?.[0] || (Array.isArray(body?.data) ? null : body?.data);
      }
  } catch (err) {
      console.warn("Failed to fetch company data for PDF:", err);
  }
  if (!companyData) companyData = {} as CompanyData;

  const templates = await pdfTemplateService.fetchTemplates();
  const template = templates.find(t => t.name === "MEN2") 
                || templates.find(t => t.name.toLowerCase().includes("men2")) 
                || templates[0];
  const templateName = template?.name || "MEN2";

  // --- 2. GENERATE PDF WITH FRAME ---
  // Note: We use the engine but we will force landscape if the template doesn't specify it, 
  // or rely on the engine's ability to handle orientation from config.
  return await PdfEngine.generateWithFrame(templateName, companyData, (doc, startY, config) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Section Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80);
    doc.text("PURCHASE ORDER SUMMARY", pageWidth / 2, startY + 10, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    const printDate = new Date().toLocaleString('en-PH');
    doc.text(`Generated on: ${printDate}`, 14, startY + 18);

    // Define Columns
    const head = [
      ["DATE", "SUPPLIER", "PO #", "REMARKS", "GROSS", "DISCOUNT", "NET AMOUNT"]
    ];

    const body = data.map((po) => {
      const sName = suppliers.find((s) => s.id === po.supplier_name)?.supplier_name || String(po.supplier_name || "--");
      
      const gross = Number(po.gross_amount ?? po.grossAmount ?? po.subtotal ?? 0);
      const discAmt = Number(po.discounted_amount ?? po.discountAmount ?? po.discount_amount ?? po.discount_value ?? 0);
      const net = Number(po.total_amount ?? po.total ?? po.net_amount ?? 0);

      const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2 });

      return [
        po.date || "--",
        sName.toUpperCase(),
        po.purchase_order_no || "--",
        po.remark || "--",
        formatMoney(gross),
        formatMoney(discAmt),
        formatMoney(net),
      ];
    });

    const totalGross = data.reduce((acc, po) => acc + Number(po.gross_amount ?? po.grossAmount ?? po.subtotal ?? 0), 0);
    const totalDiscount = data.reduce((acc, po) => acc + Number(po.discounted_amount ?? po.discountAmount ?? po.discount_amount ?? po.discount_value ?? 0), 0);
    const totalNet = data.reduce((acc, po) => acc + Number(po.total_amount ?? po.total ?? po.net_amount ?? 0), 0);

    const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2 });

    autoTable(doc, {
      head: head,
      body: body,
      startY: startY + 22,
      theme: "grid",
      styles: { 
        fontSize: 7, 
        cellPadding: 2,
        valign: "middle"
      },
      headStyles: { 
        fillColor: [44, 62, 80], 
        textColor: 255, 
        fontStyle: "bold",
        halign: "center"
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25 },
        3: { cellWidth: 50 },
        4: { halign: "right", cellWidth: 25 }, 
        5: { halign: "right", cellWidth: 25 }, 
        6: { halign: "right", cellWidth: 28, fontStyle: "bold" }
      },
      foot: [
        [
          { content: "TOTAL", colSpan: 4, styles: { halign: "right" } },
          formatMoney(totalGross), 
          formatMoney(totalDiscount), 
          formatMoney(totalNet)
        ]
      ],
      footStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0, 0, 0], 
        fontStyle: "bold",
        halign: "right"
      },
      showFoot: "lastPage",
      margin: { left: 10, right: 10, bottom: 15 },
    });

    doc.save(`PO_Summary_${new Date().getTime()}.pdf`);
  });
};
