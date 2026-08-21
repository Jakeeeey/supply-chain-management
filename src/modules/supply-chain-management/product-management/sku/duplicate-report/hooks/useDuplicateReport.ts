import { useState, useEffect } from "react";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

export interface DuplicateGroup {
  name: string;
  description: string;
  items: SKU[];
  totalItems: number;
}

export function useDuplicateReport() {
  const [data, setData] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/scm/product-management/sku/duplicate-report");
      if (!res.ok) {
        throw new Error("Failed to fetch duplicate report");
      }
      const json = await res.json();
      setData(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchReport,
  };
}
