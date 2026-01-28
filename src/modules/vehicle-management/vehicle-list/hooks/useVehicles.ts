"use client";

import * as React from "react";
import type { VehicleRow } from "../types";
import { listVehicles, listVehicleTypes, createVehicle } from "../providers/fetchProviders";

function cleanStr(v: unknown, fallback = "N/A") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function buildTypeMap(types: { id: number; type_name: string }[]) {
  const map = new Map<number, string>();
  for (const t of types || []) {
    if (typeof t?.id === "number") map.set(t.id, String(t.type_name || ""));
  }
  return map;
}

function mapVehicle(v: any, typeMap: Map<number, string>): VehicleRow {
  const id = Number(v?.vehicle_id ?? 0);
  const plateNo = cleanStr(v?.vehicle_plate, "N/A");

  const typeId =
    v?.vehicle_type === null || v?.vehicle_type === undefined
      ? null
      : Number(v.vehicle_type);

  const typeName = typeId && typeMap.has(typeId) ? cleanStr(typeMap.get(typeId), "N/A") : null;

  return {
    id,
    plateNo,
    vehicleName: typeName || "N/A", // display type name as vehicle name for now
    driverName: "N/A",
    status: cleanStr(v?.status, "Inactive"),
    vehicleTypeId: typeId,
    vehicleTypeName: typeName,
    raw: v,
  };
}

function filterRows(rows: VehicleRow[], q: string) {
  const query = String(q || "").trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((r) => {
    return (
      r.plateNo.toLowerCase().includes(query) ||
      r.vehicleName.toLowerCase().includes(query) ||
      r.driverName.toLowerCase().includes(query)
    );
  });
}

export function useVehicles() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<VehicleRow[]>([]);
  const [typeMap, setTypeMap] = React.useState<Map<number, string>>(new Map());

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [types, vehicles] = await Promise.all([listVehicleTypes(), listVehicles()]);
      const tMap = buildTypeMap(types);
      setTypeMap(tMap);
      setRows((vehicles || []).map((v) => mapVehicle(v, tMap)));
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => filterRows(rows, query), [rows, query]);

  const addVehicle = React.useCallback(
    async (payload: Record<string, any>) => {
      setSaving(true);
      setError(null);
      try {
        await createVehicle(payload);
        await refresh();
      } catch (e: any) {
        setError(String(e?.message || e));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  return {
    loading,
    saving,
    error,
    query,
    setQuery,
    rows: filtered,
    refresh,
    addVehicle,
    typeMap,
  };
}
