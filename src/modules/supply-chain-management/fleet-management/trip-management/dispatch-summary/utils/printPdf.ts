import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DispatchPlan } from "../types";
import { formatDateTime } from "./date";

export function generateDispatchPdf(args: {
  title: string;
  generatedOn: string;
  filtersLine: string;
  rows: DispatchPlan[];
}) {
  const { title, generatedOn, filtersLine, rows } = args;

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${generatedOn}`, 14, 30);
  doc.text(`Filters: ${filtersLine}`, 14, 36);

  const head = [["DP #", "Driver", "Salesman", "Vehicle", "Dispatch From", "Dispatch To", "Status"]];
  const body = rows.map((p) => [
    p.dpNumber,
    p.driverName,
    p.salesmanName,
    p.vehiclePlateNo,
    formatDateTime(p.timeOfDispatch),
    formatDateTime(p.timeOfArrival),
    p.status,
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 45,
    theme: "grid",
    styles: { fontSize: 8 },
  });

  doc.save(`Dispatch_Report_${new Date().toISOString().split("T")[0]}.pdf`);
}
