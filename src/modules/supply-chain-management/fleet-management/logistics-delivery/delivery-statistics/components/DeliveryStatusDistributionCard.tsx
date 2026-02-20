"use client"

import * as React from "react"
import type { DeliveryStatusCount } from "../types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

import { PieChart, Pie, Cell } from "recharts"

const COLORS = ["#10b981", "#f59e0b", "#facc15", "#ef4444"]

export function DeliveryStatusDistributionCard(props: {
  loading: boolean
  counts: DeliveryStatusCount[]
}) {
  return (
    <Card className="border bg-card shadow-sm dark:border-white/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
      </CardHeader>

      <CardContent className="pt-3">
        {props.loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : props.counts.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No Data
          </div>
        ) : (
          <>
            <ChartContainer
              className="h-[300px]"
              config={{
                Fulfilled: { label: "Fulfilled", color: COLORS[0] },
                "Not Fulfilled": { label: "Not Fulfilled", color: COLORS[1] },
                "Fulfilled With Concerns": { label: "With Concerns", color: COLORS[2] },
                "Fulfilled With Returns": { label: "With Returns", color: COLORS[3] },
              }}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={props.counts}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {props.counts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {props.counts.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                  <span className="text-sm text-muted-foreground/70">({item.value})</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
