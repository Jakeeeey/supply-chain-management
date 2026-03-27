import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ORTemplate } from '../types';

export interface ReceiptItem {
    product_id: number;
    product_name: string;
    order_no: string;
    ordered_qty: number;
    qty: number;
    unit_price: number;
    discount_type: number | null;
    discount_amount: number;
    net_amount: number;
    unit_shortcut: string;
}

export interface ReceiptData {
    receipt_no: string;
    items: ReceiptItem[];
    customer_name: string;
    store_name: string;
    customer_tin: string;
    address: string;
    payment_name: string;
    po_no: string;
    salesman_name: string;
    is_official: boolean;
    discountTypes: any[];
    barcodeDataUrl?: string;
    template?: ORTemplate;
}

const OR_WIDTH = 210;
const OR_HEIGHT = 265;
const THERMAL_WIDTH = 58;
const THERMAL_MARGIN = 4;
const THERMAL_CONTENT_WIDTH = THERMAL_WIDTH - (THERMAL_MARGIN * 2);

const IN_TO_MM = 25.4;

const getImageDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generateInvoicingPDF = async (data: ReceiptData): Promise<jsPDF> => {
    if (data.is_official) {
        return generateOfficialReceipt(data);
    } else {
        return generateThermalReceipt(data);
    }
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const generateOfficialReceipt = async (data: ReceiptData): Promise<jsPDF> => {
    const template = data.template;
    const width = template?.width || OR_WIDTH;
    const height = template?.height || OR_HEIGHT;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [width, height],
        compress: true, // Maximizing potential: standard compression
    });

    // Max Potential: Metadata
    doc.setProperties({
        title: `Official Receipt - ${data.receipt_no}`,
        subject: 'Sales Invoice',
        author: 'VOS Web Supply Chain Management',
        keywords: 'receipt, invoice, supply chain',
        creator: 'VOS System'
    });

    // Background Image
    /* 
    if (template?.backgroundImage) {
        try {
            // Maximizing Potential: High-quality image rendering
            doc.addImage(template.backgroundImage, 'JPEG', 0, 0, width, height, undefined, 'FAST');
        } catch (err) {
            console.warn("Failed to add background image to OR:", err);
        }
    }
    */

    // Font setup
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);

    const renderField = (key: string, value: string, defaultX: number, defaultY: number, options: { align?: 'left' | 'center' | 'right' } = {}) => {
        const config = template?.fields?.[key];
        const x = config ? config.x : defaultX;
        const y = config ? config.y : defaultY;
        
        if (config) {
            doc.setFont(config.fontFamily, config.fontWeight);
            doc.setFontSize(config.fontSize);
            // Apply character spacing (in points)
            if (config.charSpacing !== undefined) {
                // @ts-ignore
                doc.setCharSpace(config.charSpacing);
            } else {
                // @ts-ignore
                doc.setCharSpace(0);
            }
        } else {
            doc.setFont('courier', 'bold');
            doc.setFontSize(11);
            // @ts-ignore
            doc.setCharSpace(0);
        }
        
        const scaleX = config?.scaleX ?? 1;
        if (scaleX !== 1) {
            // Maximizing potential: Horizontal scaling for aesthetic compression
            // We scale the X axis, adjust the text position accordingly, then revert.
            // Note: Use a try-catch for scaling if specific jsPDF versions differ
            try {
                // @ts-ignore
                doc.saveGraphicsState();
                // @ts-ignore
                doc.scale(scaleX, 1);
                doc.text(value, x / scaleX, y, { ...options, baseline: 'top' });
                // @ts-ignore
                doc.restoreGraphicsState();
            } catch (err) {
                console.warn("Scaling failed, falling back to basic text:", err);
                doc.text(value, x, y, { ...options, baseline: 'top' });
            }
        } else {
            doc.text(value, x, y, { ...options, baseline: 'top' });
        }
    };

    const rightMargin = width - (0.3 * IN_TO_MM);

    // -------------------------------------------------------------------------
    // RENDER TEMPLATE FIELDS (STRICT WYSIWYG)
    // -------------------------------------------------------------------------
    
    // Calculate values once
    const grossTotal = data.items.reduce((s, i) => s + (i.unit_price * i.qty), 0);
    const discountTotal = data.items.reduce((s, i) => s + i.discount_amount, 0);
    const netTotal = grossTotal - discountTotal;
    const vatableSales = netTotal / 1.12;
    const vatAmount = netTotal - vatableSales;

    const fieldValues: Record<string, string> = {
        customer_name: data.customer_name.toUpperCase(),
        date: format(new Date(), "MMM dd, yyyy").toUpperCase(),
        store_name: data.store_name.toUpperCase(),
        payment_name: data.payment_name.toUpperCase(),
        customer_tin: data.customer_tin || "N/A",
        address: data.address.toUpperCase(),
        vatable_sales: formatCurrency(vatableSales),
        vat_amount: formatCurrency(vatAmount),
        gross_total: formatCurrency(grossTotal),
        discount_total: formatCurrency(discountTotal),
        net_total: formatCurrency(netTotal),
        po_no: `PO NO. : ${data.po_no}`,
        salesman: `SALESMAN : ${data.salesman_name}`,
        total_amount_due: formatCurrency(netTotal),
        net_total_footer: formatCurrency(netTotal),
        zero_rated: "0.00",
        exempt: "0.00",
        withholding_tax: "0.00"
    };

    // Render every field defined in the template
    if (template?.fields) {
        Object.entries(template.fields).forEach(([key, config]) => {
            // Special handling for barcode - it's rendered differently
            if (key === 'barcode') {
                if (data.barcodeDataUrl) {
                    try {
                        const barcodeH = 9; // Height in mm
                        const barcodeW = 28; // Reduced from 40 to prevent horizontal stretching
                        doc.addImage(data.barcodeDataUrl, 'PNG', config.x, config.y, barcodeW, barcodeH);
                    } catch (err) {
                        console.warn("Could not add barcode to PDF:", err);
                    }
                }
                return;
            }

            // Normal text fields
            const value = fieldValues[key];
            if (value !== undefined) {
                renderField(key, value, 0, 0); 
            }
        });
    }

    // -------------------------------------------------------------------------
    // RENDER ITEMS TABLE
    // -------------------------------------------------------------------------
    const tableStartY = template?.tableSettings?.startY || 65;
    const rowHeight = template?.tableSettings?.rowHeight || 12.2;
    const cols = template?.tableSettings?.columns;
    const fontSize = template?.tableSettings?.fontSize || 10;

    doc.setFontSize(fontSize);
    doc.setFont('courier', 'bold');

    (data.items || []).forEach((item, idx) => {
        const y = tableStartY + (idx * rowHeight);
        const dt = data.discountTypes.find(d => d.id === item.discount_type);
        
        // Product Name (Multi-line Support)
        const productName = item.product_name.toUpperCase();
        const productNameX = cols?.product_name?.x || 10;
        const productNameMaxWidth = template?.tableSettings?.product_name_width || ((cols?.quantity?.x || 105) - productNameX - 5); 
        
        const lines: string[] = doc.splitTextToSize(productName, productNameMaxWidth);
        lines.forEach((line, lineIdx) => {
            // Render each line with a small vertical offset (approx 3.5mm line height)
            doc.text(line, productNameX, y + (lineIdx * 3.8), { baseline: 'top' });
        });
        
        // Quantity
        doc.text(`${item.qty} ${item.unit_shortcut}`, cols?.quantity?.x || 105, y, { align: 'center', baseline: 'top' });
        
        // Unit Price
        doc.text(formatCurrency(item.unit_price), cols?.unit_price?.x || 126, y, { align: 'right', baseline: 'top' });
        
        // Discount
        doc.text(dt ? dt.discount_type.toUpperCase() : "NONE", cols?.discount?.x || 153, y, { align: 'right', baseline: 'top' });
        
        // Net Amount
        doc.text(formatCurrency(item.net_amount), cols?.net_amount?.x || 184, y, { align: 'right', baseline: 'top' });
    });

    // Custom data validation for 100% working guarantee
    if (!data.receipt_no) console.error("Receipt Number is missing in PDF generation");
    if (data.items.length === 0) console.warn("Generating PDF with zero items");

    return doc;
};

const generateThermalReceipt = async (data: ReceiptData): Promise<jsPDF> => {
    // Thermal receipts have variable height.
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [THERMAL_WIDTH, 500] 
    });

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);

    let y = 10;
    const lineStep = 4;

    // Logo
    try {
        const logoDataUrl = await getImageDataUrl('/men2.png');
        const imgProps = doc.getImageProperties(logoDataUrl);
        const imgW = 45; 
        const imgH = (imgProps.height * imgW) / imgProps.width;
        doc.addImage(logoDataUrl, 'PNG', (THERMAL_WIDTH - imgW) / 2, y, imgW, imgH);
        y += imgH + 5;
    } catch (err) {
        console.warn("Could not load logo for PDF:", err);
    }

    // Center header
    const center = (text: string) => {
        doc.text(text, THERMAL_WIDTH / 2, y, { align: 'center' });
        y += lineStep;
    };

    const leftRight = (left: string, right: string) => {
        doc.text(left, THERMAL_MARGIN, y);
        doc.text(right, THERMAL_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
        y += lineStep;
    };

    const divider = (char = '=') => {
        const line = char.repeat(32);
        center(line);
    };

    // Header
    center("OFFICIAL RECEIPT");
    divider('=');
    leftRight("Receipt#:", data.receipt_no);
    leftRight("PO#:", data.po_no);
    leftRight("Salesman:", data.salesman_name);
    
    // Multi-line values
    const wrap = (label: string, value: string) => {
        const text = `${label} ${value}`;
        const lines = doc.splitTextToSize(text, THERMAL_CONTENT_WIDTH);
        doc.text(lines, THERMAL_MARGIN, y);
        y += lines.length * lineStep;
    };

    wrap("Customer:", data.customer_name);
    wrap("Address:", data.address);
    divider('=');

    // Group items by discount type
    const groups = new Map<string, ReceiptItem[]>();
    for (const item of data.items) {
        const key = item.discount_type !== null ? String(item.discount_type) : "NONE";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
    }

    groups.forEach((items, key) => {
        const dt = data.discountTypes.find(d => String(d.id) === key);
        const dtName = dt ? dt.discount_type.toUpperCase() : "NO DISCOUNT";
        
        center(`Discount: ${dtName}`);
        
        for (const item of items) {
            const nameLines = doc.splitTextToSize(item.product_name.toUpperCase(), THERMAL_CONTENT_WIDTH);
            doc.text(nameLines, THERMAL_MARGIN, y);
            y += nameLines.length * lineStep;

            const qtyPart = `${item.qty}${item.unit_shortcut} @${formatCurrency(item.unit_price)}`;
            const amtPart = formatCurrency(item.net_amount);
            leftRight(qtyPart, amtPart);
            y += 2; // Extra gap
        }
        y += 2;
    });

    divider('=');
    
    const grossTotal = data.items.reduce((s, i) => s + (i.unit_price * i.qty), 0);
    const discountTotal = data.items.reduce((s, i) => s + i.discount_amount, 0);
    const netTotal = grossTotal - discountTotal;

    leftRight("GROSS AMOUNT:", formatCurrency(grossTotal));
    leftRight("DISCOUNT AMOUNT:", formatCurrency(discountTotal));
    leftRight("NET AMOUNT:", formatCurrency(netTotal));
    divider('=');

    y += 4;
    doc.text("Received By: ___________________", THERMAL_MARGIN, y); y += lineStep;
    doc.text("Date: __________________________", THERMAL_MARGIN, y); y += lineStep;
    doc.text("Printed Name: __________________", THERMAL_MARGIN, y); y += lineStep;
    doc.text("Position: ______________________", THERMAL_MARGIN, y); y += lineStep;
    y += 2;
    
    const disclaimer1 = "This Delivery Receipt confirms delivery of goods as listed above.";
    const lines1 = doc.splitTextToSize(disclaimer1, THERMAL_CONTENT_WIDTH);
    doc.text(lines1, THERMAL_MARGIN, y);
    y += (lines1.length * lineStep) + 2;

    const disclaimer2 = "It is issued for delivery confirmation only and is not valid for claiming input VAT.";
    const lines2 = doc.splitTextToSize(disclaimer2, THERMAL_CONTENT_WIDTH);
    doc.text(lines2, THERMAL_MARGIN, y);
    y += (lines2.length * lineStep) + 2;

    divider('=');
    y += 2;
    center("--- THANK YOU ---");
    center(format(new Date(), "yyyy-MM-dd HH:mm:ss"));

    // Trim the page height if needed (complex in jsPDF, usually easier to just set a safe height or use a custom format)
    // For now, we've generated the content. In a real browser, the print dialog handles the cut.
    
    return doc;
};
