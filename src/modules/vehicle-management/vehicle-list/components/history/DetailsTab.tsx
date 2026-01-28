"use client";

import * as React from "react";
import type { VehicleRow } from "../../types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function DetailsTab({ vehicle }: { vehicle: VehicleRow }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-semibold">Basic Information</div>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Row label="Plate Number" value={vehicle.plateNo} />
            <Row label="Vehicle Name/Model" value={vehicle.vehicleName || "N/A"} />
            <Row label="Year" value={"N/A"} />
            <Row label="Type" value={vehicle.vehicleTypeName || "N/A"} />
            <Row label="Category" value={"N/A"} />
            <Row
              label="Status"
              value={
                <Badge className="px-3" variant="default">
                  {vehicle.status || "Inactive"}
                </Badge>
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-semibold">Operational Details</div>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Row label="Current Mileage" value={"N/A"} />
            <Row label="Fuel Type" value={"N/A"} />
            <Row label="Current Driver" value={vehicle.driverName || "N/A"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
