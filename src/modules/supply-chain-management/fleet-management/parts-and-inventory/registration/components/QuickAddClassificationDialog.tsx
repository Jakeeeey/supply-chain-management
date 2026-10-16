"use client";

import * as React from "react";
import type { CreateClassificationInput } from "../types";
import { generateNumericBarcode } from "../utils/barcodeGenerator";
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
import { Sparkles, Barcode } from "lucide-react";

interface QuickAddClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateClassificationInput) => Promise<unknown>;
  saving: boolean;
}

export function QuickAddClassificationDialog({
  open,
  onOpenChange,
  onSave,
  saving,
}: QuickAddClassificationDialogProps) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [errors, setErrors] = React.useState<{ code?: string; name?: string; barcode?: string }>({});
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setBarcode(generateNumericBarcode(12));
      setDescription("");
      setErrors({});
      setSubmitted(false);
    }
  }, [open]);

  const handleGenerateBarcode = () => {
    setBarcode(generateNumericBarcode(12));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const errs: { code?: string; name?: string; barcode?: string } = {};
    if (!code.trim()) errs.code = "Code is required";
    if (!name.trim()) errs.name = "Classification Name is required";
    if (!barcode.trim()) errs.barcode = "Barcode is required";
    else if (!/^\d{12,13}$/.test(barcode.trim())) {
      errs.barcode = "Barcode must be 12 or 13 digits";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const res = await onSave({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      barcode: barcode.trim(),
      description: description.trim() || null,
      is_active: true,
    });

    if (res) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add New Classification</DialogTitle>
            <DialogDescription>
              Create a group (e.g. Tires, Brakes) with a shared default barcode.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="c_name">
                Classification Name <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="c_name"
                placeholder="e.g. Tires, Engine Parts, Brakes"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) {
                    setCode(e.target.value.slice(0, 8).toUpperCase().replace(/\s+/g, "_"));
                  }
                }}
                className={submitted && errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {submitted && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c_code">
                Code <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="c_code"
                placeholder="e.g. TIRE, BRAKE, LGT"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={submitted && errors.code ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {submitted && errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="c_barcode">
                  Classification Barcode (12-13 digits) <span className="text-destructive font-bold">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary gap-1 px-1.5"
                  onClick={handleGenerateBarcode}
                >
                  <Sparkles className="h-3 w-3" />
                  Generate
                </Button>
              </div>
              <div className="relative">
                <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="c_barcode"
                  placeholder="12 or 13 numeric digits"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))}
                  maxLength={13}
                  className={`pl-8 font-mono ${
                    submitted && errors.barcode ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                />
              </div>
              {submitted && errors.barcode && <p className="text-xs text-destructive">{errors.barcode}</p>}
              <p className="text-[11px] text-muted-foreground">
                All parts under this classification will share this barcode unless individually customized.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c_desc">Description (Optional)</Label>
              <Textarea
                id="c_desc"
                placeholder="Category notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Classification"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
