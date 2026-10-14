"use client";

import * as React from "react";
import { Edit2, Trash2, AlertTriangle, Layers, Barcode } from "lucide-react";
import type { VehiclePart, VehiclePartClassification } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PartsTableProps {
  parts: VehiclePart[];
  classifications?: VehiclePartClassification[];
  loading: boolean;
  onEdit: (part: VehiclePart) => void;
  onDelete: (part: VehiclePart) => void;
}

export function PartsTable({ parts, classifications = [], loading, onEdit, onDelete }: PartsTableProps) {
  // Build quick map of classifications by ID and by Name for fallback matching
  const classificationMap = React.useMemo(() => {
    const map = new Map<string | number, VehiclePartClassification>();
    classifications.forEach((c) => {
      map.set(c.id, c);
      map.set(String(c.id), c);
      if (c.name) map.set(c.name.toLowerCase().trim(), c);
      if (c.code) map.set(c.code.toLowerCase().trim(), c);
    });
    return map;
  }, [classifications]);

  if (loading && parts.length === 0) {
    return (
      <div className="rounded-md border p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/60 mb-3" />
        <h3 className="text-sm font-semibold">No vehicle parts registered</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click &quot;Register Part&quot; to add new parts to the catalog.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Part Code</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Reorder Point</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.map((part) => {
              // Directus can return classification_id as either an object (expanded) or a numeric ID or part.classification
              const rawClassObj =
                (typeof part.classification_id === "object" && part.classification_id !== null
                  ? (part.classification_id as unknown as VehiclePartClassification)
                  : null) || part.classification || null;

              // If not expanded, find in classifications list by ID or by category name
              const resolvedClass =
                rawClassObj ||
                (part.classification_id ? classificationMap.get(part.classification_id) : undefined) ||
                (part.category ? classificationMap.get(part.category.toLowerCase().trim()) : undefined);

              const hasCustomBarcode = Boolean(part.barcode && String(part.barcode).trim());
              const effectiveBarcode =
                (hasCustomBarcode ? part.barcode : null) ||
                resolvedClass?.barcode ||
                "—";

              const classificationName =
                resolvedClass?.name ||
                part.category ||
                "General";

              return (
                <TableRow key={part.id}>
                  <TableCell className="font-mono font-medium text-xs">{part.part_code}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{part.part_name}</div>
                    {part.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {part.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {classificationName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs cursor-help">
                          <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={effectiveBarcode === "—" ? "text-muted-foreground" : "font-semibold"}>
                            {effectiveBarcode}
                          </span>
                          {hasCustomBarcode ? (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 font-sans">
                              Unique
                            </Badge>
                          ) : resolvedClass?.barcode ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-sans text-muted-foreground">
                              Inherited
                            </Badge>
                          ) : null}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {hasCustomBarcode
                            ? "Custom barcode specific to this part"
                            : resolvedClass?.barcode
                            ? `Inherited from ${classificationName} classification`
                            : "No barcode assigned"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{part.unit}</TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    ₱{Number(part.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      {part.reorder_point}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={part.is_active ? "default" : "secondary"} className="text-xs">
                      {part.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(part)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(part)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
