import { PdfConfig } from "../types";

export interface PdfTemplate {
    id: number;
    name: string;
    config: PdfConfig;
    created_at?: string;
    updated_at?: string;
}

/**
 * PDF Template Service
 * Communicates via Next.js API Proxy (/api/pdf/templates) 
 * to avoid CORS and secure Directus tokens.
 */
export const pdfTemplateService = {
    /**
     * Fetches all PDF templates.
     */
    async fetchTemplates(): Promise<PdfTemplate[]> {
        try {
            // Call local Next.js API proxy instead of direct IP
            const response = await fetch("/api/pdf/templates", { 
                method: "GET"
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return result.data || [];
        } catch (e) {
            console.error("Error fetching PDF templates:", e);
            return [];
        }
    },

    /**
     * Saves a new PDF template.
     */
    async saveTemplate(name: string, config: PdfConfig): Promise<PdfTemplate> {
        try {
            const response = await fetch("/api/pdf/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, category: 'general', config }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return result.data;
        } catch (e) {
            console.error("Error saving PDF template:", e);
            throw e;
        }
    },

    /**
     * Updates an existing PDF template.
     */
    async updateTemplate(id: number, config: PdfConfig, name?: string): Promise<PdfTemplate> {
        try {
            const response = await fetch(`/api/pdf/templates/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, category: 'general', config }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return result.data;
        } catch (e) {
            console.error("Error updating PDF template:", e);
            throw e;
        }
    },

    /**
     * Deletes a PDF template by ID.
     */
    async deleteTemplate(id: number): Promise<void> {
        try {
            const response = await fetch(`/api/pdf/templates/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        } catch (e) {
            console.error("Error deleting PDF template:", e);
            throw e;
        }
    }
};
