"use client";

import * as React from "react";
import type { InvoiceDetailsResponse } from "../types";
import { getInvoiceDetails } from "../providers/fetchProvider";

export function useInvoiceDetails(open: boolean, invoiceNo: string | null) {
  const [data, setData] = React.useState<InvoiceDetailsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      if (!open || !invoiceNo) return;

      try {
        setError(null);
        setLoading(true);
        const res = await getInvoiceDetails(invoiceNo);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load invoice details");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, invoiceNo]);

  return { data, loading, error };
}
