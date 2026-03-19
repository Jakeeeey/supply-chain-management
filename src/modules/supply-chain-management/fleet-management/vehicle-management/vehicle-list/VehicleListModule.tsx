//src/modules/vehicle-management/vehicle-list/PostingOfProductsModule.tsx
"use client";

import * as React from "react";
import type { VehicleRow } from "./types";

import { useVehicles } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/hooks/useVehicles";
import { VehicleListToolbar } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/VehicleListToolbar";
import { VehiclesTable } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/VehiclesTable";
import { AddVehicleDialog } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/AddVehicleDialog";
import { VehicleHistoryDialog } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/VehicleHistoryDialog";

export default function VehicleListModule() {
  const { loading, saving, query, setQuery, rows, addVehicle, typeMap, fuelMap, engineMap } =
    useVehicles();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [openAdd, setOpenAdd] = React.useState(false);
  const [openHistory, setOpenHistory] = React.useState(false);
  const [selected, setSelected] = React.useState<VehicleRow | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Reset to first page when query or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  const totalPages = Math.ceil(rows.length / pageSize);

  const filteredByStatus = React.useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
  }, [rows, statusFilter]);

  const totalPagesFiltered = Math.ceil(filteredByStatus.length / pageSize);

  const paginatedRows = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredByStatus.slice(start, start + pageSize);
  }, [filteredByStatus, currentPage, pageSize]);

  const typeOptions = React.useMemo(() => {
    const opts: Array<{ id: number; name: string }> = [];
    for (const [id, name] of typeMap.entries()) {
      const label = String(name || "").trim();
      opts.push({ id, name: label.length ? label : `Type #${id}` });
    }
    opts.sort((a, b) => a.name.localeCompare(b.name));
    return opts;
  }, [typeMap]);

  const fuelOptions = React.useMemo(() => {
    const opts: Array<{ id: number; name: string }> = [];
    for (const [id, name] of fuelMap.entries()) {
      const label = String(name || "").trim();
      opts.push({ id, name: label.length ? label : `Fuel #${id}` });
    }
    opts.sort((a, b) => a.name.localeCompare(b.name));
    return opts;
  }, [fuelMap]);

  const engineOptions = React.useMemo(() => {
    const opts: Array<{ id: number; name: string }> = [];
    for (const [id, name] of engineMap.entries()) {
      const label = String(name || "").trim();
      opts.push({ id, name: label.length ? label : `Engine #${id}` });
    }
    opts.sort((a, b) => a.name.localeCompare(b.name));
    return opts;
  }, [engineMap]);

  return (
    <div className="w-full p-4 sm:p-6">
      <VehicleListToolbar
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAdd={() => setOpenAdd(true)}
      />

      <div className="mt-6">
        <VehiclesTable
          rows={paginatedRows}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPagesFiltered}
          onPageChange={setCurrentPage}
          onViewHistory={(row) => {
            setSelected(row);
            setOpenHistory(true);
          }}
        />
      </div>

      <AddVehicleDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        typeOptions={typeOptions}
        fuelOptions={fuelOptions}
        engineOptions={engineOptions}
        saving={saving}
        onCreate={addVehicle}
      />

      <VehicleHistoryDialog
        open={openHistory}
        onOpenChange={setOpenHistory}
        vehicle={selected}
      />
    </div>
  );
}
