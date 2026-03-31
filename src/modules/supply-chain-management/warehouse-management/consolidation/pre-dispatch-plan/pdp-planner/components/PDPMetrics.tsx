"use client";

import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Package,
  TrendingUp,
  Truck,
} from "lucide-react";
import { PDPMetricCard } from "./PDPMetricCard";

interface PDPMetricsProps {
  metrics?: {
    pendingCount: number;
    pendingValue: number;
    readyCount: number;
    activeCount: number;
    dispatchedCount: number;
    dispatchedValue: number;
  };
}

export function PDPMetrics({ metrics }: PDPMetricsProps) {
  // Default values or props
  const data = metrics || {
    pendingCount: 2,
    pendingValue: 175146,
    readyCount: 1,
    activeCount: 1,
    dispatchedCount: 5,
    dispatchedValue: 711129,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <PDPMetricCard
        title="Pending PDP's"
        value={data.pendingCount}
        // trend={{ value: "12%", isUp: true }}
        icon={ClipboardList}
      />
      <PDPMetricCard
        title="Pending PDP Amount"
        value={`₱${data.pendingValue.toLocaleString()}`}
        // trend={{ value: "8%", isUp: true }}
        icon={DollarSign}
      />
      <PDPMetricCard
        title="Approved PDP's"
        value={data.readyCount}
        // trend={{ value: "8%", isUp: true }}
        icon={CheckCircle2}
      />
      <PDPMetricCard
        title="Active Picking/Picked"
        value={data.activeCount}
        // trend={{ value: "3%", isUp: false }}
        icon={Package}
      />
      <PDPMetricCard
        title="Dispatched Plans"
        value={data.dispatchedCount}
        // trend={{ value: "15%", isUp: true }}
        icon={Truck}
      />
      <PDPMetricCard
        title="Dispatched Value"
        value={`₱${data.dispatchedValue.toLocaleString()}`}
        // trend={{ value: "22%", isUp: true }}
        icon={TrendingUp}
      />
    </div>
  );
}
