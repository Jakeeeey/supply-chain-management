export type ReservationLifecycleStatus =
  | "Reserved"
  | "Partially Issued"
  | "Issued"
  | "Returned"
  | "Cancelled";

export function deriveReservationStatus({
  reserved,
  issued,
  returned,
  cancelled,
  damaged,
}: {
  reserved: number;
  issued: number;
  returned: number;
  cancelled: number;
  damaged: number;
}): ReservationLifecycleStatus {
  const remainingReserved = Math.max(0, reserved - issued - cancelled);
  const outstandingIssued = Math.max(0, issued - returned);

  if (remainingReserved > 0) {
    return outstandingIssued > 0 ? "Partially Issued" : "Reserved";
  }
  if (outstandingIssued > 0) {
    return returned > 0 || cancelled > 0 || damaged > 0 ? "Partially Issued" : "Issued";
  }
  if (issued > 0 || damaged > 0) return "Returned";
  if (cancelled > 0) return "Cancelled";
  return "Reserved";
}
