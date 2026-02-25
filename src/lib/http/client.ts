"use client";

export const http = {
    // Utility para basahin ang cookie sa client-side
    getToken() {
        if (typeof document === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; access_token=`); // Siguraduhin na 'access_token' ang name sa cookies
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    },

    async request(url: string, options: RequestInit = {}) {
        // Papunta sa ating Next.js API Routes (/api/proxy o /api/spring)
        const proxyUrl = url.startsWith("/") ? `/api${url}` : `/api/${url}`;

        const token = this.getToken();
        const headers = new Headers(options.headers);
        headers.set("Content-Type", "application/json");

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const response = await fetch(proxyUrl, {
            ...options,
            headers,
        });

        if (!response.ok) {
            // Error handling base sa manual
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return { data: await response.json() };
        }
        return { data: null };
    },

    async get(url: string, params?: Record<string, any>) {
        let finalUrl = url;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                // Mahalaga para sa Directus filters: i-stringify kung object
                const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
                searchParams.append(key, val);
            });
            finalUrl += `?${searchParams.toString()}`;
        }
        return this.request(finalUrl, { method: 'GET' });
    },

    async post(url: string, body: any) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
};