// =============================================================================
// Return-to-Supplier — Line Item Calculations
// =============================================================================

import type { CartItem } from "../types/rts.schema";

/**
 * Calculates gross, discount, and net amounts for a single cart item.
 * Uses customPrice (override) if set, otherwise falls back to the base price.
 *
 * @param item - The cart item to calculate.
 * @returns An object with { gross, discountAmount, net }.
 */
export const calculateLineItem = (item: CartItem) => {
  const price = item.customPrice ?? item.price;
  // Round each step to 2 decimal places to match the UI display
  const gross = Math.round(price * item.quantity * 100) / 100;
  const discountAmount = Math.round(gross * item.discount * 100) / 100;
  const net = Math.round((gross - discountAmount) * 100) / 100;
  return { gross, discountAmount, net };
};

/**
 * Calculates aggregate totals across all items in the cart.
 *
 * @param items - Array of cart items.
 * @returns An object with { grossTotal, discountTotal, netTotal, totalQty }.
 */
export const calculateCartTotals = (items: CartItem[]) => {
  return items.reduce(
    (acc, item) => {
      const { gross, discountAmount, net } = calculateLineItem(item);
      acc.grossTotal += gross;
      acc.discountTotal += discountAmount;
      acc.netTotal += net;
      acc.totalQty += item.quantity;
      return acc;
    },
    { grossTotal: 0, discountTotal: 0, netTotal: 0, totalQty: 0 },
  );
};
