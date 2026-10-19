"use client";

import * as React from "react";
import { Truck, Users, Wrench, Navigation, ArrowUpRight, IdCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardCardType, DashboardSummary } from "../types";
import { cn } from "@/lib/utils";

interface FleetDashboardCardsProps {
  summary?: DashboardSummary;
  loading?: boolean;
  activeCard: DashboardCardType;
  onSelectCard: (card: DashboardCardType) => void;
}

export function FleetDashboardCards({
  summary,
  loading,
  activeCard,
  onSelectCard,
}: FleetDashboardCardsProps) {
  const cards: Array<{
    id: DashboardCardType;
    title: string;
    description: string;
    source: string;
    count: number;
    icon: React.ElementType;
    color: string;
    borderActive: string;
    bgAccent: string;
    badgeText?: string;
  }> = [
    {
      id: "vehicles",
      title: "Total Vehicle",
      description: "Total number of vehicles",
      source: "Vehicle Management",
      count: summary?.totalVehicles ?? 0,
      icon: Truck,
      color: "text-blue-600 dark:text-blue-400",
      borderActive: "border-blue-500 ring-2 ring-blue-500/20",
      bgAccent: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      id: "drivers",
      title: "Total Driver",
      description: "Total number of drivers",
      source: "Driver Management",
      count: summary?.totalDrivers ?? 0,
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      borderActive: "border-emerald-500 ring-2 ring-emerald-500/20",
      bgAccent: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      id: "licenses",
      title: "Expiring Licenses",
      description: "Licenses expiring soon (<= 30d) or expired",
      source: "Driver / License Records",
      count: summary?.expiringLicenses ?? 0,
      icon: IdCard,
      color: "text-rose-600 dark:text-rose-400",
      borderActive: "border-rose-500 ring-2 ring-rose-500/20",
      bgAccent: "bg-rose-50 dark:bg-rose-950/40",
      badgeText: summary?.totalLicenses ? `of ${summary.totalLicenses} Total` : undefined,
    },
    {
      id: "jo_pendings",
      title: "JO Pendings",
      description: "Job orders that are still pending",
      source: "Vehicle Maintenance / JO",
      count: summary?.joPendings ?? 0,
      icon: Wrench,
      color: "text-amber-600 dark:text-amber-400",
      borderActive: "border-amber-500 ring-2 ring-amber-500/20",
      bgAccent: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      id: "outside",
      title: "Vehicles Outside Company",
      description: "Vehicles currently on trip",
      source: "Dispatch / Trip Summary",
      count: summary?.vehiclesOutside ?? 0,
      icon: Navigation,
      color: "text-purple-600 dark:text-purple-400",
      borderActive: "border-purple-500 ring-2 ring-purple-500/20",
      bgAccent: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeCard === card.id;

        return (
          <Card
            key={card.id}
            onClick={() => onSelectCard(card.id)}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            className={cn(
              "group relative cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
              isSelected
                ? card.borderActive + " bg-card shadow-sm"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {card.title}
                    </p>
                    {card.badgeText && !loading && (
                      <span className="text-[10px] font-medium text-muted-foreground/80 bg-muted px-1.5 py-0.2 rounded">
                        {card.badgeText}
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 my-1" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {card.count.toLocaleString()}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                    card.bgAccent,
                    card.color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span className="truncate max-w-[160px]" title={card.description}>
                  {card.description}
                </span>
                <span className="flex items-center gap-0.5 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
