export interface Branch {
    id: number;
    branch_name: string;
    branch_code: string;
    branch_description: string;
    branch_head: number;
    state_province: string | null;
    city: string | null;
    brgy: string | null;
    phone_number: string | null;
    postal_code: string | null;
    date_added: string;
    isMoving: number | boolean;
    isReturn: number | boolean;
    isBadStock: number | boolean;
    isActive: number | boolean;
}

export interface User {
    user_id: number;
    user_fname: string;
    user_mname: string | null;
    user_lname: string;
    user_email: string;
    user_contact: string | null;
    user_position: string | null;
}

export interface Province {
    code: string;
    name: string;
}

export interface City {
    code: string;
    name: string;
    provinceCode: string;
}

export interface Barangay {
    code: string;
    name: string;
    cityCode: string;
}
