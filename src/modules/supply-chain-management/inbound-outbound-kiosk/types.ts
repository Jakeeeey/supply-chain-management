export type KioskStatus = "For Dispatch" | "For Inbound" | "For Clearing" | "Completed" | "Pending";

export interface StaffMember {
    name: string;
    rf_id: string | null;
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
    helpers: StaffMember[]; // Added for multiple helpers support
    vehicle_plate: string;
    status: KioskStatus | string;
}

export interface DirectusPostDispatchPlan {
    id: number;
    doc_no: string;
    date_encoded: string;
    estimated_time_of_dispatch?: string;
    estimated_time_of_arrival?: string;
    status: string;
    vehicle_id: number;
    driver_id: number;
}

export interface DirectusStaff {
    id: number;
    post_dispatch_plan_id: number;
    role: string;
    user_id: number;
}

export interface DirectusUser {
    user_id: number;
    user_fname: string;
    user_lname: string;
    user_mname?: string;
    rf_id?: string;
}
