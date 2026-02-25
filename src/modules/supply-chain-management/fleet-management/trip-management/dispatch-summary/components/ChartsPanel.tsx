"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

export default function ChartsPanel(props: {
  loading: boolean;
  statusChartData: { name: string; value: number; colorKey: "blue" | "purple" | "pink" }[];
  weeklyTrendData: { day: string; dispatches: number }[];
}) {
  const COLORS: Record<string, string> = {
    blue: "#3b82f6",
    purple: "#8b5cf6",
    pink: "#ec4899",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-sm dark:border-white/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <span>📊</span> Active Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px]">
            {props.loading ? (
              <div className="h-full w-full rounded-lg border bg-background p-4 dark:border-white/60">
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Skeleton className="h-40 w-40 rounded-full" />
                  <div className="flex w-full max-w-[360px] flex-wrap items-center justify-center gap-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-sm" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-sm" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-sm" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ) : props.statusChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">No active dispatch data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={props.statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={85}
                    dataKey="value"
                  >
                    {props.statusChartData.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[entry.colorKey]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm dark:border-white/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <span>📈</span> Weekly Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px]">
            {props.loading ? (
              <div className="h-full w-full rounded-lg border bg-background p-4 dark:border-white/60">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>

                  <div className="flex-1 pt-4">
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-3 w-8" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={props.weeklyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="dispatches" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
