"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function PartsTab() {
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
