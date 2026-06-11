"use client";

import React from "react";
import { useStockAdjustmentSummary } from "../hooks/useStockAdjustmentSummary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const COLORS = {
  primary: "#6366f1",
  info: "#0ea5e9",
  purple: "#a855f7"
};

export function ProductSupplierCharts() {
  const { productData, supplierData } = useStockAdjustmentSummary();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Top Products by Value */}
      <Card className="border border-border/40 rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">Top Adjusted Products (by Value)</CardTitle>
          <CardDescription className="text-xs">Products with the highest correction values</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {productData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
              No products adjusted in current selection
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                <XAxis type="number" tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  className="text-[9px] fill-muted-foreground font-bold"
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, "Adjusted Value"]}
                  contentStyle={{ background: "rgba(30, 41, 59, 0.95)", borderRadius: "8px", border: "none" }}
                  itemStyle={{ color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                />
                <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Products by Quantity */}
      <Card className="border border-border/40 rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">Top Adjusted Products (by Qty)</CardTitle>
          <CardDescription className="text-xs">Products with the highest volume of units corrected</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {productData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
              No products adjusted in current selection
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                <XAxis type="number" tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  className="text-[9px] fill-muted-foreground font-bold"
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} units`, "Adjusted Qty"]}
                  contentStyle={{ background: "rgba(30, 41, 59, 0.95)", borderRadius: "8px", border: "none" }}
                  itemStyle={{ color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                />
                <Bar dataKey="quantity" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Suppliers affected */}
      <Card className="lg:col-span-2 border border-border/40 rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">Adjusted Products by Supplier</CardTitle>
          <CardDescription className="text-xs">Supplier items breakdown in stock adjustments</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {supplierData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
              No supplier data associated with these adjustments
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="name" tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <YAxis tickLine={false} className="text-[10px] fill-muted-foreground font-bold" />
                <Tooltip
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, "Adjusted Value"]}
                  contentStyle={{ background: "rgba(30, 41, 59, 0.95)", borderRadius: "8px", border: "none" }}
                  itemStyle={{ color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                />
                <Bar dataKey="value" fill={COLORS.info} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
