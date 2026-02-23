"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export default function StatCard(props: {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconBgClassName: string;   // e.g. "bg-blue-100"
  iconClassName: string;     // e.g. "text-blue-600"
}) {
  const Icon = props.icon;

  return (
    <Card className="shadow-sm dark:border-white/60">
      {/* Match Image #1: compact height + centered content */}
      <CardContent className="flex h-[88px] items-center justify-between px-6">
        {/* Left text */}
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground leading-none">
            {props.title}
          </div>

          <div className="mt-2 text-3xl font-semibold leading-none text-foreground">
            {props.value}
          </div>
        </div>

        {/* Right icon tile */}
        <div
          className={[
            "flex h-12 w-12 items-center justify-center rounded-xl",
            props.iconBgClassName,
          ].join(" ")}
        >
          <Icon className={["h-6 w-6", props.iconClassName].join(" ")} />
        </div>
      </CardContent>
    </Card>
  );
}
