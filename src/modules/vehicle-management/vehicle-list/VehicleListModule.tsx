"use client";

import * as React from "react";
import type { VehicleRow } from "./types";

import { useVehicles } from "./hooks/useVehicles";
import { VehicleListToolbar } from "./components/VehicleListToolbar";
import { VehiclesTable } from "./components/VehiclesTable";
import { AddVehicleDialog } from "./components/AddVehicleDialog";
import { VehicleHistoryDialog } from "./components/VehicleHistoryDialog";

export default function VehicleListModule() {
  const { loading, saving, query, setQuery, rows, addVehicle, typeMap, fuelMap, engineMap } =
    useVehicles();

  const [openAdd, setOpenAdd] = React.useState(false);
  const [openHistory, setOpenHistory] = React.useState(false);
  const [selected, setSelected] = React.useState<VehicleRow | null>(null);

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
        onAdd={() => setOpenAdd(true)}
      />

      <div className="mt-6">
        <VehiclesTable
          rows={rows}
          loading={loading}
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
