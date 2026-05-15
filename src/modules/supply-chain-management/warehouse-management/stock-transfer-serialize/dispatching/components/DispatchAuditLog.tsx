'use client';

import React from 'react';
import { Clock, Hash, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScanLog {
  serialNumber: string;
  productName?: string;
  status: 'SUCCESS' | 'ERROR';
  errorType?: string;
  timestamp: number;
}

interface DispatchAuditLogProps {
  recentScans: ScanLog[];
}

export function DispatchAuditLog({ recentScans }: DispatchAuditLogProps) {
  return (
    <aside className="flex min-h-0 w-64 shrink-0 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Audit Log</span>
        </div>
        {recentScans.length > 0 && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {recentScans.length}
          </span>
        )}
      </div>

      {/* Feed */}
      <ScrollArea className="min-h-0 flex-1">
        {recentScans.length === 0 ? (
          <div className="flex select-none flex-col items-center justify-center gap-2 py-16 text-center">
            <Hash className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30">
              No activity yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentScans.map((scan, idx) => (
              <div
                key={scan.timestamp + idx}
                className={cn(
                  'flex items-start gap-2.5 px-4 py-2.5 animate-in slide-in-from-top-1 duration-200',
                  scan.status === 'ERROR' && 'bg-destructive/5',
                )}
              >
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {scan.status === 'SUCCESS' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold leading-none text-foreground">
                    {scan.serialNumber}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {scan.productName || scan.errorType || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}