"use client"

import * as React from "react"
import type { ChartEntry, FilterType } from "../types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

export function DeliveryTrendsCard(props: {
  loading: boolean
  chartData: ChartEntry[]
  filterType: FilterType
}) {
  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Delivery Trends</CardTitle>
        <Badge variant="secondary" className="text-xs">
          Grouped by: {props.filterType === "thisYear" ? "Month" : "Day"}
        </Badge>
      </CardHeader>

      <CardContent className="pt-3">
        {props.loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ChartContainer
            className="h-[300px]"
            config={{
              Fulfilled: { label: "Fulfilled", color: "#10b981" },
              "Not Fulfilled": { label: "Not Fulfilled", color: "#f59e0b" },
              "Fulfilled With Concerns": { label: "With Concerns", color: "#facc15" },
              "Fulfilled With Returns": { label: "With Returns", color: "#ef4444" },
            }}
          >
            <BarChart data={props.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
              <YAxis axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend />

              <Bar dataKey="Fulfilled" stackId="a" radius={[0, 0, 4, 4]} fill="#10b981" />
              <Bar dataKey="Not Fulfilled" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Fulfilled With Concerns" stackId="a" fill="#facc15" />
              <Bar dataKey="Fulfilled With Returns" stackId="a" radius={[4, 4, 0, 0]} fill="#ef4444" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
