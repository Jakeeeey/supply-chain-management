"use client";

import * as React from "react";
import type { PendingInvoiceOptions } from "../types";
import { getPendingInvoiceOptions } from "../providers/fetchProvider";

export function usePendingInvoiceOptions() {
  const [data, setData] = React.useState<PendingInvoiceOptions | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await getPendingInvoiceOptions();
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load options");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}
