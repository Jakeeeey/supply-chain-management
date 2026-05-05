import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";

const COLORS = ["#2563EB", "#6B7280", "#14B8A6", "#475569"];

const CustomTooltip = ({ active, payload, label, prefix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded shadow-lg z-50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label || payload[0].name}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Value: {prefix}
          {Number(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export const SalesReturnCharts = ({ charts }: { charts: any }) => {
  const { theme } = useTheme();
  const maxCategoryVal = useMemo(() => {
    if (!charts.category.length) return 0;
    return Math.ceil(
      Math.max(...charts.category.map((d: any) => d.value)) * 1.1,
    );
  }, [charts.category]);
  const axisStyle = {
    fontSize: 10,
    fill: theme === "dark" ? "#94a3b8" : "#64748b",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Status */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
          Return Status
        </div>
        <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={charts.status}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                stroke="none"
              >
                {charts.status.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Supplier - Horizontal Layout */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
          Top Suppliers (Line Items)
        </div>
        <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={charts.supplier}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={axisStyle}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={90}
                axisLine={false}
                tickLine={false}
                tick={axisStyle}
                interval={0}
                tickFormatter={(val) =>
                  val.length > 12 ? `${val.substring(0, 12)}...` : val
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "transparent" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {charts.supplier.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Showing top suppliers by returned line-items.
        </div>
      </div>
      {/* Category */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm md:col-span-2 lg:col-span-1">
        <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
          Return Type (Net Amount)
        </div>
        <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.category} margin={{ bottom: 20 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={axisStyle}
                interval={0}
              />
              <YAxis
                stroke={axisStyle.fill}
                width={45}
                tick={axisStyle}
                tickFormatter={(v) => `₱${v.toLocaleString()}`}
                domain={[0, maxCategoryVal]}
              />
              <Tooltip content={<CustomTooltip prefix="₱" />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {charts.category.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
