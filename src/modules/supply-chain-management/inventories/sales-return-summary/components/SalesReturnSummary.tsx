"use client";

import React from "react";
import { useSalesReturnReport } from "../hooks/useSalesReturnReport";
import { SalesReturnFilters } from "./SalesReturnFilters";
import { SalesReturnMetrics } from "./SalesReturnMetrics";
import { SalesReturnCharts } from "./SalesReturnCharts";
import { SalesReturnTable } from "./SalesReturnTable";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";

export function SalesReturnSummary() {
  const logic = useSalesReturnReport();

  if (!logic.mounted) return null;

  return (
    <div className="space-y-4 p-2 sm:p-0">
      <SalesReturnFilters logic={logic} />

      <SalesReturnMetrics
        summary={logic.report.summary}
        loading={logic.loading}
      />

      <SalesReturnCharts charts={logic.report.charts} />

      <SalesReturnTable
        report={logic.report}
        loading={logic.loading}
        pagination={logic.pagination}
        setPagination={logic.setPagination}
        options={logic.options}
      />

      <div style={{ display: "none" }}>
        {logic.printData && (
          <SalesReturnPrintSlip
            ref={logic.printComponentRef}
            data={logic.printData}
          />
        )}
      </div>
    </div>
  );
}
