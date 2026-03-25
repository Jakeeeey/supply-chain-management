// src/modules/supply-chain-management/outbound/return-to-supplier-rfid/utils/barcodeUtils.ts

/**
 * Calculates EAN-13 checksum (Odd positions x1, Even positions x3).
 */
function calculateEAN13Checksum(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = parseInt(digits[i]);
    if (i % 2 === 0) {
      sum += num * 1;
    } else {
      sum += num * 3;
    }
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates EAN-13 format and checksum.
 */
export function validateEAN13(code: string): { isValid: boolean; error?: string } {
  if (!code) return { isValid: false, error: "Barcode cannot be empty." };
  if (!/^\d+$/.test(code)) return { isValid: false, error: "EAN-13 must contain digits only." };
  if (code.length !== 13) {
    return { isValid: false, error: `EAN-13 must be 13 digits long (Current: ${code.length}).` };
  }

  const dataPart = code.substring(0, 12);
  const inputCheckDigit = parseInt(code[12]);
  const calculatedCheck = calculateEAN13Checksum(dataPart);

  if (inputCheckDigit !== calculatedCheck) {
    return { isValid: false, error: `Invalid Checksum. Last digit should be ${calculatedCheck}.` };
  }
  return { isValid: true };
}

/**
 * Validates Code 128 format and ensures it's not a valid EAN-13.
 */
export function validateCode128(code: string): { isValid: boolean; error?: string } {
  if (!code) return { isValid: false, error: "Barcode cannot be empty." };
  if (code.length < 3) return { isValid: false, error: "Code 128 is too short (min 3 chars)." };
  if (code.length > 50) return { isValid: false, error: "Code 128 is too long (max 50 chars)." };
  if (!/^[\x20-\x7E]+$/.test(code)) return { isValid: false, error: "Code 128 contains invalid characters." };

  // Strict Exclusion: Reject if it's actually a valid EAN-13
  if (/^\d{13}$/.test(code)) {
    const ean = validateEAN13(code);
    if (ean.isValid) {
      return { isValid: false, error: "This is a valid EAN-13 code. Please process as EAN-13." };
    }
  }
  return { isValid: true };
}

/**
 * Combined validator for RTS module scanning.
 */
export function validateBarcode(code: string): { isValid: boolean; type?: string; error?: string } {
  if (!code) return { isValid: false, error: "Empty barcode" };

  // Try EAN-13 first
  const ean = validateEAN13(code);
  if (ean.isValid) return { isValid: true, type: "EAN-13" };

  // Try Code 128
  const c128 = validateCode128(code);
  if (c128.isValid) return { isValid: true, type: "Code 128" };

  // If both fail, return a combined error or the specific failure of the most likely type
  if (/^\d+$/.test(code) && code.length === 13) return { isValid: false, error: ean.error };
  return { isValid: false, error: "Invalid barcode format (Support: EAN-13, Code 128)" };
}

/**
 * Detects if a string is likely an RFID vs a standard barcode.
 */
export function detectScanType(val: string): "rfid" | "barcode" {
  // RFIDs are typically 24-character hexadecimal strings.
  if (/^[0-9A-Fa-f]{24}$/.test(val)) {
    return "rfid";
  }
  return "barcode";
}
