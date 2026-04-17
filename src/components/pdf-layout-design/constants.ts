import { PdfConfig, PdfElementConfig } from "./types";

export const PAPER_SIZES: Record<string, { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    Letter: { width: 215.9, height: 279.4 },
    Legal: { width: 215.9, height: 355.6 },
};

const createDefaultElement = (id: string, label: string, y: number, fontSize = 10, fontWeight: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal'): PdfElementConfig => ({
    id,
    type: 'text',
    label,
    visible: true,
    x: 10,
    y: y,
    width: 190,
    height: 10,
    align: 'left',
    style: {
        fontSize,
        fontFamily: 'helvetica',
        fontWeight,
        color: '#000000',
    },
});

export const DEFAULT_CONFIG: PdfConfig = {
    paperSize: 'A4',
    customSize: { width: 210, height: 297 },
    orientation: 'portrait',
    showGrid: true,
    snapToGrid: true,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    bodyStart: 50,
    bodyEnd: 250,
    pageNumber: {
        show: false,
        format: 'Page {pageNumber} of {totalPages}',
        position: 'bottom-right',
        fontSize: 9,
        fontFamily: 'helvetica',
        color: '#64748b',
        marginY: 5,
        marginX: 10
    },
    elements: {
        company_logo: {
            id: 'company_logo',
            type: 'image',
            label: 'Logo',
            visible: true,
            x: 10,
            y: 10,
            width: 30,
            height: 30,
            align: 'left',
            style: { fontSize: 10, fontFamily: 'helvetica', fontWeight: 'normal', color: '#000000' },
        },
        company_name: createDefaultElement('company_name', 'Company Name', 45, 18, 'bold'),
        company_address: createDefaultElement('company_address', 'Address', 55),
        company_brgy: createDefaultElement('company_brgy', 'Barangay', 60),
        company_city: createDefaultElement('company_city', 'City', 65),
        company_province: createDefaultElement('company_province', 'Province', 70),
        company_zipCode: createDefaultElement('company_zipCode', 'Zip Code', 75),
        company_contact: createDefaultElement('company_contact', 'Contact', 85),
        company_email: createDefaultElement('company_email', 'Email', 90),
        header_line: {
            id: 'header_line',
            type: 'shape',
            shapeType: 'line',
            label: 'Divider Line',
            visible: true,
            x: 10,
            y: 45,
            width: 190,
            height: 1,
            align: 'left',
            borderWidth: 0.5,
            borderColor: '#e2e8f0',
            style: { fontSize: 0, fontFamily: 'helvetica', fontWeight: 'normal', color: '#000000' },
        }
    },
};

export const FONT_FAMILIES = [
    { label: 'Helvetica', value: 'helvetica' },
    { label: 'Times', value: 'times' },
    { label: 'Courier', value: 'courier' },
];
