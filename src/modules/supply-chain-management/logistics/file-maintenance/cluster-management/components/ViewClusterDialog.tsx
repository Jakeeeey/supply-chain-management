"use client";

import { useMemo } from "react";
import { MapPin, Wallet } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ClusterWithAreas } from "../types";

// =============================================================================
// PROPS
// =============================================================================

interface ViewClusterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: ClusterWithAreas | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ViewClusterDialog({
  open,
  onOpenChange,
  cluster,
}: ViewClusterDialogProps) {
  const coaBudgets = cluster?.coa_budgets;
  const totalAllocatedBudget = useMemo(() => {
    return (coaBudgets || []).reduce(
      (sum, b) => sum + (Number(b.budget) || 0),
      0
    );
  }, [coaBudgets]);

  if (!cluster) return null;

  const areasCount = cluster.areas?.length || 0;
  const budgetsCount = cluster.coa_budgets?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>View Cluster Details</DialogTitle>
          <DialogDescription>
            Detailed information, geographic areas, and budget allocations for this cluster.
          </DialogDescription>
        </DialogHeader>

        {/* ── Top Header Info ──────────────────────────────────────────────── */}
        <div className="rounded-lg border bg-muted/30 p-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cluster Name
              </p>
              <p className="text-base font-semibold text-foreground mt-1">
                {cluster.cluster_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Minimum Amount
              </p>
              <p className="text-base font-semibold tabular-nums text-foreground mt-1">
                PHP{" "}
                {Number(cluster.minimum_amount).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs Navigation & Content ────────────────────────────────────── */}
        <Tabs defaultValue="areas" className="flex-1 min-h-0 flex flex-col mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="areas" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Associated Areas</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {areasCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>COA Budgets</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {budgetsCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Areas */}
          <TabsContent value="areas" className="flex-1 min-h-0 overflow-y-auto mt-3">
            {cluster.areas && cluster.areas.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Province</TableHead>
                      <TableHead>City / Municipality</TableHead>
                      <TableHead>Barangay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cluster.areas.map((area, idx) => (
                      <TableRow key={area.id ?? idx}>
                        <TableCell className="font-medium text-sm">
                          {area.province || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {area.city || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {area.baranggay || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                No areas defined for this cluster.
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Budgets */}
          <TabsContent value="budgets" className="flex-1 min-h-0 overflow-y-auto mt-3 space-y-3">
            {cluster.coa_budgets && cluster.coa_budgets.length > 0 ? (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[140px]">GL Code</TableHead>
                        <TableHead>Account Title</TableHead>
                        <TableHead className="w-[180px] text-right">Budget (PHP)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cluster.coa_budgets.map((b, idx) => (
                        <TableRow key={b.id ?? idx}>
                          <TableCell className="font-mono text-xs text-muted-foreground font-medium">
                            {b.gl_code || "-"}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {b.account_title || `COA #${b.coa_id}`}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-sm">
                            {Number(b.budget).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Total Summary Banner in Budgets Tab */}
                <div className="rounded-lg bg-muted/60 p-3 flex items-center justify-between text-sm border">
                  <span className="text-muted-foreground font-medium">
                    Total Allocated Budget:
                  </span>
                  <span className="font-semibold tabular-nums text-foreground text-base">
                    PHP{" "}
                    {totalAllocatedBudget.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                No Chart of Account budgets allocated for this cluster.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
