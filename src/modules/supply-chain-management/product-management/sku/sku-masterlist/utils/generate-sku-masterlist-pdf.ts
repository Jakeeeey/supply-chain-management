import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SKU, MasterData } from '../../sku-creation/types/sku.schema';
import { CellHelpers } from '../../sku-creation/utils/sku-helpers';

function flattenItems(items: SKU[]): SKU[] {
  const flat: SKU[] = [];
  items.forEach(item => {
    flat.push(item);
    const typedItem = item as SKU & { subRows?: SKU[] };
    if (typedItem.subRows && typedItem.subRows.length > 0) {
      flat.push(...flattenItems(typedItem.subRows));
    }
  });
  return flat;
}

export interface SKUMasterlistPDFData {
  items: SKU[];
  masterData: MasterData;
  selectedColumns?: string[]; // Array of column keys to include
}

export const AVAILABLE_PRINT_COLUMNS = [
  { id: 'code', label: 'Code/Barcode' },
  { id: 'name', label: 'Product Name' },
  { id: 'brand', label: 'Brand' },
  { id: 'category', label: 'Category / Class' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'unit', label: 'Base Unit' },
  { id: 'status', label: 'Status' },
  { id: 'description', label: 'Description' },
  { id: 'external_id', label: 'External ID' },
  { id: 'inventory_type', label: 'Inventory Type' },
  { id: 'maintaining_qty', label: 'Maintaining Qty' },
  { id: 'cost', label: 'Estimated Cost' },
  { id: 'price', label: 'Price per Unit' },
  { id: 'weight', label: 'Weight' },
  { id: 'cbm', label: 'CBM (L x W x H)' },
];

export const DEFAULT_PRINT_COLUMNS = ['code', 'name', 'brand', 'category', 'supplier', 'unit', 'status'];

export function generateSKUMasterlistPDF(data: SKUMasterlistPDFData): jsPDF {
  const { items, masterData, selectedColumns = DEFAULT_PRINT_COLUMNS } = data;
  const flatItems = flattenItems(items);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  
  let y = 20;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PRODUCT / SKU MASTERLIST', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const printDate = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  doc.text(`Printed: ${printDate}`, pageW - margin, y, { align: 'right' });

  y += 10;

  // Filter columns based on selection
  const columnsToPrint = AVAILABLE_PRINT_COLUMNS.filter(col => selectedColumns.includes(col.id));
  
  const hasCBM = columnsToPrint.some(c => c.id === 'cbm');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headRow1: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headRow2: any[] = [];

  columnsToPrint.forEach(col => {
    if (col.id === 'cbm') {
      headRow1.push({ content: 'CBM', colSpan: 3, styles: { halign: 'center' } });
      headRow2.push('L', 'W', 'H');
    } else {
      if (hasCBM) {
        headRow1.push({ content: col.label, rowSpan: 2, styles: { valign: 'middle' } });
      } else {
        headRow1.push(col.label);
      }
    }
  });

  const head = hasCBM ? [headRow1, headRow2] : [headRow1];

  // Build rows dynamically based on selected columns
  const rows = flatItems.map((item) => {
    const brandName = CellHelpers.renderMasterText(item.product_brand, masterData.brands, 'N/A');
    const catName = CellHelpers.renderMasterText(item.product_category, masterData.categories, 'N/A');
    const className = CellHelpers.renderMasterText(item.product_class, masterData.classes, 'N/A');
    const suppName = CellHelpers.renderMasterText(item.product_supplier, masterData.suppliers, 'N/A');
    
    let uomName = 'N/A';
    if (typeof item.unit_of_measurement === 'number' || !isNaN(Number(item.unit_of_measurement))) {
      uomName = masterData.units.find(u => Number(u.id) === Number(item.unit_of_measurement))?.name || 'N/A';
    } else if (item.unit_of_measurement && typeof item.unit_of_measurement === 'object') {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       uomName = (item.unit_of_measurement as any).unit_name || (item.unit_of_measurement as any).name || 'N/A';
    } else if (item.base_unit) {
       const parsedId = parseInt(String(item.base_unit));
       if (!isNaN(parsedId)) {
         uomName = masterData.units.find(u => Number(u.id) === parsedId)?.name || 'N/A';
       } else {
         uomName = String(item.base_unit);
       }
    }

    const statusMap: Record<string, string> = {
      "1": "ACTIVE",
      "0": "INACTIVE",
      "true": "ACTIVE",
      "false": "INACTIVE",
    };
    
    const isActiveStr = statusMap[String(item.isActive)] || (item.status || "UNKNOWN").toUpperCase();

    const rowData: string[] = [];

    columnsToPrint.forEach(col => {
      switch (col.id) {
        case 'code':
          rowData.push(item.product_code || item.barcode || 'N/A');
          break;
        case 'name':
          const indent = item.parent_id ? '      ' : '';
          rowData.push(indent + (item.product_name || 'N/A'));
          break;
        case 'brand':
          rowData.push(brandName);
          break;
        case 'category':
          rowData.push(`${catName} / ${className}`);
          break;
        case 'supplier':
          rowData.push(suppName);
          break;
        case 'unit':
          rowData.push(uomName);
          break;
        case 'status':
          rowData.push(isActiveStr);
          break;
        case 'description':
          rowData.push(item.description || item.short_description || 'N/A');
          break;
        case 'external_id':
          rowData.push(item.external_id || 'N/A');
          break;
        case 'inventory_type':
          rowData.push(item.inventory_type || 'N/A');
          break;
        case 'maintaining_qty':
          rowData.push(String(item.maintaining_quantity ?? 'N/A'));
          break;
        case 'cost':
          rowData.push(item.cost_per_unit != null ? String(item.cost_per_unit) : 'N/A');
          break;
        case 'price':
          rowData.push(item.price_per_unit != null ? String(item.price_per_unit) : 'N/A');
          break;
        case 'weight':
          rowData.push(item.product_weight != null ? String(item.product_weight) : 'N/A');
          break;
        case 'cbm':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyItem = item as any;
          const length = anyItem.cbm_length ?? '-';
          const width = anyItem.cbm_width ?? '-';
          const height = anyItem.cbm_height ?? '-';
          rowData.push(String(length), String(width), String(height));
          break;
        default:
          rowData.push('N/A');
      }
    });

    return rowData;
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: head,
    body: rows.length > 0 ? rows : [[...Array(headRow1.length + (hasCBM ? 2 : 0)).fill('')]],
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
      textColor: [40, 40, 40] as [number, number, number],
      lineColor: [210, 210, 210] as [number, number, number],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [240, 240, 240] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineColor: [200, 200, 200] as [number, number, number],
      lineWidth: 0.3,
    },
    // Dynamically adjusting column width is handled automatically by autoTable mostly, 
    // but we can set 'auto' for the name column if it exists to allow it to expand
    columnStyles: {
      ... (columnsToPrint.findIndex(c => c.id === 'name') !== -1 
        ? { [columnsToPrint.findIndex(c => c.id === 'name')]: { cellWidth: 'auto' } } 
        : {})
    },
  });

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 10, pageW - margin, pageH - 10);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text(
    `VOS Web Supply Chain Management System`,
    pageW / 2,
    pageH - 6,
    { align: 'center' },
  );

  return doc;
}
