import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

export function BarcodeScannerSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center justify-between bg-card border rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto flex-1">
          <div className="flex flex-col gap-2 w-full sm:w-62.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-50">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-87.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-50">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {/* Fake Table Header */}
            <div className="flex items-center h-12 bg-muted/50 border-b px-4 gap-4">
              <Skeleton className="h-4 w-32.5" />
              <Skeleton className="h-4 w-45" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-25" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>

            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center h-14 border-b px-4 gap-4"
              >
                <Skeleton className="h-5 w-25" />
                <Skeleton className="h-4 w-37.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[80%]" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-8 w-17.5 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Skeleton className="h-9 w-75" />
        </CardFooter>
      </Card>
    </div>
  );
}
