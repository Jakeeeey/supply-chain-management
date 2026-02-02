// src/modules/vehicle-management/vehicle-list/components/history/DetailsTab.tsx
"use client";

import * as React from "react";
import type { VehicleRow } from "../../types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function cleanStr(v: unknown, fallback = "N/A") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function fmtDateShort(v: unknown, fallback = "N/A") {
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function statusVariant(s: string) {
  const v = String(s || "").toLowerCase();
  if (v.includes("active")) return "default";
  return "secondary";
}

function Field({
  label,
  value,
  loading,
  alignRight,
}: {
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={["grid gap-1", alignRight ? "md:text-right" : ""].join(" ")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className={alignRight ? "ml-auto h-4 w-32" : "h-4 w-32"} />
      ) : (
        <div className="text-sm font-medium">{value}</div>
      )}
    </div>
  );
}

function SectionSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={`dsk-${i}`} className="grid gap-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DetailsTab({ vehicle }: { vehicle: VehicleRow }) {
  const raw: any = vehicle?.raw ?? {};

  // ✅ vehicles.image (path or file id, depending on your implementation)
  const imagePath = String(raw?.image ?? "").trim() || null;

  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => alive && setLoading(false), 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [vehicle?.id]);

  const model = cleanStr(raw?.model ?? raw?.vehicle_model ?? vehicle?.vehicleName, "N/A");

  // ✅ FIX: Year must come from year_to_last
  const year = cleanStr(raw?.year_to_last, "N/A");


  const mileage = cleanStr(
    raw?.current_mileage ?? raw?.mileage_km ?? raw?.mileage ?? raw?.odometer,
    "N/A"
  );

  const fuelType = cleanStr(raw?.fuel_type ?? raw?.fuelType, "N/A");

  const lastMaint = raw?.last_maintenance_date
    ? fmtDateShort(raw?.last_maintenance_date)
    : "No records";

  const nextMaint = raw?.next_maintenance_date
    ? fmtDateShort(raw?.next_maintenance_date)
    : "Not scheduled";

  return (
    <div className="grid gap-4">
      {loading ? (
        <>
          <SectionSkeleton rows={6} />
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={4} />
        </>
      ) : (
        <>
          {/* Basic Information */}
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Basic Information</div>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-12">
                <div className={imagePath ? "md:col-span-8" : "md:col-span-12"}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="Plate Number" value={vehicle.plateNo} />
                    <Field label="Vehicle Name/Model" value={model} />
                    <Field label="Year" value={year} />
                    <Field label="Type" value={vehicle.vehicleTypeName || "N/A"} />
                    <Field
                      label="Status"
                      value={
                        <Badge className="px-3" variant={statusVariant(vehicle.status)}>
                          {vehicle.status || "Inactive"}
                        </Badge>
                      }
                    />
                  </div>
                </div>

                {imagePath ? (
                  <div className="md:col-span-4">
                    <div className="text-xs text-muted-foreground">Vehicle Photo</div>
                    <div className="mt-2 overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePath}
                        alt="Vehicle"
                        className="h-44 w-full object-cover md:h-48"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Operational Details */}
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Operational Details</div>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Current Mileage" value={mileage} />
                <Field label="Fuel Type" value={fuelType} />
                <Field label="Current Driver" value={vehicle.driverName || "N/A"} />
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Information */}
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Maintenance Information</div>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Last Maintenance Date" value={lastMaint} />
                <Field label="Next Maintenance Date" value={nextMaint} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
