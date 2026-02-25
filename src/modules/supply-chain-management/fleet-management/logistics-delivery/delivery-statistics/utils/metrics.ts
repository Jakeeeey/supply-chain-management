import type { DeliveryStatusCount, DeliveryStatusName } from "../types";

export function sumCounts(counts: DeliveryStatusCount[]) {
  return counts.reduce((a, b) => a + (b?.value ?? 0), 0);
}

export function getCountByName(counts: DeliveryStatusCount[], name: DeliveryStatusName) {
  return counts.find((c) => c.name === name)?.value ?? 0;
}

export function computeFulfillmentRate(counts: DeliveryStatusCount[]) {
  const fulfilled = getCountByName(counts, "Fulfilled");
  const total = sumCounts(counts) || 1;
  return ((fulfilled / total) * 100).toFixed(1);
}

export function computeIssuesCount(counts: DeliveryStatusCount[]) {
  const concerns = getCountByName(counts, "Fulfilled With Concerns");
  const returns = getCountByName(counts, "Fulfilled With Returns");
  return concerns + returns;
}
