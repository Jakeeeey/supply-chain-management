import { Skeleton } from "@/components/ui/skeleton";

export function DispatchModalSkeleton() {
  return (
    <div className="flex divide-x divide-border/50 max-h-[70vh]">
      {/* ── Left: PDP List Sidebar ─────────────────────────────── */}
      <div className="w-[320px] shrink-0 flex flex-col">
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-28" />
          </div>
          {/* Search bar */}
          <Skeleton className="h-8 w-full rounded-md" />
        </div>

        {/* Plan cards */}
        <div className="flex-1 overflow-hidden px-4 py-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-border/50 space-y-2"
            >
              {/* Badge + plan number row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              {/* Route + items count */}
              <Skeleton className="h-3 w-36" />
              {/* Amount */}
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Center: Trip Configuration Form ───────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section header */}
        <div className="px-6 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Source Branch + Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>

          {/* Departure (ETOD) + Arrival (ETOA) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>

          {/* Driver + Helper */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>

          {/* Add Additional Helper button */}
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>

      {/* ── Right: Invoice Items Sidebar ──────────────────────── */}
      <div className="w-[320px] shrink-0 flex flex-col">
        {/* Sidebar header */}
        <div className="px-4 pt-5 pb-4 border-b border-border/50 space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-32" />
          </div>
          {/* "X invoices linked" */}
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Invoice cards */}
        <div className="flex-1 overflow-hidden px-4 py-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/50"
            >
              {/* Drag handle */}
              <Skeleton className="h-4 w-2.5 rounded mt-0.5 shrink-0" />

              <div className="flex-1 space-y-1.5 min-w-0">
                {/* Invoice number + badge */}
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                {/* Company name */}
                <Skeleton className="h-3 w-28" />
                {/* Location + amount row */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer — selected route value */}
        <div className="px-4 py-4 border-t border-border/50 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
