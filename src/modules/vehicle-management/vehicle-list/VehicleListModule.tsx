// src/modules/vehicle-management/vehicle-list/VehicleListModule.tsx
"use client";

import * as React from "react";
import type { VehicleRow } from "./types";

import { useVehicles } from "./hooks/useVehicles";
import { VehicleListToolbar } from "./components/VehicleListToolbar";
import { VehiclesTable } from "./components/VehiclesTable";
import { AddVehicleDialog } from "./components/AddVehicleDialog";
import { VehicleHistoryDialog } from "./components/VehicleHistoryDialog";

export default function VehicleListModule() {
  const { loading, saving, error, query, setQuery, rows, addVehicle, typeMap } =
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

  return (
    <div className="w-full p-6">
      <VehicleListToolbar
        query={query}
        onQueryChange={setQuery}
        onAdd={() => setOpenAdd(true)}
      />

      {error ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <div className="rounded-lg border bg-background p-10 text-center text-sm text-muted-foreground">
            Loading vehicles…
          </div>
        ) : (
          <VehiclesTable
            rows={rows}
            onViewHistory={(row) => {
              setSelected(row);
              setOpenHistory(true);
            }}
          />
        )}
      </div>

      <AddVehicleDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        typeOptions={typeOptions}
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
