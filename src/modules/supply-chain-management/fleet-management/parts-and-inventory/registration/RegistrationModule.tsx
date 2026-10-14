"use client";

import * as React from "react";
import { useVehicleParts } from "./hooks/useVehicleParts";
import type { CreateClassificationInput, CreateVehiclePartInput, UpdateVehiclePartInput, VehiclePart } from "./types";
import { PartRegistrationToolbar } from "./components/PartRegistrationToolbar";
import { PartsTable } from "./components/PartsTable";
import { PartFormDialog } from "./components/PartFormDialog";
import { DeletePartDialog } from "./components/DeletePartDialog";
import { QuickAddClassificationDialog } from "./components/QuickAddClassificationDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function RegistrationModule() {
  const {
    parts,
    classifications,
    loading,
    saving,
    error,
    search,
    setSearch,
    classificationFilter,
    setClassificationFilter,
    statusFilter,
    setStatusFilter,
    reload,
    addClassification,
    addPart,
    editPart,
    deletePart,
  } = useVehicleParts();

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [addClassificationOpen, setAddClassificationOpen] = React.useState(false);
  const [selectedPart, setSelectedPart] = React.useState<VehiclePart | null>(null);

  const handleOpenAdd = () => {
    setSelectedPart(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (part: VehiclePart) => {
    setSelectedPart(part);
    setFormOpen(true);
  };

  const handleOpenDelete = (part: VehiclePart) => {
    setSelectedPart(part);
    setDeleteOpen(true);
  };

  const handleSave = async (data: CreateVehiclePartInput | UpdateVehiclePartInput) => {
    if (selectedPart) {
      return await editPart(selectedPart.id, data);
    } else {
      return await addPart(data as CreateVehiclePartInput);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPart) return;
    const success = await deletePart(selectedPart.id);
    if (success) {
      setDeleteOpen(false);
      setSelectedPart(null);
    }
  };

  const handleSaveClassification = async (data: CreateClassificationInput) => {
    return await addClassification(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parts Registration & Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Register new parts, set reorder threshold points, and manage classification-based barcodes.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PartRegistrationToolbar
        search={search}
        onSearchChange={setSearch}
        classificationFilter={classificationFilter}
        onClassificationFilterChange={setClassificationFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        classifications={classifications}
        onAddClick={handleOpenAdd}
        onAddClassificationClick={() => setAddClassificationOpen(true)}
        onRefresh={reload}
        loading={loading}
      />

      <PartsTable
        parts={parts}
        classifications={classifications}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      <PartFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        part={selectedPart}
        classifications={classifications}
        saving={saving}
        onSave={handleSave}
        onOpenAddClassification={() => setAddClassificationOpen(true)}
      />

      <QuickAddClassificationDialog
        open={addClassificationOpen}
        onOpenChange={setAddClassificationOpen}
        onSave={handleSaveClassification}
        saving={saving}
      />

      <DeletePartDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        part={selectedPart}
        deleting={saving}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
