/**
 * Parser for Vehicle Documents (Official Receipt, Certificate of Registration, Insurance)
 * Extracts document numbers, issued dates, expiry dates, and plate numbers.
 */

export interface ParsedVehicleDocument {
  documentNo: string;
  issuedDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  documentType?: "OR" | "CR" | "Insurance" | "Other";
  rawText: string;
}

export function parseVehicleDocumentText(text: string): ParsedVehicleDocument {
  const raw = text || "";
  const clean = raw.replace(/\r\n/g, "\n");

  let documentNo = "";
  let issuedDate = "";
  let expiryDate = "";
  let documentType: "OR" | "CR" | "Insurance" | "Other" = "Other";

  // 1. Detect Document Type
  if (/(?:official\s*receipt|\bor\b|o\.r\.)/i.test(clean)) {
    documentType = "OR";
  } else if (/(?:certificate\s*of\s*registration|\bcr\b|c\.r\.)/i.test(clean)) {
    documentType = "CR";
  } else if (/(?:insurance|policy|tpl|comp)/i.test(clean)) {
    documentType = "Insurance";
  }

  // 2. Extract Document Number
  // Look for patterns like:
  // "OR No: 12345678", "CR No: 98765432", "Doc No.", "Receipt No.", "Policy No."
  const docNoMatch = clean.match(/(?:(?:o\.?r\.?|c\.?r\.?|doc(?:ument)?|receipt|policy|ref(?:erence)?)\s*(?:no|num|\#)?[:\s\-]+)([A-Z0-9\-\/]{4,25})/i);
  if (docNoMatch) {
    documentNo = docNoMatch[1].trim();
  } else {
    // Fallback: look for 7-12 digit sequence or formatted alphanumeric code
    const fallbackMatch = clean.match(/\b([A-Z0-9]{2,4}[-\s][0-9]{4,10}|[0-9]{7,12})\b/i);
    if (fallbackMatch) {
      documentNo = fallbackMatch[1].replace(/\s+/g, "-").trim();
    }
  }

  // 3. Extract Issued Date and Expiry Date
  const issuedMatch = clean.match(/(?:issue(?:d)?(?:\s*date)?|date\s*(?:issued|of\s*issuance))[:\s]+([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i);
  if (issuedMatch) {
    issuedDate = normalizeDate(issuedMatch[1]);
  }

  const expiryMatch = clean.match(/(?:expir(?:y|ation)?(?:\s*date)?|valid\s*(?:until|thru|to))[:\s]+([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i);
  if (expiryMatch) {
    expiryDate = normalizeDate(expiryMatch[1]);
  }

  // Fallback if specific labels not found: gather all dates in text
  if (!issuedDate || !expiryDate) {
    const dates = clean.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/g);
    if (dates && dates.length > 0) {
      const normalizedDates = dates.map(normalizeDate).filter(Boolean).sort();
      if (!issuedDate && normalizedDates.length > 0) {
        issuedDate = normalizedDates[0];
      }
      if (!expiryDate && normalizedDates.length > 1) {
        expiryDate = normalizedDates[normalizedDates.length - 1];
      }
    }
  }

  return {
    documentNo,
    issuedDate,
    expiryDate,
    documentType,
    rawText: clean,
  };
}

function normalizeDate(rawDate: string): string {
  if (!rawDate) return "";
  const cleaned = rawDate.replace(/\//g, "-").trim();
  const parts = cleaned.split("-");

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (parts[2].length === 4) {
      const y = parts[2];
      const m = parts[0].padStart(2, "0");
      const d = parts[1].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return cleaned;
}
