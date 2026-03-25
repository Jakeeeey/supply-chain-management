import { SalesReturnItem } from "../type";

export const formatCurrency = (value: number) => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const calculateTotals = (items: SalesReturnItem[]) => {
  const totalGross = items.reduce(
    (sum, item) => sum + (item.grossAmount || 0),
    0,
  );
  const totalDiscount = items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0,
  );
  const totalNet = items.reduce(
    (sum, item) => sum + (item.totalAmount || 0),
    0,
  );

  return { totalGross, totalDiscount, totalNet };
};
