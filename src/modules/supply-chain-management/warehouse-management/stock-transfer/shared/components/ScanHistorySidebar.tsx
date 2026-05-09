'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Radar, Package, Hash, Clock, CheckCircle2, Loader2, XCircle, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanLog, OrderGroup } from '../../types/stock-transfer.types';

interface ScanHistorySidebarProps {
  scans: ScanLog[];
  isScanning: boolean;
  selectedGroup: OrderGroup | null;
  buffer?: string;
  isThrottled?: boolean;
  onClear?: () => void;
}

export function ScanHistorySidebar({ scans, isScanning, selectedGroup, buffer, isThrottled, onClear }: ScanHistorySidebarProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'success' | 'error'>('all');

  const filteredScans = React.useMemo(() => {
    return scans.filter(scan => {
      // Status filter
      if (filterStatus === 'success' && scan.status !== 'SUCCESS') return false;
      if (filterStatus === 'error' && scan.status !== 'ERROR') return false;
      
      // Text search
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (scan.productName || '').toLowerCase().includes(term) ||
        scan.rfid.toLowerCase().includes(term) ||
        (scan.errorType || '').toLowerCase().includes(term)
      );
    });
  }, [scans, searchTerm, filterStatus]);

  return (
    <Card className="h-[calc(100vh-12rem)] min-h-[500px] flex flex-col border-border shadow-2xl bg-card secondary backdrop-blur-sm overflow-hidden sticky top-24 text-foreground w-full">
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radar className={cn("w-4 h-4", isScanning ? "text-emerald-500 animate-pulse" : "text-muted-foreground")} />
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Scan History</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClear}
              className="text-[9px] uppercase font-bold text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              Clear All
            </button>
            <Badge variant="outline" className="text-[10px] bg-background">
              {scans.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {!selectedGroup ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-40 h-full">
            <div className="p-4 rounded-full bg-muted">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Select an order to begin scanning
            </p>
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
            <div className="relative">
              <Radar className="w-12 h-12 text-emerald-500/20 animate-ping absolute inset-0" />
              <Radar className="w-12 h-12 text-emerald-500/30" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Awaiting Hardware</p>
              <p className="text-[10px] text-muted-foreground">Scan items using your RFID reader</p>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Filter Bar */}
            <div className="px-4 pt-3 pb-2 space-y-2 border-b border-border/30 shrink-0">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search scans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-7 pl-7 pr-3 text-[11px] rounded-md border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'success', 'error'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full transition-colors",
                      filterStatus === status
                        ? status === 'error' ? 'bg-destructive/20 text-destructive' : status === 'success' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

          <ScrollArea className="flex-1 w-full h-full">
            <div className="p-4 space-y-3 pb-12">
              {/* LIVE BUFFER & PROCESSING INDICATOR */}
              {(buffer || isScanning || isThrottled) && (
                <div className={cn(
                  "p-3 rounded-lg border relative overflow-hidden shrink-0",
                  isThrottled
                    ? "border-destructive/50 bg-destructive/10 animate-shake"
                    : "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] group"
                )}>
                  <div className="flex items-center justify-between h-4 mb-2">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest flex items-center gap-2",
                      isThrottled ? "text-destructive" : "text-emerald-600"
                    )}>
                      {isThrottled ? (
                        <AlertCircle className="w-3 h-3 shrink-0" />
                      ) : (
                        <Radar className="w-3 h-3 shrink-0 animate-pulse" />
                      )}
                      <span className="truncate">
                        {isThrottled ? 'Tagging Cooldown' : isScanning ? 'Syncing...' : 'Incoming Data'}
                      </span>
                    </span>
                    {isScanning && !isThrottled && <Loader2 className="w-3 h-3 shrink-0 animate-spin text-emerald-500" />}
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-2 font-mono text-sm font-bold truncate h-6",
                    isThrottled ? "text-destructive" : "text-emerald-700"
                  )}>
                    {isThrottled ? 'Please wait before scanning' : buffer || 'Preparing match...'}
                  </div>

                  {!isThrottled && (
                    <div className="absolute bottom-0 left-0 h-[2px] bg-emerald-500 animate-[loading-bar_1.5s_infinite_ease-in-out]" style={{ width: '100%' }} />
                  )}
                </div>
              )}

              {filteredScans.length === 0 && searchTerm.trim() ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-50">
                  <Search className="w-6 h-6 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground font-medium">No scans match &ldquo;{searchTerm}&rdquo;</p>
                </div>
              ) : null}

              {filteredScans.map((scan, index) => {
                const isNewest = index === 0;
                const isError = scan.status === 'ERROR';
                
                return (
                  <div
                    key={`${scan.rfid}-${scan.timestamp}-${index}`}
                    className={cn(
                      "group relative flex flex-col p-3 rounded-lg border transition-all duration-300 overflow-hidden",
                      isError 
                        ? "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
                        : isNewest 
                          ? "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                          : "bg-background border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                        <p className={cn(
                          "text-xs font-bold leading-tight break-words group-hover:text-primary transition-colors",
                          isError && "text-destructive"
                        )}>
                          {scan.productName}
                        </p>
                        {isError && (
                          <Badge variant="destructive" className="h-4 px-1 text-[8px] uppercase tracking-tighter shrink-0">
                            {scan.errorType}
                          </Badge>
                        )}
                        <div className="flex items-start gap-1.5 text-[10px] font-mono text-muted-foreground min-w-0">
                          <Hash className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="break-all leading-tight group-hover:text-foreground transition-colors">
                            {scan.rfid}
                          </span>
                        </div>
                      </div>
                      {isError ? (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      ) : (
                        isNewest && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 opacity-50 text-[9px] uppercase font-bold tracking-tighter">
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      {!isError && isNewest && <span className="text-emerald-600 animate-pulse">Just Scanned</span>}
                      {isError && <span className="text-destructive">Action Failed</span>}
                    </div>
                  </div>
                );
              })}
              <div className="h-20" /> {/* Extra scroll space to prevent cutoff */}
            </div>
          </ScrollArea>
          </>
        )}
      </CardContent>

      {selectedGroup && (
        <div className="p-4 border-t border-border/50 bg-muted/10">
          <div className={cn(
            "p-2 rounded flex items-center gap-2 transition-colors",
            isScanning ? "bg-emerald-500/10" : "bg-muted/50"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isScanning ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
            )} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {isScanning ? 'Processing RFID...' : 'Ready for Next Item'}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
