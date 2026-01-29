"use client";

import * as React from "react";
import type {
  VehicleRow,
  VehicleTypeApiRow,
  VehiclesApiRow,
  UserApiRow,
  DispatchPlanApiRow,
} from "../types";
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

function toNullStr(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function buildTypeMap(types: VehicleTypeApiRow[]) {
  const map = new Map<number, string>();
  for (const t of types || []) {
    if (typeof t?.id === "number") map.set(t.id, String(t.type_name || ""));
  }
  return map;
}

function buildUserMap(users: UserApiRow[]) {
  const map = new Map<number, string>();
  for (const u of users || []) {
    const id = Number(u?.user_id);
    if (!Number.isFinite(id)) continue;
    const name = `${String(u?.user_fname ?? "").trim()} ${String(u?.user_lname ?? "").trim()}`.trim();
    map.set(id, name.length ? name : `User #${id}`);
  }
  return map;
}

function parseDateMs(s?: string | null) {
  if (!s) return 0;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : 0;
}

function buildLatestDispatchByVehicle(plans: DispatchPlanApiRow[]) {
  const map = new Map<number, DispatchPlanApiRow>();

  for (const p of plans || []) {
    const vid = p?.vehicle_id == null ? null : Number(p.vehicle_id);
    if (!vid) continue;

    const curr = map.get(vid);

    const pMs =
      parseDateMs(p?.time_of_dispatch) ||
      parseDateMs(p?.estimated_time_of_dispatch) ||
      parseDateMs(p?.date_encoded) ||
      Number(p?.id ?? 0);

    const cMs =
      curr
        ? (parseDateMs(curr?.time_of_dispatch) ||
            parseDateMs(curr?.estimated_time_of_dispatch) ||
            parseDateMs(curr?.date_encoded) ||
            Number(curr?.id ?? 0))
        : -1;

    if (!curr || pMs > cMs) map.set(vid, p);
  }

  return map;
}

function pickVehicleName(raw: VehiclesApiRow, typeName: string | null) {
  // prefer “model/name” fields if your schema has them; fallback to type name
  const candidates = [
    (raw as any)?.model,
    (raw as any)?.vehicle_model,
    (raw as any)?.vehicle_name,
    (raw as any)?.name,
    (raw as any)?.description,
  ];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }
  return typeName ? cleanStr(typeName, "N/A") : "N/A";
}

function mapVehicle(
  v: VehiclesApiRow,
  typeMap: Map<number, string>,
  userMap: Map<number, string>,
  latestDispatch: Map<number, DispatchPlanApiRow>
): VehicleRow {
  const id = Number(v?.vehicle_id ?? 0);
  const plateNo = cleanStr(v?.vehicle_plate, "N/A");

  const typeId =
    v?.vehicle_type === null || v?.vehicle_type === undefined
      ? null
      : Number(v.vehicle_type);

  const typeName =
    typeId && typeMap.has(typeId) ? cleanStr(typeMap.get(typeId), "N/A") : null;

  const latest = latestDispatch.get(id);
  const driverId = latest?.driver_id == null ? null : Number(latest.driver_id);
  const driverName = driverId && userMap.has(driverId) ? cleanStr(userMap.get(driverId), "N/A") : "N/A";

  const vehicleName = pickVehicleName(v, typeName);

  return {
    id,
    plateNo,
    vehicleName,
    driverName,
    status: cleanStr(v?.status, "Inactive"),

    vehicleTypeId: typeId,
    vehicleTypeName: typeName,

    driverId,
    latestDispatchPlanId: latest?.id ?? null,

    year: toNullStr((v as any)?.year ?? (v as any)?.vehicle_year),
    category: toNullStr((v as any)?.category ?? (v as any)?.vehicle_category),
    mileageKm: toNullStr((v as any)?.mileage ?? (v as any)?.current_mileage),
    fuelType: toNullStr((v as any)?.fuel_type ?? (v as any)?.fuelType),
    lastMaintenanceDate: toNullStr((v as any)?.last_maintenance_date),
    nextMaintenanceDate: toNullStr((v as any)?.next_maintenance_date),

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
      const latest = buildLatestDispatchByVehicle(plans);

      setTypeMap(tMap);
      setRows((vehicles || []).map((v) => mapVehicle(v, tMap, uMap, latest)));
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
