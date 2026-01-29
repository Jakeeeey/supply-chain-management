"use client";

import * as React from "react";
import type { VehicleRow, VehiclesApiRow, DispatchPlanApiRow, UserApiRow } from "../types";

import {
  listVehicles,
  listVehicleTypes,
  listUsers,
  listDispatchPlans,
  createVehicle,
} from "../providers/fetchProviders";

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

function buildUserMap(users: UserApiRow[]) {
  const map = new Map<number, string>();
  for (const u of users || []) {
    const id = Number(u?.user_id ?? 0);
    if (!id) continue;

    const first = String(u?.user_fname ?? "").trim();
    const last = String(u?.user_lname ?? "").trim();
    const name = `${first} ${last}`.trim();

    map.set(id, name.length ? name : `User #${id}`);
  }
  return map;
}

function toMs(v?: string | null) {
  if (!v) return 0;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}

function pickPlanDate(p: DispatchPlanApiRow) {
  return (
    p.time_of_dispatch ||
    p.estimated_time_of_dispatch ||
    p.date_encoded ||
    p.time_of_arrival ||
    p.estimated_time_of_arrival ||
    null
  );
}

/**
 * Latest driver per vehicle based on latest dispatch-plan date
 */
function buildLatestDriverByVehicle(plans: DispatchPlanApiRow[]) {
  const best = new Map<number, { ms: number; driverId: number }>();

  for (const p of plans || []) {
    const vehicleId = Number(p?.vehicle_id ?? 0);
    const driverId = Number(p?.driver_id ?? 0);
    if (!vehicleId || !driverId) continue;

    const ms = toMs(pickPlanDate(p) || undefined) || Number(p?.id ?? 0);
    const prev = best.get(vehicleId);

    if (!prev || ms > prev.ms) {
      best.set(vehicleId, { ms, driverId });
    }
  }

  const out = new Map<number, number>();
  for (const [vehicleId, v] of best.entries()) out.set(vehicleId, v.driverId);
  return out;
}

function mapVehicle(
  v: VehiclesApiRow,
  typeMap: Map<number, string>,
  userMap: Map<number, string>,
  latestDriverByVehicle: Map<number, number>
): VehicleRow {
  const id = Number(v?.vehicle_id ?? 0);
  const plateNo = cleanStr(v?.vehicle_plate, "N/A");

  const typeId =
    v?.vehicle_type === null || v?.vehicle_type === undefined
      ? null
      : Number(v.vehicle_type);

  const typeName =
    typeId && typeMap.has(typeId)
      ? cleanStr(typeMap.get(typeId), "N/A")
      : null;

  // Prefer model/name if your vehicles table actually has it; fallback to type name
  const anyV: any = v as any;
  const model =
    String(anyV?.model ?? anyV?.vehicle_model ?? anyV?.vehicle_name ?? "").trim();

  const vehicleName = model.length ? model : (typeName || "N/A");

  const latestDriverId = latestDriverByVehicle.get(id) ?? null;
  const driverName =
    latestDriverId && userMap.has(latestDriverId)
      ? cleanStr(userMap.get(latestDriverId), "N/A")
      : "N/A";

  return {
    id,
    plateNo,
    vehicleName,
    driverName,
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
      const [types, vehicles, users, plans] = await Promise.all([
        listVehicleTypes(),
        listVehicles(),
        listUsers(),
        listDispatchPlans(),
      ]);

      const tMap = buildTypeMap(types);
      const uMap = buildUserMap(users);
      const latestDriverByVehicle = buildLatestDriverByVehicle(plans);

      setTypeMap(tMap);
      setRows((vehicles || []).map((v) => mapVehicle(v, tMap, uMap, latestDriverByVehicle)));
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
