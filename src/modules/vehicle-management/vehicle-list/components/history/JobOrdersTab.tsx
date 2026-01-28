"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function JobOrdersTab() {
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
