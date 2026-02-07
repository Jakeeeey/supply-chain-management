//src/modules/vehicle-management/vehicle-list/components/history/JobOrdersTab.tsx
"use client";

import * as React from "react";
import type { VehicleRow } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PartsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`psk-${i}`}>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PartsTab({ vehicle }: { vehicle: VehicleRow }) {
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

  if (loading) return <PartsSkeleton rows={3} />;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm font-semibold">Parts</div>
        <div className="mt-2 text-sm text-muted-foreground">
          No parts records yet. This will populate once parts tables are available.
        </div>
      </CardContent>
    </Card>
  );
}
