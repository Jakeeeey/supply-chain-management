'use client';

import React from 'react';
import { Clock, Hash, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScanLog {
  serialNumber: string;
  productName?: string;
  status: 'SUCCESS' | 'ERROR';
  errorType?: string;
  timestamp: number;
}

interface ReceiveAuditLogProps {
  recentScans: ScanLog[];
}

export function ReceiveAuditLog({ recentScans }: ReceiveAuditLogProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-muted/10 min-h-0">
      <div className="flex items-center justify-between border-b border-border bg-background/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold">Audit Log</span>
        </div>
        <Badge variant="secondary" className="rounded-md text-[10px]">
          {recentScans.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-3">
          {recentScans.length === 0 ? (
            <div className="flex select-none flex-col items-center justify-center gap-2 py-20 text-center opacity-20">
              <Hash className="h-10 w-10" />
              <p className="text-[10px] font-semibold uppercase tracking-widest">
                No recent activity
              </p>
            </div>
          ) : (
            recentScans.map((scan, idx) => (
              <div
                key={scan.timestamp + idx}
                className={cn(
                  'animate-in slide-in-from-right-4 rounded-xl border p-3.5 transition-all duration-300',
                  scan.status === 'SUCCESS'
                    ? 'border-emerald-500/20 bg-background shadow-sm'
                    : 'border-destructive/20 bg-destructive/5',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-foreground">
                    {scan.serialNumber}
                  </span>
                  {scan.status === 'SUCCESS' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
                <p className="line-clamp-1 text-[10px] font-medium text-muted-foreground">
                  {scan.productName || scan.errorType}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
