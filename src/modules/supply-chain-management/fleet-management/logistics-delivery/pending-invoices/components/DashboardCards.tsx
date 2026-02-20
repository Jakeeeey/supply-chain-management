"use client";

import * as React from "react";
import type { PendingInvoiceKpis } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Link2, Send, Package, CheckCircle2 } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  accent,
  loading = false,
}: {
  title: string;
  value?: React.ReactNode;
  icon: any;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{title}</div>

          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <div className={`text-3xl font-semibold ${accent ?? ""}`}>{value ?? "-"}</div>
          )}
        </div>

        <div className="rounded-lg border bg-background p-2.5">
          {loading ? <Skeleton className="h-5 w-5 rounded" /> : <Icon className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCards({
  kpis,
  loading = false,
}: {
  kpis?: PendingInvoiceKpis;
  loading?: boolean;
}) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard title="Total Pending Invoices" icon={FileText} accent="text-blue-600" loading />
        <StatCard title="Unlinked" icon={Link2} loading />
        <StatCard title="For Dispatch" icon={Send} accent="text-blue-600" loading />
        <StatCard title="Inbound" icon={Package} accent="text-orange-600" loading />
        <StatCard title="Cleared" icon={CheckCircle2} accent="text-green-600" loading />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <StatCard title="Total Pending Invoices" value={kpis.total_count} icon={FileText} accent="text-blue-600" />
      <StatCard title="Unlinked" value={kpis.by_status.Unlinked.count} icon={Link2} />
      <StatCard title="For Dispatch" value={kpis.by_status["For Dispatch"].count} icon={Send} accent="text-blue-600" />
      <StatCard title="Inbound" value={kpis.by_status.Inbound.count} icon={Package} accent="text-orange-600" />
      <StatCard title="Cleared" value={kpis.by_status.Cleared.count} icon={CheckCircle2} accent="text-green-600" />
    </div>
  );
}
