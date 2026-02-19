import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// force-update-v5-final-maayos



type ReceiptData = {
    poNumber: string;
    supplierName: string;
    receiptNo: string;
    receiptType: string;
    receiptDate: string;
    isFullyReceived: boolean;
    items: Array<{
        name: string;
        barcode: string;
        expectedQty: number;
        receivedQtyAtStart: number;
        receivedQtyNow: number;
        rfids: string[];
    }>;
};

export async function generateOfficialSupplierReceiptV5(data: ReceiptData) {
    console.log("Generating Official PDF V5: ", data.receiptNo);

    if (!data || !data.items) {
        console.error("No data or items provided to generateReceiptPDF");
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    const statusText = data.isFullyReceived ? "FULLY RECEIVED" : "PARTIALLY RECEIVED";
    doc.setTextColor(data.isFullyReceived ? 46 : 230, data.isFullyReceived ? 125 : 126, data.isFullyReceived ? 50 : 34); // Green or Orange
    doc.text(statusText, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("RECEIVING RECEIPT", pageWidth / 2, 28, { align: "center" });

    // Metadata
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 15, 10, { align: "right" });

    // Header Info Box
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 33, pageWidth - 15, 33);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("PO Number:", 15, 42);
    doc.setFont("helvetica", "normal");
    doc.text(data.poNumber || "N/A", 45, 42);

    doc.setFont("helvetica", "bold");
    doc.text("Supplier:", 15, 49);
    doc.setFont("helvetica", "normal");
    doc.text(data.supplierName || "N/A", 45, 49);

    doc.setFont("helvetica", "bold");
    doc.text("Receipt No:", 110, 42);
    doc.setFont("helvetica", "normal");
    doc.text(data.receiptNo || "N/A", 140, 42);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", 110, 49);
    doc.setFont("helvetica", "normal");
    doc.text(data.receiptDate || "N/A", 140, 49);

    doc.setFont("helvetica", "bold");
    doc.text("Type:", 110, 56);
    doc.setFont("helvetica", "normal");
    doc.text(data.receiptType || "N/A", 140, 56);

    doc.line(15, 62, pageWidth - 15, 62);

    // Items Table
    const tableRows: any[] = [];
    data.items.forEach((it) => {
        const now = it.receivedQtyNow ?? 0;
        const tot = it.expectedQty ?? 0;
        
        const qtyText = `${now} / ${tot}`;
        const isPending = now === 0;
        const rfids = it.rfids || [];

        // First row for the item
        tableRows.push([
            { 
                content: it.name || "Unknown Product", 
                styles: { fontStyle: isPending ? "italic" : "normal", textColor: isPending ? [150, 150, 150] : [0, 0, 0] } 
            },
            it.barcode || "N/A",
            {
                content: qtyText,
                styles: { halign: "center", fontStyle: "bold" }
            },
            rfids[0] || (isPending ? "(Not Received)" : "N/A")
        ]);

        // Subsequent rows for additional RFIDs
        for (let i = 1; i < rfids.length; i++) {
            tableRows.push(["", "", "", rfids[i]]);
        }
    });

    if (tableRows.length === 0) {
        tableRows.push([{ content: "No items recorded in this receipt summary.", colSpan: 4, styles: { halign: "center", fontStyle: "italic" } }]);
    }

    autoTable(doc, {
        startY: 68,
        head: [["Product Name", "SKU / Barcode", "Qty / Total", "Verified RFIDs"]],
        body: tableRows,
        theme: "grid",
        headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 10, halign: 'left' },
        styles: { fontSize: 9, cellPadding: 3, valign: "middle" },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25, halign: "center" },
            3: { cellWidth: "auto", font: "courier" }
        }
    });


    // Footer
    const lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your service.", pageWidth / 2, lastY + 20, { align: "center" });

    // Save/Download
    doc.save(`Receipt_${data.receiptNo}.pdf`);
}
