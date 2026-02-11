import { SKU, MasterData } from "../types/sku.schema";

// --- SKU String Generation Helpers ---

/**
 * Extracts a unique 4-letter code from an item/string using consonant priority
 */
export const getSanitizedCode = (item: any, defaultCode: string): string => {
  if (!item) return defaultCode;
  
  // Priority 1: Use explicit code if it exists (trimmed to 4)
  if (item.code) return item.code.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  
  // Priority 2: Generate from name using Consonant Priority
  const candidates = [item.name, item.title, item.category_name, item.category, item.brand_name, item.brand, item.description];
  const name = candidates.find(c => c && typeof c === 'string' && c.trim().length > 0);
  
  if (name) {
    const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (clean.length <= 4) return clean.padEnd(4, 'X');

    const consonants = clean.replace(/[AEIOU]/g, '');
    const vowels = clean.replace(/[^AEIOU]/g, '');
    
    // Combine Consonants + Vowels and take first 4
    const combined = (consonants + vowels).substring(0, 4);
    
    if (combined.length >= 4) return combined;
    return clean.substring(0, 4).padEnd(4, 'X');
  }
  
  return defaultCode;
};

/**
 * Maps UOM names to standardized 3-4 letter codes
 */
export const getUOMCode = (uomName: string): string => {
  const name = uomName.toLowerCase().trim();
  const mapping: Record<string, string> = {
    "milliliters": "MIL", "ml": "MIL",
    "liters": "LIT", "l": "LIT",
    "grams": "GRA", "g": "GRA",
    "inner box": "INN", "ib": "INN",
    "bag": "BAG",
    "pack": "PAC", "pck": "PAC",
    "tie": "TIE",
    "jar": "JAR",
    "container": "CON", "con": "CON",
    "box": "BOX",
    "ton": "TON",
    "case": "CAS", "cse": "CAS",
    "each": "EAC", "eac": "EAC",
    "piece": "EAC", "pcs": "EAC", "pieces": "EAC",
    "palette": "PAL", "plt": "PAL",
    "kilograms": "KIL", "kg": "KIL",
    "milligram": "MIL1", "mg": "MIL1"
  };

  if (mapping[name]) return mapping[name];

  // Fuzzy matching fallback
  if (name.includes("box")) return "BOX";
  if (name.includes("pack")) return "PAC";
  if (name.includes("case")) return "CAS";
  if (name.includes("kilo")) return "KIL";
  if (name.includes("liter")) return "LIT";
  if (name.includes("gram")) return "GRA";

  return "EAC";
};

/**
 * Builds the final SKU string consistently across the generator
 */
export function buildFinalSKU(catCode: string, brandCode: string, seq: string, uomCode: string, sku: SKU) {
    if (sku.inventory_type === 'Variant') {
      const fCode = (sku.flavor || "").replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      const sCode = (sku.size || "").replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      if (fCode || sCode) {
        return `${catCode}-${brandCode}-${fCode}-${sCode}-${seq}${uomCode}`.toUpperCase();
      }
    }
    return `${catCode}-${brandCode}-${seq}${uomCode}`.toUpperCase();
}

// --- UI / Table Render Helpers ---

/**
 * Variants for status badges used in tables
 */
export const statusVariants: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  Draft: "outline", "For Approval": "secondary", Rejected: "destructive", Active: "default", Inactive: "outline",
  DRAFT: "outline", FOR_APPROVAL: "secondary", REJECTED: "destructive", ACTIVE: "default", INACTIVE: "outline", PENDING: "secondary"
};

/**
 * Helpers for rendering complex data in table cells
 */
export const CellHelpers = {
  /**
   * Renders master data text with fallback for missing values
   */
  renderMasterText: (raw: any, masterList: any[] = [], fallback: string = "Unassigned") => {
    if (!raw) return fallback;
    if (typeof raw === 'object') return (raw.name || raw.title || raw.category_name || raw.brand_name || raw.supplier_name || fallback);
    const item = masterList.find(i => i.id == raw);
    return item?.name || item?.brand_name || item?.category_name || item?.supplier_name || fallback;
  },

  /**
   * Intelligently detects inventory type from SKU properties
   */
  detectInventoryType: (sku: SKU): "Regular" | "Variant" => {
    return sku.inventory_type || 
           (sku.parent_id || sku.flavor || sku.size || sku.color || sku.volume ? "Variant" : "Regular");
  },

  /**
   * Converts TanStack SortingState to Directus sort string
   */
  getDirectusSort: (sorting?: any[]): string | undefined => {
    if (!sorting || sorting.length === 0) return undefined;
    const { id, desc } = sorting[0];

    // Calculated fields cannot be sorted on the server
    if (id === "inventory_type") return undefined;
    
    // Comprehensive mapping for all table modules
    const fieldMapping: Record<string, string> = {
      // Common
      "product_name": "product_name",
      "product_code": "product_code",
      
      // Relational Mapping (Matches collection fields)
      "product_category": "product_category.category_name",
      "product_brand": "product_brand.brand_name",
      
      // Status variations
      "status": "status",
      "isActive": "isActive"
    };

    const field = fieldMapping[id] || id;
    return `${desc ? "-" : ""}${field}`;
  }
};
