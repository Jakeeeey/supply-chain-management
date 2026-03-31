import jsPDF from "jspdf";
import { PdfConfig, PdfElementConfig, PdfData } from "./types";
import { PAPER_SIZES } from "./constants";

/**
 * Renders a single PDF element onto a jsPDF document.
 */
export const renderElement = (doc: jsPDF, el: PdfElementConfig, data: PdfData | null) => {
    if (!el.visible) return;

    const getElementValue = (el: PdfElementConfig): string | null => {
        if (el.type === 'custom_text') {
            // Support simple string interpolation: {{variable_name}}
            const content = el.content || '';
            if (data) {
                return content.replace(/\{\{(.*?)\}\}/g, (_, key) => {
                    const value = (data as Record<string, unknown>)[key.trim()];
                    return value !== undefined ? String(value) : `{{${key}}}`;
                });
            }
            return content;
        }

        if (!data) return null;

        const d = data as Record<string, unknown>;
        // Fallback for legacy company field IDs
        switch (el.id) {
            case 'company_name': return d.company_name as string;
            case 'company_address': return d.company_address as string;
            case 'company_brgy': return d.company_brgy as string;
            case 'company_city': return d.company_city as string;
            case 'company_province': return d.company_province as string;
            case 'company_zipCode': return d.company_zipCode as string;
            case 'company_contact': return d.company_contact as string;
            case 'company_email': return d.company_email as string;
            default: return d[el.id] as string || null;
        }
    };

    // Handle Shapes
    if (el.type === 'shape') {
        const borderColor = hexToRgb(el.borderColor || '#000000');
        doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
        doc.setLineWidth(el.borderWidth || 0.1);
        
        if (el.shapeType === 'line') {
            doc.line(el.x, el.y, el.x + el.width, el.y);
        } else if (el.shapeType === 'rectangle') {
            if (el.fillColor) {
                const fill = hexToRgb(el.fillColor);
                doc.setFillColor(fill.r, fill.g, fill.b);
                doc.rect(el.x, el.y, el.width, el.height, 'FD');
            } else {
                doc.rect(el.x, el.y, el.width, el.height, 'S');
            }
        }
        return;
    }

    // Handle Images
    if (el.type === 'image') {
        const d = data as Record<string, string>;
        const imageUrl = el.id === 'company_logo' ? d?.company_logo : (d?.[el.id] || el.content);
        if (imageUrl) {
            try {
                doc.addImage(imageUrl, 'PNG', el.x, el.y, el.width, el.height, undefined, 'FAST');
            } catch (e) {
                console.error("Error drawing image:", e);
            }
        }
        return;
    }

    // Handle Text
    const text = getElementValue(el);
    if (text) {
        doc.setFont(el.style.fontFamily, el.style.fontWeight);
        doc.setFontSize(el.style.fontSize);
        const color = hexToRgb(el.style.color);
        doc.setTextColor(color.r, color.g, color.b);

        let textX = el.x;
        const options: { 
            charSpace: number; 
            lineHeightFactor: number; 
            align?: 'left' | 'center' | 'right' | 'justify'; 
            baseline?: 'alphabetic' | 'ideographic' | 'bottom' | 'top' | 'middle' | 'hanging' 
        } = {
            charSpace: el.style.letterSpacing || 0,
            lineHeightFactor: el.style.lineHeight || 1.15
        };

        // Precise Hybrid Baseline Calculation for 100% WYSIWYG
        const fontHeightMm = (el.style.fontSize * 25.4) / 72; // Convert pt to mm
        
        // Horizontal Alignment
        if (el.align === 'center') {
            textX = el.x + (el.width / 2);
            options.align = 'center';
        } else if (el.align === 'right') {
            textX = el.x + el.width;
            options.align = 'right';
        } else {
            textX = el.x;
            options.align = 'left';
        }

        // Vertical Alignment: Center within el.height
        // To match browser 'flex center', we want the visual vertical middle of the text
        // to be at el.y + el.height/2.
        // jsPDF's 'middle' is often slightly off, so we manually offset using 'alphabetic'
        // or just apply a more accurate multiplier.
        // Standard cap-height is ~70% of font size.
        const capHeightMm = fontHeightMm * 0.7;
        const textY = el.y + (el.height / 2) + (capHeightMm / 2);
        
        options.baseline = 'alphabetic';
        
        doc.text(text, textX, textY, options);
    }
};

export const generatePdf = async (config: PdfConfig, data: PdfData | null): Promise<jsPDF> => {
    const { paperSize, customSize, orientation, elements } = config;
    
    // Get numeric format based on PaperSize
    let format: [number, number];
    if (paperSize === 'Custom') {
        format = [customSize.width, customSize.height];
    } else {
        // Case-insensitive lookup for standard paper sizes
        const standardKey = Object.keys(PAPER_SIZES).find(
            k => k.toLowerCase() === paperSize.toLowerCase()
        );
        const standard = standardKey ? PAPER_SIZES[standardKey] : PAPER_SIZES['A4'];
        format = [standard.width, standard.height];
    }

    const doc = new jsPDF({
        orientation: (orientation.toLowerCase() as 'p' | 'l' | 'portrait' | 'landscape'),
        unit: "mm",
        format: paperSize === 'Custom' ? format : paperSize.toLowerCase(),
    });

    Object.values(elements).forEach((el) => {
        renderElement(doc, el, data);
    });

    drawPageNumbers(doc, config);

    return doc;
};

export const drawPageNumbers = (doc: jsPDF, config: PdfConfig) => {
    if (!config.pageNumber?.show) return;

    const pageCount = doc.getNumberOfPages();
    const { format, position, fontSize, fontFamily, color, marginY, marginX } = config.pageNumber;
    
    doc.setFontSize(fontSize || 9);
    doc.setFont(fontFamily || 'helvetica', 'normal');
    const rgb = hexToRgb(color || '#64748b');
    doc.setTextColor(rgb.r, rgb.g, rgb.b);

    const mY = marginY ?? 5;
    const mX = marginX ?? 10;
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const textToDraw = (format || 'Page {pageNumber} of {totalPages}')
            .replace('{pageNumber}', String(i))
            .replace('{totalPages}', String(pageCount));

        let x = mX;
        let y = height - mY;
        let align: 'left' | 'center' | 'right' = 'left';

        switch (position) {
            case 'bottom-left': x = mX; y = height - mY; align = 'left'; break;
            case 'bottom-center': x = width / 2; y = height - mY; align = 'center'; break;
            case 'bottom-right': x = width - mX; y = height - mY; align = 'right'; break;
            case 'top-left': x = mX; y = mY; align = 'left'; break;
            case 'top-center': x = width / 2; y = mY; align = 'center'; break;
            case 'top-right': x = width - mX; y = mY; align = 'right'; break;
            default: x = width - mX; y = height - mY; align = 'right'; break;
        }

        doc.text(textToDraw, x, y, { align, baseline: 'middle' });
    }
};

function hexToRgb(hex: string) {
    if (!hex.startsWith('#')) return { r: 0, g: 0, b: 0 };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

export const getPdfBlobUrl = async (config: PdfConfig, data: PdfData | null): Promise<string> => {
    const doc = await generatePdf(config, data);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
};
