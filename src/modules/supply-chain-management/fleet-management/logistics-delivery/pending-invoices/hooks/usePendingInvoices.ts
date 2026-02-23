"use client";

import * as React from "react";
import type { FiltersState, PendingInvoiceListResponse } from "../types";
import { listPendingInvoices } from "../providers/fetchProvider";

export function usePendingInvoices(filters: FiltersState) {
  const [data, setData] = React.useState<PendingInvoiceListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await listPendingInvoices(filters);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load pending invoices");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    filters.q,
    filters.status,
    filters.salesmanId,
    filters.customerCode,
    filters.dateFrom,
    filters.dateTo,
    filters.page,
    filters.pageSize,
  ]);

  return { data, loading, error };
}
