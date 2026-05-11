export const parseBoolean = (val: unknown): boolean => {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (val && typeof val === "object" && "type" in val && val.type === "Buffer" && "data" in val && Array.isArray(val.data))
    return val.data[0] === 1;
  if (typeof val === "string")
    return val === "1" || val.toLowerCase() === "true";
  return false;
};

export const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

import { SummaryFilters } from "../type";

export const normalizeFilters = (raw: Partial<SummaryFilters>): Required<SummaryFilters> => {
  const f = raw || {};
  return {
    dateFrom: f.dateFrom || "",
    dateTo: f.dateTo || "",
    status: f.status ?? "All",
    customerCode: f.customerCode ?? "All",
    salesmanId: String(f.salesmanId ?? "All"),
    supplierName: f.supplierName ?? "All",
    returnCategory: f.returnCategory ?? "All",
  };
};

export const calculateDiscount = (gross: number, percentage: number): number => {
  return Math.round(gross * (percentage / 100) * 100) / 100;
};

export const roundToTwo = (num: number): number => {
  return Math.round(num * 100) / 100;
};
