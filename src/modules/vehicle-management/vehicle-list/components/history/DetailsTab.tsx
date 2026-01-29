"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import type { VehicleRow } from "../../types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function clean(v: unknown, fallback = "N/A") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function formatDateOr(v: unknown, fallback: string) {
  const s = String(v ?? "").trim();
  if (!s) return fallback;

  // Accept ISO or YYYY-MM-DD; display as-is (stable and safe)
  // If you want pretty format later, we can add date-fns formatting.
  return s;
}

function StatusPill({ status }: { status?: string | null }) {
  const raw = String(status || "").trim();
  const v = raw.toLowerCase();

  const isActive = v.includes("active");
  const label = raw.length ? raw : "Inactive";

  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-3 py-1 font-medium",
        isActive
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-muted text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </Badge>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function sectionTitle(title: string) {
  return <div className="text-sm font-semibold">{title}</div>;
}

export default function DetailsTab({ vehicle }: { vehicle: VehicleRow }) {
  const raw: any = vehicle?.raw ?? {};

  // Try common keys; fallback to what's already on VehicleRow
  const model =
    String(raw?.model ?? raw?.vehicle_model ?? raw?.vehicle_name ?? "").trim() ||
    vehicle.vehicleName ||
    "N/A";

  const year = clean(raw?.year ?? raw?.vehicle_year, "N/A");
  const category = clean(raw?.category ?? raw?.vehicle_category, "N/A");

  const mileage = clean(
    raw?.current_mileage ??
      raw?.mileage ??
      raw?.mileage_km ??
      raw?.odometer,
    "N/A"
  );

  const fuelType = clean(raw?.fuel_type ?? raw?.fuel, "N/A");

  const lastMaintenance = formatDateOr(
    raw?.last_maintenance_date ?? raw?.lastMaintenanceDate,
    "No records"
  );

  const nextMaintenance = formatDateOr(
    raw?.next_maintenance_date ?? raw?.nextMaintenanceDate,
    "Not scheduled"
  );

  return (
    <div className="grid gap-4">
      {/* ✅ Basic Information */}
      <Card>
        <CardContent className="p-6">
          {sectionTitle("Basic Information")}

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Row label="Plate Number" value={vehicle.plateNo} />
            <Row label="Vehicle Name/Model" value={model} />
            <Row label="Year" value={year} />
            <Row label="Type" value={vehicle.vehicleTypeName || "N/A"} />
            <Row label="Category" value={category} />
            <Row label="Status" value={<StatusPill status={vehicle.status} />} />
          </div>
        </CardContent>
      </Card>

      {/* ✅ Operational Details */}
      <Card>
        <CardContent className="p-6">
          {sectionTitle("Operational Details")}

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Row label="Current Mileage" value={mileage} />
            <Row label="Fuel Type" value={fuelType} />
            <Row label="Current Driver" value={vehicle.driverName || "N/A"} />
          </div>
        </CardContent>
      </Card>

      {/* ✅ Maintenance Information */}
      <Card>
        <CardContent className="p-6">
          {sectionTitle("Maintenance Information")}

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Row label="Last Maintenance Date" value={lastMaintenance} />
            <Row label="Next Maintenance Date" value={nextMaintenance} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
