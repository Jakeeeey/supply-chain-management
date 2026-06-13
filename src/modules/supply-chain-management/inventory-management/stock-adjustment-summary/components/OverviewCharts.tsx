"use client";

import React from "react";
import { useStockAdjustmentSummary } from "../hooks/useStockAdjustmentSummary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  destructive: "#f43f5e",
  info: "#0ea5e9"
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    fill?: string;
  }>;
  label?: string;
}

// Custom stylish tooltip for charts
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border/60 p-3 rounded-lg shadow-xl text-xs font-semibold">
        <p className="font-bold text-foreground mb-1">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} style={{ color: entry.color || entry.fill }} className="flex justify-between gap-6 py-0.5">
            <span>{entry.name}:</span>
            <span className="font-bold">
              {entry.name.toLowerCase().includes("count") 
                ? entry.value 
                : `₱${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function OverviewCharts() {
  const { trendData, branchData, kpis } = useStockAdjustmentSummary();
  const { totalStockInValue, totalStockOutValue, netImpact, grossValue } = kpis;

  const typeRatioData = [
    { name: "Stock In", value: totalStockInValue, color: COLORS.success },
    { name: "Stock Out", value: totalStockOutValue, color: COLORS.destructive }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Chart 1: Adjustment Trend over Time */}
      <Card className="lg:col-span-2 border border-border/40 rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">Adjustment Trend</CardTitle>
          <CardDescription className="text-xs">Adjusted value by type over time</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {trendData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
              No trend data available for selected filters
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.destructive} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.destructive} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="dateStr" tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <YAxis tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" className="text-xs font-semibold" />
                <Area
                  type="monotone"
                  name="Stock In Value"
                  dataKey="inValue"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIn)"
                />
                <Area
                  type="monotone"
                  name="Stock Out Value"
                  dataKey="outValue"
                  stroke={COLORS.destructive}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOut)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Stock In vs Out Ratio */}
      <Card className="border border-border/40 rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">Stock Value Ratio</CardTitle>
          <CardDescription className="text-xs">Inflow vs outflow percentage ratio</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex flex-col justify-between items-center p-6">
          {grossValue === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
              No ratio data available
            </div>
          ) : (
            <>
              <div className="w-full h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeRatioData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeRatioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                        "Total"
                      ]}
                      contentStyle={{ background: "rgba(30, 41, 59, 0.95)", borderRadius: "8px", border: "none" }}
                      itemStyle={{ color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Net Impact</span>
                  <span className={`text-sm font-black ${netImpact >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {netImpact >= 0 ? "+" : ""}
                    {((netImpact / (grossValue || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {/* Legend breakdown */}
              <div className="w-full space-y-2">
                {typeRatioData.map((entry, i) => {
                  const percent = ((entry.value / (grossValue || 1)) * 100).toFixed(1);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-foreground">{percent}%</span>
                        <span className="text-muted-foreground/60 w-16 text-right">
                          ₱{entry.value > 1000 ? `${(entry.value / 1000).toFixed(0)}k` : entry.value.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Chart 3: Branch Breakdown */}
      <Card className="lg:col-span-3 border border-border/40 rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">Adjustments by Branch Location</CardTitle>
          <CardDescription className="text-xs">Adjustment value comparison across warehouses/stores</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {branchData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
              No branch comparison data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="name" tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <YAxis tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" className="text-xs font-semibold" />
                <Bar name="Stock In Value" dataKey="inValue" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar name="Stock Out Value" dataKey="outValue" fill={COLORS.destructive} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
