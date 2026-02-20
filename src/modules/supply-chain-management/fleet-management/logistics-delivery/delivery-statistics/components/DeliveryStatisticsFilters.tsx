"use client";

import * as React from "react";
import type { FilterType } from "../types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeliveryStatisticsFilters(props: {
  filterType: FilterType;
  setFilterType: (v: FilterType) => void;
  customStartDate: string;
  setCustomStartDate: (v: string) => void;
  customEndDate: string;
  setCustomEndDate: (v: string) => void;
}) {
  const { filterType, setFilterType } = props;

  return (
    <div className="flex items-center gap-2">
      {/* Single pill container like screenshot */}
      <div className="flex h-10 items-center rounded-xl border bg-card px-2 shadow-sm dark:border-white/60">
        <div className="flex items-center gap-2 pr-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-center">
          {(["thisWeek", "thisMonth", "thisYear"] as const).map((t) => {
            const active = filterType === t;
            return (
              <Button
                key={t}
                type="button"
                variant={active ? "secondary" : "ghost"}
                onClick={() => setFilterType(t)}
                className={cn(
                  "h-8 rounded-lg px-3 text-sm font-medium",
                  active
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "thisWeek" ? "This Week" : t === "thisMonth" ? "This Month" : "This Year"}
              </Button>
            );
          })}
        </div>

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Date range (forces custom) */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={props.customStartDate}
            onChange={(e) => {
              props.setCustomStartDate(e.target.value);
              props.setFilterType("custom");
            }}
            className="h-8 w-[150px] rounded-lg text-xs"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="date"
            value={props.customEndDate}
            onChange={(e) => {
              props.setCustomEndDate(e.target.value);
              props.setFilterType("custom");
            }}
            className="h-8 w-[150px] rounded-lg text-xs"
          />
        </div>
      </div>
    </div>
  );
}
