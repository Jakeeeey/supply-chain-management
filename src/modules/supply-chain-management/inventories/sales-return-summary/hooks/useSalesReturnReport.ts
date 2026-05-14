import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";

import {
  SummaryCustomerOption,
  SummarySalesmanOption,
  SummarySupplierOption,
  API_SalesReturnType,
  SummaryReturnHeader,
  SummaryMetricsData,
} from "../type";

type ChartDatum = { name: string; value: number };

// --- Helpers ---
const fmtDate = (d: Date) => d.toISOString().split("T")[0];
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

export const useSalesReturnReport = () => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [options, setOptions] = useState({
    customers: [] as SummaryCustomerOption[],
    salesmen: [] as SummarySalesmanOption[],
    suppliers: [] as SummarySupplierOption[],
    returnTypes: [] as API_SalesReturnType[],
  });

  const [quickRange, setQuickRange] = useState("thismonth");
  const [dateRange, setDateRange] = useState({
    from: fmtDate(startOfMonth(new Date())),
    to: fmtDate(new Date()),
  });
  const [filters, setFilters] = useState({
    search: "",
    customerCode: "All",
    salesmanId: "All",
    status: "All",
    supplierName: "All",
    returnCategory: "All",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const [report, setReport] = useState({
    rows: [] as SummaryReturnHeader[],
    total: 0,
    summary: {
      totalReturns: 0,
      grossAmount: 0,
      totalDiscount: 0,
      netAmount: 0,
      pendingInventory: 0,
      receivedInventory: 0,
    } as SummaryMetricsData,
    charts: {
      status: [] as ChartDatum[],
      supplier: [] as ChartDatum[],
      category: [] as ChartDatum[],
    },
  });

  const printComponentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<SummaryReturnHeader | null>(null);
  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Return-Slip-${printData?.returnNumber || "Document"}`,
  });

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (printData) handlePrint();
  }, [printData, handlePrint]);

  useEffect(() => {
    (async () => {
      try {
        const fetchApi = async (action: string) => {
          const res = await fetch(`/api/scm/inventories/sales-return-summary?action=${action}`);
          const json = await res.json();
          return json.data || [];
        };

        const [c, s, sup, rt] = await Promise.all([
          fetchApi("customers"),
          fetchApi("salesmen"),
          fetchApi("suppliers"),
          fetchApi("returnTypes"),
        ]);
        setOptions({
          customers: c,
          salesmen: s,
          suppliers: sup,
          returnTypes: rt,
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    const now = new Date();
    if (quickRange === "custom") return;
    let from = now;
    if (quickRange === "lastday") {
      from = new Date(now);
      from.setDate(from.getDate() - 1);
    } else if (quickRange === "thisweek") from = startOfWeek(now);
    else if (quickRange === "thismonth") from = startOfMonth(now);
    else if (quickRange === "thisyear") from = startOfYear(now);
    setDateRange({ from: fmtDate(from), to: fmtDate(now) });
  }, [quickRange]);

  // --- 🟢 HYBRID FETCHING LOGIC ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: "report",
          page: "1",
          limit: "-1",
          search: filters.search,
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
          status: filters.status,
          customerCode: filters.customerCode,
          salesmanId: String(filters.salesmanId),
          supplierName: filters.supplierName,
          returnCategory: filters.returnCategory,
        });

        const res = await fetch(`/api/scm/inventories/sales-return-summary?${params.toString()}`).then((r) => r.json());
        const allRows: SummaryReturnHeader[] = res.data || [];
        
        // Accurate totals and charts from full set
        let gross = 0, discount = 0, net = 0, pending = 0, received = 0;
        const statusMap = new Map<string, number>();
        const supplierMap = new Map<string, number>();
        const categoryMap = new Map<string, number>();

        allRows.forEach((r) => {
          const st = (r.returnStatus || "").toLowerCase();
          if (st === "pending") pending++;
          if (st === "received") received++;
          
          const stKey = r.returnStatus || "Unknown";
          statusMap.set(stKey, (statusMap.get(stKey) || 0) + 1);

          (r.items || []).forEach((it) => {
            gross += Number(it.grossAmount || 0);
            discount += Number(it.discountAmount || 0);
            net += Number(it.netAmount || 0);

            const sup = (it.supplierName || "Unknown").split(",")[0].trim();
            supplierMap.set(sup, (supplierMap.get(sup) || 0) + 1);

            const cat = it.returnCategory || "Uncategorized";
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(it.netAmount || 0));
          });
        });

        // Paginate locally
        const start = (pagination.page - 1) * pagination.limit;
        const pageData = allRows.slice(start, start + pagination.limit);

        const toChart = (m: Map<string, number>) =>
          Array.from(m.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        setReport({
          rows: pageData,
          total: allRows.length,
          summary: {
            totalReturns: allRows.length,
            grossAmount: gross,
            totalDiscount: discount,
            netAmount: net,
            pendingInventory: pending,
            receivedInventory: received,
          },
          charts: {
            status: toChart(statusMap),
            supplier: toChart(supplierMap).slice(0, 10),
            category: toChart(categoryMap),
          },
        });
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, filters, dateRange]);

  return {
    mounted,
    options,
    quickRange,
    setQuickRange,
    dateRange,
    setDateRange,
    filters,
    setFilters,
    pagination,
    setPagination,
    report,
    loading,
    printComponentRef,
    printData,
    setPrintData,
  };
};
