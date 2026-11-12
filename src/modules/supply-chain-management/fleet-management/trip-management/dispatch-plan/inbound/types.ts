export type KioskStatus = "For Dispatch" | "For Inbound" | "For Clearing" | "Completed" | "Pending";

export interface StaffMember {
    user_id: number;
    name: string;
    rf_id?: string | null;
    is_present?: number | boolean;
}

export interface KioskDispatchPlan {
    id: number;
    doc_no: string;
    date_encoded: string;
    estimated_time_of_dispatch?: string;
    estimated_time_of_arrival?: string;
    driver_id: number;
    driver_name: string;
    driver_rfid: string | null;
    helper_name: string | null;
    helper_rfid: string | null;
    helpers: StaffMember[];
    vehicle_plate: string;
    status: KioskStatus | string;
}

export interface DeliveryProof {
    id: number;
    postDispatchPlanId: number;
    postDispatchInvoiceId: number;
    driverUserId: number;
    outcome: string;
    remarks: string | null;
    recipientName: string | null;
    signatureFileId: string | null;
    photoFileId: string;
    capturedAt: string;
    receivedAt: string;
    latitude: number | null;
    longitude: number | null;
    commandId: string;
}

export interface CustomerInvoice {
    id?: number;
    invoice_id?: number;
    no: string;
    amount: number;
    deliveryProof?: DeliveryProof | null;
}

export interface CustomerArrivalInfo {
    customer_code: string;
    customer_name: string;
    address: string;
    invoices: CustomerInvoice[];
}

export type DeliveryStatus = "not_delivered" | "has_concern" | "has_return" | null;
