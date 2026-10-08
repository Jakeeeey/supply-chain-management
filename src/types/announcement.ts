export interface Company {
    company_id: number;
    company_name?: string;
    is_default?: boolean | number | string;
    directus?: string;
    directus_token?: string;
}

export interface CompanyMemo {
    id: number;
    company_id: number;
    status: string;
    subject: string;
    start_date?: string;
    end_date?: string;
    memo_id?: string;
    memo_no?: string;
    description?: string;
    body?: string;
    issued_by_code?: string;
    released_at?: string;
}

export interface CompanyMemoAttachment {
    id?: number;
    company_memo_id: number;
    file_name: string;
    file_url?: string;
}

export interface Announcement {
    memo: CompanyMemo;
    attachments: CompanyMemoAttachment[];
    directusBaseUrl: string;
    acknowledged_at?: string;
}
