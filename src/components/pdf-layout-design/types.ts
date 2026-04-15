export type PaperSize = 'A4' | 'Letter' | 'Legal' | 'Custom';
export type Orientation = 'portrait' | 'landscape';

export interface ElementStyle {
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold' | 'italic' | 'bolditalic';
    color: string;
    letterSpacing?: number;
    lineHeight?: number;
    opacity?: number;
}

export type ElementType = 'text' | 'image' | 'shape' | 'custom_text';

export interface PdfElementConfig {
    id: string;
    type: ElementType;
    label: string;
    visible: boolean;
    x: number; // in mm
    y: number; // in mm
    width: number; // in mm
    height: number; // in mm
    style: ElementStyle;
    align: 'left' | 'center' | 'right';
    content?: string; // For custom text
    shapeType?: 'line' | 'rectangle'; // For shapes
    borderWidth?: number;
    borderColor?: string;
    fillColor?: string;
}

export interface PageNumberConfig {
    show: boolean;
    format: string; // e.g. "Page {pageNumber} of {totalPages}"
    position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right';
    fontSize: number;
    fontFamily: string;
    color: string;
    marginY: number; // Offset from top/bottom edge in mm
    marginX: number; // Offset from left/right edge in mm
}

export interface PdfConfig {
    paperSize: PaperSize;
    customSize: { width: number; height: number };
    orientation: Orientation;
    elements: Record<string, PdfElementConfig>;
    margins: { top: number; right: number; bottom: number; left: number };
    showGrid: boolean;
    snapToGrid: boolean;
    bodyStart?: number; // in mm
    bodyEnd?: number; // in mm
    pageNumber?: PageNumberConfig;
}

export interface CompanyData {
    company_name: string;
    company_address: string;
    company_brgy: string;
    company_city: string;
    company_province: string;
    company_zipCode: string;
    company_contact: string;
    company_email: string;
    company_logo: string;
}

export type PdfData = CompanyData | Record<string, unknown>;
