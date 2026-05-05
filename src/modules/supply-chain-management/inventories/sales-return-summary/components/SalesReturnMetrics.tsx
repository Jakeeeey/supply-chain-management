import React from "react";

const MetricCard = ({ title, value, titleColor, bgColor }: any) => (
  <div
    className={`${bgColor} border rounded-xl p-3 sm:p-4 flex flex-col justify-center border-opacity-50`}
  >
    <span
      className={`text-[10px] sm:text-xs font-semibold ${titleColor} uppercase tracking-wider truncate`}
    >
      {title}
    </span>
    <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
      {value}
    </div>
  </div>
);

export const SalesReturnMetrics = ({
  summary,
  loading,
}: {
  summary: any;
  loading: boolean;
}) => {
  const fmt = (n: number) =>
    loading
      ? "..."
      : `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const num = (n: number) => (loading ? "..." : n);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      <MetricCard
        title="Total Returns"
        value={num(summary.totalReturns)}
        titleColor="text-blue-600"
        bgColor="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
      />
      <MetricCard
        title="Gross Amount"
        value={fmt(summary.grossAmount)}
        titleColor="text-green-600"
        bgColor="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
      />
      <MetricCard
        title="Total Discount"
        value={fmt(summary.totalDiscount)}
        titleColor="text-orange-600"
        bgColor="bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800"
      />
      <MetricCard
        title="Net Amount"
        value={fmt(summary.netAmount)}
        titleColor="text-purple-600"
        bgColor="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800"
      />
      <MetricCard
        title="Pending Inv."
        value={num(summary.pendingInventory)}
        titleColor="text-yellow-600"
        bgColor="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800"
      />
      <MetricCard
        title="Received Inv."
        value={num(summary.receivedInventory)}
        titleColor="text-teal-600"
        bgColor="bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800"
      />
    </div>
  );
};
