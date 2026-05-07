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

export interface CustomerInvoice {
    no: string;
    amount: number;
}

export interface CustomerArrivalInfo {
    customer_code: string;
    customer_name: string;
    address: string;
    invoices: CustomerInvoice[];
}

export type DeliveryStatus = "not_delivered" | "has_concern" | "has_return" | null;
