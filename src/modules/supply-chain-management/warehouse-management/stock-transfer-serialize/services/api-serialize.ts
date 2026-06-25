import type { SerialLookupResponse } from "../types/serialize.types";
import type { UpdateSerializeTransferValues } from "../types/serialize.schema";

/**
 * Service for client-side API interaction with the Serialized Stock Transfer module.
 */
export const serializeLifecycleService = {
  /**
   * Performs a serial number lookup/validation through the API proxy.
   */
  async lookupSerial(serialNumber: string, branchId?: number): Promise<SerialLookupResponse> {
    const params = new URLSearchParams({
      action: "lookup_serial",
      serial: serialNumber,
      ...(branchId ? { branch_id: String(branchId) } : {}),
    });

    const res = await fetch(`/api/scm/warehouse-management/stock-transfer-serialize?${params.toString()}`, {
      cache: "no-store"
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Serial lookup failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Verifies a serial number against dispatched items for receiving.
   */
  async lookupReceiveSerial(serialNumber: string, transferIds: number[]): Promise<{ stockTransferId: number, serialNumber: string }> {
    const params = new URLSearchParams({
      action: "verify_receive_serial",
      serial: serialNumber,
      transferIds: transferIds.join(","),
    });

    const res = await fetch(`/api/scm/warehouse-management/stock-transfer-serialize?${params.toString()}`, {
      cache: "no-store"
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Serial verification failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Updates transfer status and records serial tracking.
   */
  async submitStatusUpdate(payload: UpdateSerializeTransferValues): Promise<{ success: boolean }> {
    const res = await fetch("/api/scm/warehouse-management/stock-transfer-serialize", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update status (${res.status})`);
    }

    return res.json();
  }
};
