/**
 * Formats a numeric value as Philippine Peso (PHP) with exactly 2 decimal places.
 * Example: 1234.5 -> ₱1,234.50
 */
export function formatPeso(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (value === null || value === undefined || isNaN(value)) return "₱0.00";

  return value.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a numeric value with exactly 2 decimal places and thousands separators.
 * Example: 1234.5 -> 1,234.50
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return "0.00";

  return num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
