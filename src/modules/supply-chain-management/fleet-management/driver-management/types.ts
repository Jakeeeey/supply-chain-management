export interface Driver {
    id: number;
    user_id: number;
    branch_id: number;
    bad_branch_id: number | null;
    created_by: number | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string | null;
}

export interface DriverWithDetails extends Driver {
    user?: User;
    good_branch?: Branch;
    bad_branch?: Branch;
}

export interface User {
    user_id: number;
    user_fname: string;
    user_mname: string | null;
    user_lname: string;
    user_email: string;
    user_contact: string | null;
    user_position: string | null;
    user_department?: number | null;
}

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
