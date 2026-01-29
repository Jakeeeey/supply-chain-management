//src/modules/vehicle-management/vehicle-list/components/history/DriversTab.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function DriversTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm font-semibold">Drivers</div>
        <div className="mt-2 text-sm text-muted-foreground">
          No driver history yet. This will populate once driver history tables are available.
        </div>
      </CardContent>
    </Card>
  );
}
