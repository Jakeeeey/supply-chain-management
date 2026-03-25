"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, MoreHorizontal, Pencil, MapPin, Eye } from "lucide-react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/new-data-table";
import ErrorPage from "@/components/shared/ErrorPage";

import { ClusterWithAreas, AreaItem } from "./types";
import { listClusters } from "./providers/fetchProviders";
import { ClusterDialog } from "./components/ClusterDialog";
import { ViewClusterDialog } from "./components/ViewClusterDialog";

// =============================================================================
// HELPERS
// =============================================================================

/** Format a single area as "Province, City, Barangay" (omitting empty parts) */
function formatArea(area: AreaItem): string {
  return [area.province, area.city, area.baranggay]
    .filter(Boolean)
    .join(", ");
}

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(
  onEdit: (row: ClusterWithAreas) => void,
  onView: (row: ClusterWithAreas) => void,
): ColumnDef<ClusterWithAreas>[] {
  return [
    {
      accessorKey: "cluster_name",
      header: "Cluster Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.cluster_name}</span>
      ),
      meta: { label: "Cluster Name" },
    },
    {
      id: "area",
      header: "Area",
      cell: ({ row }) => {
        const areas = row.original.areas;
        if (!areas?.length) {
          return (
            <span className="text-muted-foreground italic">No areas</span>
          );
        }

        const MAX_VISIBLE = 3;
        const visible = areas.slice(0, MAX_VISIBLE);
        const hidden = areas.length - MAX_VISIBLE;

        return (
          <div className="space-y-0.5">
            {visible.map((area, idx) => (
              <div
                key={area.id ?? idx}
                className="flex items-center gap-1.5 text-sm"
              >
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span>{formatArea(area)}</span>
              </div>
            ))}
            {hidden > 0 && (
              <span className="text-xs text-muted-foreground pl-[18px]">
                +{hidden} more
              </span>
            )}
          </div>
        );
      },
      meta: { label: "Area" },
    },
    {
      accessorKey: "minimum_amount",
      header: "Minimum Amount",
      cell: ({ row }) => {
        const amount = row.original.minimum_amount;
        return (
          <span className="font-medium tabular-nums">
            {Number(amount).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      },
      meta: { label: "Minimum Amount" },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(row.original)}>
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

// =============================================================================
// MODULE
// =============================================================================

export default function ClusterModule() {
  const [data, setData] = useState<ClusterWithAreas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] =
    useState<ClusterWithAreas | null>(null);

  // Cluster name filter
  const [clusterFilter, setClusterFilter] = useState<string>("all");

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listClusters();
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load clusters", err);
      const message = err instanceof Error ? err.message : "Failed to load clusters.";
      setError(message);
      toast.error("Failed to load clusters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEdit = (row: ClusterWithAreas) => {
    setSelectedCluster(row);
    setIsDialogOpen(true);
  };

  const handleView = (row: ClusterWithAreas) => {
    setSelectedCluster(row);
    setIsViewDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCluster(null);
    setIsDialogOpen(true);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const columns = buildColumns(handleEdit, handleView);

  const clusterNames = useMemo(
    () =>
      [...new Set(data.map((c) => c.cluster_name))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [data],
  );

  const filteredData = useMemo(
    () =>
      clusterFilter === "all"
        ? data
        : data.filter((c) => c.cluster_name === clusterFilter),
    [data, clusterFilter],
  );

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Clusters Unreachable"
        message={error}
        reset={fetchData}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="cluster_name"
        isLoading={loading}
        emptyTitle="No clusters found"
        emptyDescription="Create your first cluster to get started."
        actionComponent={
          <div className="flex items-center gap-2">
            <Select
              value={clusterFilter}
              onValueChange={setClusterFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by cluster" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clusters</SelectItem>
                {clusterNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Cluster
            </Button>
          </div>
        }
      />

      <ClusterDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedCluster={selectedCluster}
        onSuccess={fetchData}
      />

      <ViewClusterDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        cluster={selectedCluster}
      />
    </div>
  );
}
