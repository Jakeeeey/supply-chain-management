"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PDPMetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isUp: boolean;
  };
  icon: LucideIcon;
  className?: string;
}

export function PDPMetricCard({
  title,
  value,
  trend,
  icon: Icon,
  className,
}: PDPMetricCardProps) {
  return (
    <Card className={cn("overflow-hidden border shadow-sm", className)}>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {value}
          </h3>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  "text-[10px] font-bold flex items-center",
                  trend.isUp ? "text-emerald-500" : "text-destructive",
                )}
              >
                {trend.isUp ? "↑" : "↓"} {trend.value}
              </span>
              <span className="text-[10px] text-muted-foreground">
                from last week
              </span>
            </div>
          )}
        </div>
        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
