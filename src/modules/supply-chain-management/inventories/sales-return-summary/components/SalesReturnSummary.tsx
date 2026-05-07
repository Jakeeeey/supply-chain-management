"use client";

import React from "react";
import { useSalesReturnReport } from "../hooks/useSalesReturnReport";
import { SalesReturnFilters } from "./SalesReturnFilters";
import { SalesReturnMetrics } from "./SalesReturnMetrics";
import { SalesReturnCharts } from "./SalesReturnCharts";
import { SalesReturnTable } from "./SalesReturnTable";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";

export function SalesReturnSummary() {
  const {
    mounted,
    report,
    loading,
    pagination,
    setPagination,
    options,
    printData,
    printComponentRef,
    filters,
    setFilters,
    quickRange,
    setQuickRange,
    dateRange,
    setDateRange,
  } = useSalesReturnReport();

  if (!mounted) return null;

  const logicProps = {
    options,
    filters,
    setFilters,
    quickRange,
    setQuickRange,
    dateRange,
    setDateRange,
    loading,
    setPagination,
  };

  return (
    <div className="space-y-4 p-2 sm:p-0">
      <SalesReturnFilters logic={logicProps} />

      <SalesReturnMetrics summary={report.summary} loading={loading} />

      <SalesReturnCharts charts={report.charts} />

      <SalesReturnTable
        report={report}
        loading={loading}
        pagination={pagination}
        setPagination={setPagination}
        options={options}
      />

      <div style={{ display: "none" }}>
        {printData && (
          <SalesReturnPrintSlip ref={printComponentRef} data={printData} />
        )}
      </div>
    </div>
  );
}
