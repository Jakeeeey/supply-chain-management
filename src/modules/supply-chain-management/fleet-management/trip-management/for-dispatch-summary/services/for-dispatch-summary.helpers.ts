import type { ForDispatchInvoice, DispatchPlanGroup } from "../types/for-dispatch-summary.types";

export function normalizeCode(code: string): string {
  return code ? code.replace(/\s+/g, "") : "";
}

export function extractDateKey(dateStr: string): string {
  if (!dateStr) return "unknown";
  const localStr = String(dateStr).replace(/Z$/, "");
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toISOString();
}

export function buildDispatchPlanGroup(
  dispatchDocNo: string,
  invoices: ForDispatchInvoice[]
): DispatchPlanGroup {
  const firstInv = invoices[0];
  const dateStr = firstInv?.estimatedTimeOfDispatch || "";
  const driverName =
    firstInv && (firstInv.driverFirstName || firstInv.driverLastName)
      ? `${firstInv.driverFirstName} ${firstInv.driverLastName}`.trim()
      : "Unknown Driver";
  const vehiclePlate = firstInv?.vehiclePlate || "Unknown Vehicle";

  let dateLabel = "Unknown Date";
  if (dateStr) {
    const localStr = String(dateStr).replace(/Z$/, "");
    const d = new Date(localStr);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  return {
    dispatchDocNo,
    estimatedTimeOfDispatch: dateStr,
    dateLabel,
    driverName,
    vehiclePlate,
    invoices,
  };
}

export function matchesSearch(invoice: ForDispatchInvoice, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();
  return (
    invoice.invoiceNo.toLowerCase().includes(lower) ||
    invoice.customerName.toLowerCase().includes(lower) ||
    invoice.customerCode.toLowerCase().includes(lower) ||
    invoice.dispatchDocNo.toLowerCase().includes(lower) ||
    `${invoice.driverFirstName} ${invoice.driverLastName}`
      .toLowerCase()
      .includes(lower) ||
    invoice.vehiclePlate.toLowerCase().includes(lower)
  );
}

export function buildAddress(brgy: string, city: string, province: string): string {
  return [brgy, city, province].filter(Boolean).join(", ") || "N/A";
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "N/A";
  const localStr = String(dateStr).replace(/Z$/, "");
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
