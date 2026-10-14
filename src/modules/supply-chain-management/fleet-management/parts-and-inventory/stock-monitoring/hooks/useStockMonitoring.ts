import * as React from "react";
import type {
  PartStock,
  StockHealthStatus,
  StockMonitoringItem,
  StockMonitoringKpis,
} from "../types";
import type { VehiclePart, VehiclePartClassification } from "../../registration/types";
import type { Branch } from "../../stock-in/types";
import {
  fetchBranches,
  fetchClassifications,
  fetchStockRecords,
  fetchVehicleParts,
} from "../provider/fetchProviders";

export function useStockMonitoring() {
  const [stockRecords, setStockRecords] = React.useState<PartStock[]>([]);
  const [parts, setParts] = React.useState<VehiclePart[]>([]);
  const [classifications, setClassifications] = React.useState<VehiclePartClassification[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [classificationFilter, setClassificationFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"branch" | "aggregated">("branch");

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [stockData, partsData, classData, branchData] = await Promise.all([
        fetchStockRecords(branchFilter),
        fetchVehicleParts(),
        fetchClassifications(),
        fetchBranches(),
      ]);
      setStockRecords(stockData);
      setParts(partsData);
      setClassifications(classData);
      setBranches(branchData);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to load stock monitoring data");
    } finally {
      setLoading(false);
    }
  }, [branchFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Classification lookup map
  const classMap = React.useMemo(() => {
    const map = new Map<number | string, VehiclePartClassification>();
    classifications.forEach((c) => {
      map.set(c.id, c);
      map.set(String(c.id), c);
      if (c.name) map.set(c.name.toLowerCase().trim(), c);
    });
    return map;
  }, [classifications]);

  // Branch lookup map
  const branchMap = React.useMemo(() => {
    const map = new Map<number | string, string>();
    branches.forEach((b) => {
      map.set(b.id, b.branch_name);
      map.set(String(b.id), b.branch_name);
    });
    return map;
  }, [branches]);

  // Transform into enriched monitoring items
  const items: StockMonitoringItem[] = React.useMemo(() => {
    if (viewMode === "aggregated") {
      // Group stock by part_id across branches
      const partStockMap = new Map<number, { on_hand: number; reserved: number }>();
      stockRecords.forEach((s) => {
        const pId = typeof s.part_id === "object" && s.part_id !== null ? s.part_id.id : Number(s.part_id);
        const curr = partStockMap.get(pId) || { on_hand: 0, reserved: 0 };
        partStockMap.set(pId, {
          on_hand: curr.on_hand + (Number(s.on_hand) || 0),
          reserved: curr.reserved + (Number(s.reserved) || 0),
        });
      });

      return parts.map((part) => {
        const classObj =
          (typeof part.classification_id === "object" && part.classification_id !== null
            ? (part.classification_id as unknown as VehiclePartClassification)
            : null) ||
          part.classification ||
          (part.classification_id ? classMap.get(part.classification_id) : undefined) ||
          (part.category ? classMap.get(part.category.toLowerCase().trim()) : undefined);

        const hasCustom = Boolean(part.barcode && String(part.barcode).trim());
        const effectiveBarcode = (hasCustom ? part.barcode : null) || classObj?.barcode || "—";
        const barcodeType: "unique" | "inherited" | "none" = hasCustom
          ? "unique"
          : classObj?.barcode
          ? "inherited"
          : "none";

        const stock = partStockMap.get(part.id) || { on_hand: 0, reserved: 0 };
        const available = stock.on_hand - stock.reserved;
        const reorder = Number(part.reorder_point) || 0;
        const unitCost = Number(part.unit_cost) || 0;

        let status: StockHealthStatus = "in_stock";
        if (stock.on_hand <= 0) {
          status = "out_of_stock";
        } else if (available <= reorder) {
          status = "low_stock";
        }

        return {
          id: part.id,
          part_id: part.id,
          part_code: part.part_code,
          part_name: part.part_name,
          classification_name: classObj?.name || part.category || "General",
          barcode: effectiveBarcode,
          barcode_type: barcodeType,
          unit: part.unit,
          unit_cost: unitCost,
          reorder_point: reorder,
          branch_name: "All Branches Total",
          on_hand: stock.on_hand,
          reserved: stock.reserved,
          available,
          valuation: stock.on_hand * unitCost,
          status,
        };
      });
    }

    // Per-Branch View: Map stock records + registered parts with 0 stock
    const result: StockMonitoringItem[] = [];
    const recordedKeys = new Set<string>();

    stockRecords.forEach((s) => {
      const partObj = typeof s.part_id === "object" && s.part_id !== null ? (s.part_id as VehiclePart) : null;
      const partId = partObj ? partObj.id : Number(s.part_id);
      const part = partObj || parts.find((p) => p.id === partId);

      const branchObj = typeof s.branch_id === "object" && s.branch_id !== null ? (s.branch_id as Branch) : null;
      const branchId = branchObj ? branchObj.id : Number(s.branch_id);
      const branchName = branchObj?.branch_name || branchMap.get(branchId) || `Branch #${branchId}`;

      recordedKeys.add(`${partId}-${branchId}`);

      const classObj =
        (part?.classification_id && typeof part.classification_id === "object"
          ? (part.classification_id as unknown as VehiclePartClassification)
          : null) ||
        part?.classification ||
        (part?.classification_id ? classMap.get(part.classification_id) : undefined) ||
        (part?.category ? classMap.get(part.category.toLowerCase().trim()) : undefined);

      const hasCustom = Boolean(part?.barcode && String(part?.barcode).trim());
      const effectiveBarcode = (hasCustom ? part?.barcode : null) || classObj?.barcode || "—";
      const barcodeType: "unique" | "inherited" | "none" = hasCustom
        ? "unique"
        : classObj?.barcode
        ? "inherited"
        : "none";

      const onHand = Number(s.on_hand) || 0;
      const reserved = Number(s.reserved) || 0;
      const available = onHand - reserved;
      const reorder = Number(part?.reorder_point) || 0;
      const unitCost = Number(part?.unit_cost) || 0;

      let status: StockHealthStatus = "in_stock";
      if (onHand <= 0) {
        status = "out_of_stock";
      } else if (available <= reorder) {
        status = "low_stock";
      }

      result.push({
        id: s.id,
        part_id: partId,
        part_code: part?.part_code || `PRT-${partId}`,
        part_name: part?.part_name || "Unknown Part",
        classification_name: classObj?.name || part?.category || "General",
        barcode: effectiveBarcode,
        barcode_type: barcodeType,
        unit: part?.unit || "pc",
        unit_cost: unitCost,
        reorder_point: reorder,
        branch_id: branchId,
        branch_name: branchName,
        on_hand: onHand,
        reserved,
        available,
        valuation: onHand * unitCost,
        status,
        updated_at: s.updated_at,
      });
    });

    // If a branch is selected, also show parts that currently have 0 stock in that branch
    if (branchFilter !== "all") {
      const selectedBranchName = branchMap.get(branchFilter) || "Selected Branch";
      parts.forEach((p) => {
        if (!recordedKeys.has(`${p.id}-${branchFilter}`)) {
          const classObj =
            (typeof p.classification_id === "object" && p.classification_id !== null
              ? (p.classification_id as unknown as VehiclePartClassification)
              : null) ||
            p.classification ||
            (p.classification_id ? classMap.get(p.classification_id) : undefined);

          const hasCustom = Boolean(p.barcode && String(p.barcode).trim());
          const effectiveBarcode = (hasCustom ? p.barcode : null) || classObj?.barcode || "—";

          result.push({
            id: -p.id,
            part_id: p.id,
            part_code: p.part_code,
            part_name: p.part_name,
            classification_name: classObj?.name || p.category || "General",
            barcode: effectiveBarcode,
            barcode_type: hasCustom ? "unique" : classObj?.barcode ? "inherited" : "none",
            unit: p.unit,
            unit_cost: Number(p.unit_cost) || 0,
            reorder_point: Number(p.reorder_point) || 0,
            branch_id: Number(branchFilter),
            branch_name: selectedBranchName,
            on_hand: 0,
            reserved: 0,
            available: 0,
            valuation: 0,
            status: "out_of_stock",
          });
        }
      });
    }

    return result;
  }, [stockRecords, parts, viewMode, branchFilter, classMap, branchMap]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesCode = item.part_code.toLowerCase().includes(q);
        const matchesName = item.part_name.toLowerCase().includes(q);
        const matchesBarcode = item.barcode.toLowerCase().includes(q);
        const matchesClass = item.classification_name.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesBarcode && !matchesClass) return false;
      }

      // Status
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Classification
      if (classificationFilter !== "all" && item.classification_name !== classificationFilter) {
        return false;
      }

      return true;
    });
  }, [items, search, statusFilter, classificationFilter]);

  // KPIs
  const kpis: StockMonitoringKpis = React.useMemo(() => {
    const totalSkus = parts.length;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      totalValuation += item.valuation;
      if (item.status === "low_stock") lowStockCount++;
      if (item.status === "out_of_stock") outOfStockCount++;
    });

    return {
      totalSkus,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    };
  }, [parts, items]);

  return {
    items: filteredItems,
    classifications,
    branches,
    kpis,
    loading,
    error,
    search,
    setSearch,
    branchFilter,
    setBranchFilter,
    statusFilter,
    setStatusFilter,
    classificationFilter,
    setClassificationFilter,
    viewMode,
    setViewMode,
    reload: loadData,
  };
}
