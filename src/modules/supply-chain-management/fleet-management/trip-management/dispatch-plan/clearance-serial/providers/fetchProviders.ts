import {
  DispatchRow,
  ReconciliationRow,
  InvoiceDetail,
  SerialMapping
} from '../types';

// Aggregation Helper using Local API
export const getJoinedDispatchData = async (
  page: number = 1,
  limit: number = 10,
  search: string = '',
  startDate?: string,
  endDate?: string
): Promise<{ data: DispatchRow[]; total: number }> => {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
    search: search
  };

  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const query = new URLSearchParams(params).toString();

  const response = await fetch(`/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial?${query}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const submitClearance = async (dispatchId: number, invoices: ReconciliationRow[], isPreSave: boolean = false): Promise<void> => {
  const response = await fetch('/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dispatchId, invoices, isPreSave }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
};

export const fetchInvoiceDetails = async (invoiceId: number): Promise<InvoiceDetail> => {
  const response = await fetch(`/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial/invoice-details?invoice_id=${invoiceId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const fetchSerialNumbersForDispatch = async (dispatchId: number): Promise<SerialMapping[]> => {
  const response = await fetch(`/api/scm/fleet-management/trip-management/dispatch-plan/clearance-serial/serial-numbers?dispatch_id=${dispatchId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const fetchSalesReturnsByInvoice = async (invoiceNo: string): Promise<{ id: number; returnNo: string; returnDate: string; totalAmount: number }[]> => {
  const response = await fetch(`/api/scm/inventories/sales-return-manual?action=list&invoiceNo=${encodeURIComponent(invoiceNo)}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json();
  return result.data || [];
};
