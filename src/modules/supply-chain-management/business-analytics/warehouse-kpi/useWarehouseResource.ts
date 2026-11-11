"use client";

import { useEffect, useState } from "react";
import { warehouseRequest } from "./api";

export function useWarehouseResource<T>(path: string | null, revision = 0) {
  const key = `${path}:${revision}`;
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    warehouseRequest<T>(path, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "Request failed." }); });
    return () => controller.abort();
  }, [path, key]);
  const current = result?.key === key ? result : undefined;
  return { data: current?.data, error: current?.error, loading: Boolean(path && !current) };
}
