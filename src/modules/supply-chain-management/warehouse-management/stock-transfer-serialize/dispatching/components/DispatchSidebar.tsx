'use client';

import React from 'react';
import { Search, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OrderGroup, BranchRow } from '../../../stock-transfer/types/stock-transfer.types';

interface DispatchSidebarProps {
  orderGroups: OrderGroup[];
  selectedOrderNo: string | null;
  setSelectedOrderNo: (no: string) => void;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  getBranchName: (id: number | null) => string;
}

export function DispatchSidebar({
  orderGroups,
  selectedOrderNo,
  setSelectedOrderNo,
  loading,
  searchQuery,
  setSearchQuery,
  loadMore,
  hasMore,
  getBranchName,
}: DispatchSidebarProps) {
  return (
    <aside className="flex w-sm shrink-0 flex-col border-r border-border bg-muted/20 min-h-0">
      {/* Search & Header */}
      <div className="p-4 border-b border-border/50 space-y-3 bg-background/60 backdrop-blur-sm">
        <p className="font-semibold text-muted-foreground">
          Stock Transfer (Serialized)
        </p>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search dispatch no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background border-border/60 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* Shipment list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-1.5">
          {orderGroups.length === 0 && loading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          ) : orderGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 text-center px-4">
              <Truck className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-xs font-medium">No pending transfers found.</p>
            </div>
          ) : (
            <>
              {orderGroups.map((group) => {
                const isSelected = selectedOrderNo === group.orderNo;
                return (
                  <button
                    key={group.orderNo}
                    onClick={() => setSelectedOrderNo(group.orderNo)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border text-sm transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 bg-background hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "font-semibold text-xs truncate",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {group.orderNo}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {typeof group.sourceBranch === 'object' && group.sourceBranch 
                             ? (group.sourceBranch as BranchRow).branch_name 
                             : getBranchName(group.sourceBranch as number | null)}
                          {" · "}
                          <span className="font-semibold">{group.items.length} items</span>
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Badge
                          variant={isSelected ? "default" : "secondary"}
                          className={cn(
                            "text-[9px] font-semibold px-2 py-0 h-4 rounded-full",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {group.status || "Ready"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs font-semibold text-foreground">
                        ₱
                        {Number(group.totalAmount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">
                         {typeof group.targetBranch === 'object' && group.targetBranch 
                              ? (group.targetBranch as BranchRow).branch_name 
                              : getBranchName(group.targetBranch as number | null)}
                      </p>
                    </div>
                  </button>
                );
              })}
              
              {hasMore && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary mt-2" 
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              )}
              
              {!hasMore && orderGroups.length > 0 && (
                <div className="py-4 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/30">End of list</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
