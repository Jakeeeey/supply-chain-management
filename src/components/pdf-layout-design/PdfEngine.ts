import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { pdfTemplateService } from "./services/pdf-template";
import { renderElement, drawPageNumbers } from "./PdfGenerator";
import { PdfConfig, PdfData } from "./types";

/**
 * PdfEngine
 * The unified entry point for all modules to use saved PDF templates.
 */
export const PdfEngine = {
    /**
     * Applies a saved template (e.g., Header) to an existing jsPDF document.
     * Returns the "Safe Y" coordinate (the bottom of the lowest template element).
     */
    async applyTemplate(doc: jsPDF, templateName: string, data: PdfData | null): Promise<number> {
        try {
            const templates = await pdfTemplateService.fetchTemplates();
            const template = templates.find(t => t.name === templateName);

            if (!template) {
                console.warn(`PdfEngine: Template "${templateName}" not found.`);
                return 10; // Default margin
            }

            const elements = Object.values(template.config.elements);
            let lowestY = template.config.margins?.top || 10;

            // Render all elements from the template
            for (const el of elements) {
                if (!el.visible) continue;
                renderElement(doc, el, data);
                
                const elementBottom = el.y + el.height;
                if (elementBottom > lowestY) lowestY = elementBottom;
            }

            // Return explicit bodyStart if defined, otherwise calculated lowestY
            return template.config.bodyStart ?? lowestY;
        } catch (error) {
            console.error("PdfEngine: Error applying template:", error);
            return 10;
        }
    },

    /**
     * Generates a full PDF using a template frame and a custom body renderer.
     */
    async generateWithFrame(
        templateName: string, 
        data: PdfData | null, 
        renderBody: (doc: jsPDF, startY: number, config: PdfConfig) => void | Promise<void>
    ): Promise<jsPDF> {
        // 1. Fetch template config to get paper size/orientation
        const templates = await pdfTemplateService.fetchTemplates();
        const template = templates.find(t => t.name === templateName);
        const config = template?.config;

        // 2. Initialize jsPDF
        const orientation = config?.orientation || 'portrait';
        const unit = 'mm';
        let format: string | [number, number] = config?.paperSize?.toLowerCase() || 'a4';
        if (format === 'custom' && config?.customSize) {
            format = [config.customSize.width, config.customSize.height];
        }

        const doc = new jsPDF({ orientation, unit, format });

        // 3. Apply the Template Frame (Header/Footer)
        const startY = await this.applyTemplate(doc, templateName, data);

        // 4. Call the module-specific body renderer
        await renderBody(doc, startY, config || {} as PdfConfig);

        // 5. Draw page numbers over all pages
        if (config?.pageNumber?.show) {
            drawPageNumbers(doc, config);
        }

        return doc;
    }
};
