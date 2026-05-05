import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";

import {
  SummaryCustomerOption,
  SummarySalesmanOption,
  SummarySupplierOption,
  API_SalesReturnType,
  SummaryReturnHeader,
  SummaryFilters,
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
  }, [printData]);

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
    const apiFilters: SummaryFilters = {
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      status: filters.status,
      customerCode: filters.customerCode,
      salesmanId: filters.salesmanId,
      supplierName: filters.supplierName,
      returnCategory: filters.returnCategory,
    };

    const isComplexFilter =
      (filters.supplierName && filters.supplierName !== "All") ||
      (filters.returnCategory && filters.returnCategory !== "All");

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let tableData: SummaryReturnHeader[] = [];
        let totalCount = 0;
        let chartData: SummaryReturnHeader[] = [];

        const buildQuery = (page: number, limit: number) => {
          const params = new URLSearchParams({
            action: "report",
            page: String(page),
            limit: String(limit),
            search: filters.search,
            ...apiFilters as any
          });
          return `/api/scm/inventories/sales-return-summary?${params.toString()}`;
        };

        if (isComplexFilter) {
          // STRATEGY A: Fetch ALL, then Paginate Locally
          const res = await fetch(buildQuery(1, -1)).then((r) => r.json());
          const allRows = res.data || [];
          totalCount = res.data.length; // Accurate filtered count

          // Manual Pagination
          const start = (pagination.page - 1) * pagination.limit;
          tableData = allRows.slice(start, start + pagination.limit);
          chartData = allRows;
        } else {
          // STRATEGY B: Fetch Page for Table, Fetch All for Charts (Parallel)
          const [tableReq, chartReq] = await Promise.all([
            fetch(buildQuery(pagination.page, pagination.limit)).then((r) => r.json()),
            fetch(buildQuery(1, -1)).then((r) => r.json()),
          ]);
          tableData = tableReq.data || [];
          totalCount = tableReq.total || 0;
          chartData = chartReq.data || [];
        }

        // Metrics & Charts Aggregation (using chartData - full set)
        let gross = 0,
          discount = 0,
          net = 0,
          pending = 0,
          received = 0;
        const statusCount = new Map<string, number>();
        const supplierCount = new Map<string, number>();
        const categoryCount = new Map<string, number>();

        for (const r of chartData) {
          const st = (r.returnStatus || "").toLowerCase();
          if (st === "pending") pending++;
          if (st === "received") received++;
          // Sum Net from ITEMS for accuracy in filtered views
          let rowNet = 0;
          const stKey = r.returnStatus || "Unknown";
          statusCount.set(stKey, (statusCount.get(stKey) || 0) + 1);

          if (r.items) {
            for (const item of r.items) {
              gross += Number(item.grossAmount || 0);
              discount += Number(item.discountAmount || 0);
              rowNet += Number(item.netAmount || 0);

              const supStr = (item.supplierName || "").trim();
              const sups = supStr
                ? supStr
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                : ["No Supplier"];
              sups.forEach((s) =>
                supplierCount.set(s, (supplierCount.get(s) || 0) + 1),
              );

              const cat = item.returnCategory || "Uncategorized";
              categoryCount.set(
                cat,
                (categoryCount.get(cat) || 0) + Number(item.netAmount || 0),
              );
            }
          }
          // Use Summed item net if filtered, else use header net
          net += isComplexFilter ? rowNet : Number(r.netTotal || 0);
        }

        const toChart = (m: Map<string, number>) =>
          Array.from(m.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        setReport({
          rows: tableData,
          total: totalCount,
          summary: {
            totalReturns: chartData.length,
            grossAmount: gross,
            totalDiscount: discount,
            netAmount: net,
            pendingInventory: pending,
            receivedInventory: received,
          },
          charts: {
            status: toChart(statusCount),
            supplier: toChart(supplierCount).slice(0, 12),
            category: toChart(categoryCount),
          },
        });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination, filters.search, filters, dateRange]);

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
