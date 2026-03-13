import {
  PostDispatchPlan,
  PostDispatchPlanStaff,
  User,
  Vehicle,
  PostDispatchBudgeting,
  PostDispatchInvoice,
  SalesInvoice,
  DispatchRow,
  ReconciliationRow,
  InvoiceDetail
} from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/items';
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

async function fetcher(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const fetchDispatchPlans = async (): Promise<PostDispatchPlan[]> => {
  const result = await fetcher('/post_dispatch_plan?limit=-1');
  return result.data;
};

export const fetchDispatchStaff = async (): Promise<PostDispatchPlanStaff[]> => {
  const result = await fetcher('/post_dispatch_plan_staff?limit=-1');
  return result.data;
};

export const fetchUsers = async (): Promise<User[]> => {
  const result = await fetcher('/user?limit=-1');
  return result.data;
};

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const result = await fetcher('/vehicles?limit=-1');
  return result.data;
};

export const fetchBudgeting = async (): Promise<PostDispatchBudgeting[]> => {
  const result = await fetcher('/post_dispatch_budgeting?limit=-1');
  return result.data;
};

export const fetchDispatchInvoices = async (): Promise<PostDispatchInvoice[]> => {
  const result = await fetcher('/post_dispatch_invoices?limit=-1');
  return result.data;
};

export const fetchSalesInvoices = async (): Promise<SalesInvoice[]> => {
  const result = await fetcher('/sales_invoice?limit=-1');
  return result.data;
};

// Aggregation Helper using Local API
export const getJoinedDispatchData = async (
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<{ data: DispatchRow[]; total: number }> => {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search: search
  }).toString();

  const response = await fetch(`/api/scm/fleet-management/trip-management/dispatch-clearance?${query}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const submitClearance = async (dispatchId: number, invoices: ReconciliationRow[]): Promise<void> => {
  const response = await fetch('/api/scm/fleet-management/trip-management/dispatch-clearance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dispatchId, invoices }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
};

export const fetchInvoiceDetails = async (invoiceId: number): Promise<InvoiceDetail> => {
  const response = await fetch(`/api/scm/fleet-management/trip-management/dispatch-clearance/invoice-details?invoice_id=${invoiceId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
