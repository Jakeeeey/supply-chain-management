"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function TripsTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm font-semibold">Trips</div>
        <div className="mt-2 text-sm text-muted-foreground">
          No trips recorded yet. This will populate once trips tables are available.
        </div>
      </CardContent>
    </Card>
  );
}
