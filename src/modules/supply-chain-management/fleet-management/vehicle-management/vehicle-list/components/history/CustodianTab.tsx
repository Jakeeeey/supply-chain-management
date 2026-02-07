//src/modules/vehicle-management/vehicle-list/components/history/CustodianTab.tsx
"use client";

import * as React from "react";
import type { VehicleRow } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CustodianSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`csk-${i}`}>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2 md:text-right">
                <Skeleton className="ml-auto h-3 w-16" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CustodianTab({ vehicle }: { vehicle: VehicleRow }) {
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

  if (loading) return <CustodianSkeleton rows={2} />;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm font-semibold">Custodian</div>
        <div className="mt-2 text-sm text-muted-foreground">
          No custodian history yet. This will populate once custodian tables are available.
        </div>
      </CardContent>
    </Card>
  );
}
