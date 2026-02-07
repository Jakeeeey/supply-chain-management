"use client";

import * as React from "react";
import type { PendingInvoiceKpis } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { money } from "../utils/money";

function ChartCardSkeleton({ title }: { title: string }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <div className="h-full w-full flex flex-col items-center justify-center gap-4">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="w-full max-w-sm space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarCardSkeleton({ title }: { title: string }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] flex flex-col justify-between">
        <div className="h-[240px] w-full flex items-end gap-6 px-6">
          <Skeleton className="h-[90px] w-14 rounded-md" />
          <Skeleton className="h-[140px] w-14 rounded-md" />
          <Skeleton className="h-[110px] w-14 rounded-md" />
          <Skeleton className="h-[170px] w-14 rounded-md" />
        </div>
        <div className="mt-2 text-right text-xs text-slate-500 border-t pt-2">
          <span>Total Amount:</span>{" "}
          <Skeleton className="inline-block h-5 w-28 align-middle ml-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusCharts({
  kpis,
  loading = false,
}: {
  kpis?: PendingInvoiceKpis;
  loading?: boolean;
}) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartCardSkeleton title="Pending Invoice Status Distribution" />
        <BarCardSkeleton title="Pending Invoice Volume by Status" />
      </div>
    );
  }

  const COLORS = ["#d32525", "#1d4ed8", "#f59e0b", "#22c55e"];

  const pieData = [
    { name: "Unlinked", value: kpis.by_status.Unlinked.count, fill: COLORS[0] },
    { name: "For Dispatch", value: kpis.by_status["For Dispatch"].count, fill: COLORS[2] },
    { name: "Inbound", value: kpis.by_status.Inbound.count, fill: COLORS[1] },
    { name: "Cleared", value: kpis.by_status.Cleared.count, fill: COLORS[3] },
  ];

  const barData = [
    { name: "Unlinked", amount: kpis.by_status.Unlinked.amount, fill: COLORS[0] },
    { name: "For Dispatch", amount: kpis.by_status["For Dispatch"].amount, fill: COLORS[2] },
    { name: "Inbound", amount: kpis.by_status.Inbound.amount, fill: COLORS[1] },
    { name: "Cleared", amount: kpis.by_status.Cleared.amount, fill: COLORS[3] },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pending Invoice Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={60} outerRadius={80}>
                {pieData.map((entry, index) => (
                  <Cell key={`pie-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, "Invoices"]} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pending Invoice Volume by Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col justify-between">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                />
                <Tooltip cursor={{ fill: "transparent" }} formatter={(v: any) => money(Number(v))} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={50}>
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-right text-xs text-slate-500 border-t pt-2">
            Total Amount: <span className="font-bold text-slate-900 text-sm ml-1">{money(kpis.total_amount)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
