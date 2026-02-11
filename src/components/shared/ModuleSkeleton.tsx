"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  hasActions?: boolean;
  hasTabs?: boolean;
}

export function ModuleSkeleton({ 
  rowCount = 5, 
  columnCount = 6, 
  hasActions = true,
  hasTabs = false
}: ModuleSkeletonProps) {
  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      {/* <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64 rounded-xl" />
        {hasActions && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        )}
      </div> */}

      {hasTabs && (
        <div className="flex gap-4 border-b border-border pb-px">
          <Skeleton className="h-10 w-32 rounded-t-lg" />
          <Skeleton className="h-10 w-32 rounded-t-lg" />
        </div>
      )}

      {/* Table Top Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-11 w-full max-w-sm rounded-xl" />
          <Skeleton className="h-11 w-24 ml-auto rounded-xl" />
        </div>

        {/* Table Structure */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="h-14 bg-muted/5 border-b flex items-center px-6 gap-4">
            {Array.from({ length: columnCount }).map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i === 0 ? 'w-40' : 'w-24'}`} />
            ))}
          </div>
          
          {/* Table Rows */}
          <div className="divide-y divide-border/50">
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div key={rowIndex} className="h-[72px] flex items-center px-6 gap-4">
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <Skeleton 
                    key={colIndex} 
                    className={`h-4 ${
                      colIndex === 0 ? 'w-48' : 
                      colIndex === columnCount - 1 ? 'w-8 ml-auto' : 
                      'w-24'
                    } rounded-md`} 
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between px-2 pt-2">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-6">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
