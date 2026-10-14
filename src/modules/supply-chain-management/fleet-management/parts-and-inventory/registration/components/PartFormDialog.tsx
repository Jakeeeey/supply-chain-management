"use client";

import * as React from "react";
import type {
  CreateVehiclePartInput,
  UpdateVehiclePartInput,
  VehiclePart,
  VehiclePartClassification,
} from "../types";
import { generateNumericBarcode } from "../utils/barcodeGenerator";
import { SearchableClassificationSelect } from "./SearchableClassificationSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Barcode, Sparkles, Plus, Info } from "lucide-react";

interface PartFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: VehiclePart | null;
  classifications: VehiclePartClassification[];
  saving: boolean;
  onSave: (data: CreateVehiclePartInput | UpdateVehiclePartInput) => Promise<boolean>;
  onOpenAddClassification: () => void;
}

interface FormErrors {
  partCode?: string;
  partName?: string;
  classificationId?: string;
  unit?: string;
  unitCost?: string;
  reorderPoint?: string;
  barcode?: string;
}

export function PartFormDialog({
  open,
  onOpenChange,
  part,
  classifications,
  saving,
  onSave,
  onOpenAddClassification,
}: PartFormDialogProps) {
  const isEditing = Boolean(part);

  const [partCode, setPartCode] = React.useState("");
  const [partName, setPartName] = React.useState("");
  const [classificationId, setClassificationId] = React.useState<string>("");
  const [useCustomBarcode, setUseCustomBarcode] = React.useState(false);
  const [customBarcode, setCustomBarcode] = React.useState("");
  const [unit, setUnit] = React.useState("pc");
  const [description, setDescription] = React.useState("");
  const [reorderPoint, setReorderPoint] = React.useState("10");
  const [unitCost, setUnitCost] = React.useState("0");
  const [isActive, setIsActive] = React.useState(true);

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitted, setSubmitted] = React.useState(false);

  const selectedClassification = React.useMemo(() => {
    if (!classificationId) return null;
    return classifications.find((c) => String(c.id) === String(classificationId)) || null;
  }, [classificationId, classifications]);

  React.useEffect(() => {
    if (open) {
      setSubmitted(false);
      setErrors({});
      if (part) {
        setPartCode(part.part_code || "");
        setPartName(part.part_name || "");
        setClassificationId(part.classification_id ? String(part.classification_id) : "");
        if (part.barcode) {
          setUseCustomBarcode(true);
          setCustomBarcode(part.barcode);
        } else {
          setUseCustomBarcode(false);
          setCustomBarcode("");
        }
        setUnit(part.unit || "pc");
        setDescription(part.description || "");
        setReorderPoint(String(part.reorder_point ?? 10));
        setUnitCost(String(part.unit_cost ?? 0));
        setIsActive(part.is_active ?? true);
      } else {
        setPartCode("");
        setPartName("");
        setClassificationId("");
        setUseCustomBarcode(false);
        setCustomBarcode("");
        setUnit("pc");
        setDescription("");
        setReorderPoint("10");
        setUnitCost("0");
        setIsActive(true);
      }
    }
  }, [part, open]);

  const handleGenerateBarcode = () => {
    setUseCustomBarcode(true);
    setCustomBarcode(generateNumericBarcode(12));
    if (errors.barcode) {
      setErrors((prev) => ({ ...prev, barcode: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!partCode.trim()) {
      newErrors.partCode = "Part code is required";
    }
    if (!partName.trim()) {
      newErrors.partName = "Part name is required";
    }
    if (!classificationId && classifications.length > 0) {
      newErrors.classificationId = "Please select a classification";
    }
    if (!unit.trim()) {
      newErrors.unit = "Unit is required";
    }
    if (unitCost === "" || isNaN(Number(unitCost)) || Number(unitCost) < 0) {
      newErrors.unitCost = "Valid cost is required";
    }
    if (reorderPoint === "" || isNaN(Number(reorderPoint)) || Number(reorderPoint) < 0) {
      newErrors.reorderPoint = "Valid reorder point is required";
    }
    if (useCustomBarcode && customBarcode.trim()) {
      if (!/^\d{12,13}$/.test(customBarcode.trim())) {
        newErrors.barcode = "Barcode must be 12 or 13 numeric digits";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validate()) {
      return;
    }

    const payload: CreateVehiclePartInput = {
      part_code: partCode.trim(),
      part_name: partName.trim(),
      classification_id: classificationId ? Number(classificationId) : null,
      category: selectedClassification ? selectedClassification.name : null,
      barcode: useCustomBarcode && customBarcode.trim() ? customBarcode.trim() : null,
      unit: unit.trim(),
      description: description.trim() || null,
      reorder_point: Number(reorderPoint) || 0,
      unit_cost: Number(unitCost) || 0,
      is_active: isActive,
    };

    const success = await onSave(payload);
    if (success) {
      onOpenChange(false);
    }
  };

  const inheritedBarcode = selectedClassification?.barcode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Vehicle Part" : "Register New Part"}</DialogTitle>
            <DialogDescription>
              Enter part catalog details, select classification, and configure barcode inheritance.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="part_code">
                  Part Code <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="part_code"
                  placeholder="e.g. PRT-OIL-01"
                  value={partCode}
                  onChange={(e) => {
                    setPartCode(e.target.value);
                    if (submitted && errors.partCode) {
                      setErrors((prev) => ({ ...prev, partCode: undefined }));
                    }
                  }}
                  className={submitted && errors.partCode ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {submitted && errors.partCode && (
                  <p className="text-xs text-destructive">{errors.partCode}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="classification">
                    Classification <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[11px] text-primary gap-0.5 px-1 hover:bg-primary/10"
                    onClick={onOpenAddClassification}
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </Button>
                </div>
                <SearchableClassificationSelect
                  options={classifications.map((c) => ({
                    value: String(c.id),
                    label: `${c.name} (${c.code})`,
                  }))}
                  value={classificationId}
                  onValueChange={(val) => {
                    setClassificationId(val);
                    if (submitted && errors.classificationId) {
                      setErrors((prev) => ({ ...prev, classificationId: undefined }));
                    }
                  }}
                  placeholder="Select classification..."
                  className={
                    submitted && errors.classificationId
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                {submitted && errors.classificationId && (
                  <p className="text-xs text-destructive">{errors.classificationId}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="part_name">
                Part Name <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="part_name"
                placeholder="e.g. Heavy Duty Radial Tire 295/80R22.5"
                value={partName}
                onChange={(e) => {
                  setPartName(e.target.value);
                  if (submitted && errors.partName) {
                    setErrors((prev) => ({ ...prev, partName: undefined }));
                  }
                }}
                className={submitted && errors.partName ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {submitted && errors.partName && (
                <p className="text-xs text-destructive">{errors.partName}</p>
              )}
            </div>

            {/* Barcode Section with Classification Inheritance */}
            <div className="rounded-md border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Barcode className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Barcode Assignment</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleGenerateBarcode}
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Generate Barcode
                  </Button>
                </div>
              </div>

              {!useCustomBarcode ? (
                <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background border">
                  <div>
                    <span className="text-muted-foreground mr-1.5">Inherited Barcode:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {inheritedBarcode || "No classification barcode selected"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary"
                    onClick={() => setUseCustomBarcode(true)}
                  >
                    Set Unique Barcode
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="custom_barcode" className="text-xs">
                      Custom Part Barcode (12-13 digits)
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[11px] text-muted-foreground"
                      onClick={() => {
                        setUseCustomBarcode(false);
                        setCustomBarcode("");
                      }}
                    >
                      Reset to Inherited
                    </Button>
                  </div>
                  <Input
                    id="custom_barcode"
                    placeholder="Enter 12-13 digits or click Generate"
                    value={customBarcode}
                    onChange={(e) => {
                      setCustomBarcode(e.target.value.replace(/\D/g, ""));
                      if (submitted && errors.barcode) {
                        setErrors((prev) => ({ ...prev, barcode: undefined }));
                      }
                    }}
                    maxLength={13}
                    className={`h-8 font-mono text-xs ${
                      submitted && errors.barcode ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  {submitted && errors.barcode && (
                    <p className="text-xs text-destructive">{errors.barcode}</p>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 inline shrink-0" />
                All parts in this classification share one barcode unless a unique barcode is set above.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="unit">
                  Unit <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="unit"
                  placeholder="pc, set, ltr"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    if (submitted && errors.unit) {
                      setErrors((prev) => ({ ...prev, unit: undefined }));
                    }
                  }}
                  className={submitted && errors.unit ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {submitted && errors.unit && (
                  <p className="text-xs text-destructive">{errors.unit}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="unit_cost">
                  Cost (₱) <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => {
                    setUnitCost(e.target.value);
                    if (submitted && errors.unitCost) {
                      setErrors((prev) => ({ ...prev, unitCost: undefined }));
                    }
                  }}
                  className={submitted && errors.unitCost ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {submitted && errors.unitCost && (
                  <p className="text-xs text-destructive">{errors.unitCost}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="reorder_point">
                  Reorder Point <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="reorder_point"
                  type="number"
                  min="0"
                  value={reorderPoint}
                  onChange={(e) => {
                    setReorderPoint(e.target.value);
                    if (submitted && errors.reorderPoint) {
                      setErrors((prev) => ({ ...prev, reorderPoint: undefined }));
                    }
                  }}
                  className={submitted && errors.reorderPoint ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {submitted && errors.reorderPoint && (
                  <p className="text-xs text-destructive">{errors.reorderPoint}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Compatibility notes, specifications..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-xs font-medium">
                  Active Status
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Available for inventory stock-in and job orders
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Register Part"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
