"use client";

import * as React from "react";
import type { VehicleRow } from "../../types";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function JobOrdersSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`josk-${i}`}>
          <CardContent className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function JobOrdersTab({ vehicle }: { vehicle: VehicleRow }) {
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

  if (loading) return <JobOrdersSkeleton rows={2} />;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm font-semibold">Job Orders</div>
        <div className="mt-2 text-sm text-muted-foreground">
          No job orders yet. This will populate once job order tables are available.
        </div>
      </CardContent>
    </Card>
  );
}
