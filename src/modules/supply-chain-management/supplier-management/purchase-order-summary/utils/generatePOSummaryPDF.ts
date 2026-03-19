import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PurchaseOrder, Supplier } from "../types";

export const generatePOSummaryPDF = (data: PurchaseOrder[], suppliers: Supplier[]) => {
  // Use landscape for more space
  const doc = new jsPDF("landscape", "mm", "a4");

  // Title
  doc.setFontSize(18);
  doc.text("PURCHASE ORDER SUMMARY", 14, 15);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  // Define Columns exactly as requested (Discount Type removed)
  const head = [
    ["DATE", "SUPPLIER", "PO #", "REMARKS", "GROSS AMOUNT", "DISCOUNT", "NET AMOUNT"]
  ];

  const body = data.map((po) => {
    const sName = suppliers.find((s) => s.id === po.supplier_name)?.supplier_name || String(po.supplier_name || "--");
    
    // Normalize financial fields with explicit Number conversion to avoid string concatenation
    const gross = Number(po.gross_amount ?? po.grossAmount ?? po.subtotal ?? 0);
    const discAmt = Number(po.discounted_amount ?? po.discountAmount ?? po.discount_amount ?? po.discount_value ?? 0);
    const net = Number(po.total_amount ?? po.total ?? po.net_amount ?? 0);

    return [
      po.date || "--",
      sName.toUpperCase(),
      po.purchase_order_no || "--",
      po.remark || "--",
      gross.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      discAmt.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      net.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    ];
  });

  const totalGross = data.reduce((acc, po) => {
    return acc + Number(po.gross_amount ?? po.grossAmount ?? po.subtotal ?? 0);
  }, 0);

  const totalDiscount = data.reduce((acc, po) => {
    return acc + Number(po.discounted_amount ?? po.discountAmount ?? po.discount_amount ?? po.discount_value ?? 0);
  }, 0);

  const totalNet = data.reduce((acc, po) => {
    return acc + Number(po.total_amount ?? po.total ?? po.net_amount ?? 0);
  }, 0);

  autoTable(doc, {
    head: head,
    body: body,
    startY: 30,
    theme: "grid",
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      valign: "middle"
    },
    headStyles: { 
      fillColor: [44, 62, 80], 
      textColor: 255, 
      fontStyle: "bold" 
    },
    columnStyles: {
      4: { halign: "right" }, // Gross
      5: { halign: "right" }, // Discount
      6: { halign: "right", fontStyle: "bold" } // Net
    },
    foot: [
      [
        "TOTAL", 
        "", 
        "", 
        "", 
        totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 }), 
        totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 }), 
        totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })
      ]
    ],
    footStyles: { 
      fillColor: [241, 241, 241], 
      textColor: [0, 0, 0], 
      fontStyle: "bold" 
    },
    margin: { top: 25 },
  });

  doc.save(`PO_Summary_${new Date().getTime()}.pdf`);
};
