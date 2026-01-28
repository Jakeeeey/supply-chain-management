"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function CustodianTab() {
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
