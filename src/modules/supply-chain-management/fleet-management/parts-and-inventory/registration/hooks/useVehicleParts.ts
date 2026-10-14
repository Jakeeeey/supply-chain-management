import * as React from "react";
import type {
  CreateClassificationInput,
  CreateVehiclePartInput,
  UpdateVehiclePartInput,
  VehiclePart,
  VehiclePartClassification,
} from "../types";
import {
  createClassification,
  createVehiclePart,
  deleteVehiclePart,
  fetchClassifications,
  fetchVehicleParts,
  updateVehiclePart,
} from "../provider/fetchProviders";

export function useVehicleParts() {
  const [parts, setParts] = React.useState<VehiclePart[]>([]);
  const [classifications, setClassifications] = React.useState<VehiclePartClassification[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState<string>("");
  const [classificationFilter, setClassificationFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [partsData, classData] = await Promise.all([
        fetchVehicleParts({
          search,
          classification_id: classificationFilter,
          status: statusFilter,
        }),
        fetchClassifications(),
      ]);
      setParts(partsData);
      setClassifications(classData);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Error loading parts and classifications");
    } finally {
      setLoading(false);
    }
  }, [search, classificationFilter, statusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddClassification = async (input: CreateClassificationInput) => {
    try {
      setSaving(true);
      const newClass = await createClassification(input);
      setClassifications((prev) => [...prev, newClass]);
      return newClass;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to add classification");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAddPart = async (input: CreateVehiclePartInput) => {
    try {
      setSaving(true);
      await createVehiclePart(input);
      await loadData();
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to add part");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleEditPart = async (id: number, input: UpdateVehiclePartInput) => {
    try {
      setSaving(true);
      await updateVehiclePart(id, input);
      await loadData();
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to update part");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePart = async (id: number) => {
    try {
      setSaving(true);
      await deleteVehiclePart(id);
      await loadData();
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to delete part");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
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
    reload: loadData,
    addClassification: handleAddClassification,
    addPart: handleAddPart,
    editPart: handleEditPart,
    deletePart: handleDeletePart,
  };
}
