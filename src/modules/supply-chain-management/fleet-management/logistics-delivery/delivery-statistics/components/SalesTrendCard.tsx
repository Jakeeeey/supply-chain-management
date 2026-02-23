"use client"

import * as React from "react"
import type { ChartEntry } from "../types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

export function SalesTrendCard(props: { loading: boolean; chartData: ChartEntry[] }) {
  return (
    <Card className="border bg-card shadow-sm dark:border-white/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Sales Revenue Trend</CardTitle>
      </CardHeader>

      <CardContent className="pt-3">
        {props.loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ChartContainer
            className="h-[300px]"
            config={{
              sales: { label: "Net Sales", color: "#3b82f6" },
            }}
          >
            <BarChart data={props.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₱${(Number(value) / 1000).toFixed(0)}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
