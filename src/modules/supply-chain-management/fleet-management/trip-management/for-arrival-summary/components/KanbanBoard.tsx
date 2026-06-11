"use client";

import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import type { DispatchPlanGroup } from "../types/for-arrival-summary.types";
import { DispatchPlanColumnHeader } from "./DispatchPlanColumnHeader";
import { InvoiceCard } from "./InvoiceCard";

interface KanbanBoardProps {
  dispatchPlanGroups: DispatchPlanGroup[];
  loading: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 3 }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex w-[320px] shrink-0 flex-col gap-3"
        >
          <Skeleton className="h-[88px] w-full rounded-md" />
          <Skeleton className="h-[280px] w-full rounded-md" />
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-md border border-border">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No invoices found for arrival
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          There are no dispatch plans with &quot;For Inbound&quot; status.
        </p>
      </div>
    </div>
  );
}

export function KanbanBoard({ dispatchPlanGroups, loading }: KanbanBoardProps) {
  const [isAutoScrolling, setIsAutoScrolling] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const directionRef = React.useRef<1 | -1>(1);
  const animationRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!isAutoScrolling) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const scrollAreaRoot = scrollRef.current;
    if (!scrollAreaRoot) return;

    // Radix UI ScrollArea viewport
    const viewport = scrollAreaRoot.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement;
    
    if (!viewport) return;

    const scrollStep = () => {
      // Check boundaries
      if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1) {
        directionRef.current = -1; // Reverse to left
      } else if (viewport.scrollLeft <= 0) {
        directionRef.current = 1; // Reverse to right
      }

      // Smooth scroll increment (adjust decimal for speed, e.g. 0.5 or 1)
      viewport.scrollLeft += directionRef.current * 0.75;

      animationRef.current = requestAnimationFrame(scrollStep);
    };

    animationRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAutoScrolling]);

  if (loading) return <LoadingSkeleton />;
  if (dispatchPlanGroups.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          variant={isAutoScrolling ? "default" : "outline"}
          size="sm"
          onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          className="h-8 gap-2 text-xs transition-all"
        >
          {isAutoScrolling ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isAutoScrolling ? "Stop Auto-Scroll" : "Start Auto-Scroll"}
        </Button>
      </div>

      <ScrollArea className="w-full border-t border-transparent pt-1" ref={scrollRef}>
        <div className="flex gap-4 pb-4">
        {dispatchPlanGroups.map((group) => (
          <div
            key={group.dispatchDocNo}
            className="flex w-[320px] shrink-0 flex-col gap-3"
          >
            {/* Dispatch Plan Header */}
            <DispatchPlanColumnHeader group={group} />

            {/* Invoice Cards */}
            <div className="flex flex-col gap-3">
              {group.invoices.map((invoice) => (
                <InvoiceCard
                  key={`${invoice.dispatchPlanId}-${invoice.invoiceId}-${invoice.sequence}`}
                  invoice={invoice}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
