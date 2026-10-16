/**
 * Client-side / Rule-based OCR Parser for Driver's Licenses
 * Extracts license number, classification, restrictions, expiry date, name, etc.
 */

export interface ParsedLicenseData {
    license_no: string;
    license_classification: string;
    license_restrictions: string;
    license_expiry_date: string; // YYYY-MM-DD format
    driver_name: string;
    address?: string;
    raw_text: string;
}

export function parseLicenseText(text: string): ParsedLicenseData {
    const raw = text || "";
    const clean = raw.replace(/\r\n/g, "\n");
    const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);

    let license_no = "";
    let license_classification = "";
    let license_restrictions = "";
    let license_expiry_date = "";
    let driver_name = "";
    const address = "";

    // 1. License Number extraction: standard Philippine DL pattern e.g., N01-23-456789 or 11-12 digits / alphanumeric
    const licRegex = /\b([A-Z]\d{2}[-\s]?\d{2}[-\s]?\d{6}|\d{3}[-\s]?\d{2}[-\s]?\d{6}|[A-Z0-9]{3}[-\s]\d{2}[-\s]\d{6})\b/i;
    const licMatch = clean.match(licRegex);
    if (licMatch) {
        license_no = licMatch[1].toUpperCase().replace(/\s+/g, "-");
    } else {
        // Fallback search for "License No." or "DL No."
        for (const line of lines) {
            if (/lic(?:ense)?\s*(?:no|num|\#)?/i.test(line)) {
                const parts = line.split(/[:#]/);
                if (parts[1]) {
                    license_no = parts[1].trim();
                    break;
                }
            }
        }
    }

    // 2. Classification extraction
    if (/non[-\s]?prof(?:essional)?/i.test(clean)) {
        license_classification = "Non-Professional";
    } else if (/prof(?:essional)?/i.test(clean)) {
        license_classification = "Professional";
    } else if (/student/i.test(clean)) {
        license_classification = "Student Permit";
    }

    // 3. Expiration Date extraction
    // Look for YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, MM/DD/YYYY, or Month DD, YYYY
    const expLabelMatch = clean.match(/(?:exp(?:ir(?:y|ation)?)?|valid\s+until)[:\s]+([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i);
    if (expLabelMatch) {
        license_expiry_date = normalizeDate(expLabelMatch[1]);
    } else {
        // Find general dates in the text
        const dates = clean.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/g);
        if (dates && dates.length > 0) {
            // usually expiration is the latest date or after birthdate
            license_expiry_date = normalizeDate(dates[dates.length - 1]);
        }
    }

    // 4. Restrictions / Conditions extraction
    const restMatch = clean.match(/(?:rest(?:riction)?s?|condition(?:s)?|code(?:s)?)[:\s]+([1-8A-G,\s]+)/i);
    if (restMatch && restMatch[1].trim().length < 25) {
        license_restrictions = restMatch[1].trim();
    } else if (/\b(1,2|1, 2|A, B|A,B|1,2,3)\b/i.test(clean)) {
        const found = clean.match(/\b(1,2|1, 2|A, B|A,B|1,2,3)\b/i);
        if (found) license_restrictions = found[1];
    }

    // 5. Driver Name extraction
    const nameLabelMatch = clean.match(/(?:name|bearer|driver)[:\s]+([A-Z,\s]{4,40})/i);
    if (nameLabelMatch) {
        driver_name = nameLabelMatch[1].trim();
    } else {
        // Look for lines that look like "LASTNAME, FIRSTNAME MIDDLENAME"
        const nameLine = lines.find(l => /^[A-Z]{2,25},\s*[A-Z]{2,25}(?:\s+[A-Z]{1,20})?$/.test(l));
        if (nameLine) {
            driver_name = nameLine;
        }
    }

    return {
        license_no,
        license_classification: license_classification || "Professional",
        license_restrictions: license_restrictions || "1, 2",
        license_expiry_date,
        driver_name,
        address,
        raw_text: clean,
    };
}

function normalizeDate(rawDate: string): string {
    if (!rawDate) return "";
    const cleaned = rawDate.replace(/\//g, "-").trim();
    const parts = cleaned.split("-");

    if (parts.length === 3) {
        // If YYYY-MM-DD
        if (parts[0].length === 4) {
            const y = parts[0];
            const m = parts[1].padStart(2, "0");
            const d = parts[2].padStart(2, "0");
            return `${y}-${m}-${d}`;
        }
        // If MM-DD-YYYY or DD-MM-YYYY
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
