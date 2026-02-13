// src/utils/barcodeUtils.ts

// --- HELPERS ---
function calculateEAN13Checksum(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = parseInt(digits[i]);
    // Odd positions (0-index) weight 1, Even positions weight 3
    if (i % 2 === 0) {
      sum += num * 1;
    } else {
      sum += num * 3;
    }
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

// --- GENERATORS ---
export function generateEAN13(): string {
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result + calculateEAN13Checksum(result);
}

export function generateCode128(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}`;
}

// --- VALIDATORS ---

export function validateEAN13(code: string): {
  isValid: boolean;
  error?: string;
} {
  if (!code) return { isValid: false, error: "Barcode cannot be empty." };

  // Rule 1: Must be numeric only
  if (!/^\d+$/.test(code)) {
    return { isValid: false, error: "EAN-13 must contain digits only." };
  }

  // Rule 2: Must be exactly 13 digits
  if (code.length !== 13) {
    return {
      isValid: false,
      error: `EAN-13 must be 13 digits long (Current: ${code.length}).`,
    };
  }

  // Rule 3: Valid Checksum
  const dataPart = code.substring(0, 12);
  const inputCheckDigit = parseInt(code[12]);
  const calculatedCheck = calculateEAN13Checksum(dataPart);

  if (inputCheckDigit !== calculatedCheck) {
    return {
      isValid: false,
      error: `Invalid Checksum. Last digit should be ${calculatedCheck}.`,
    };
  }

  return { isValid: true };
}

export function validateCode128(code: string): {
  isValid: boolean;
  error?: string;
} {
  if (!code) return { isValid: false, error: "Barcode cannot be empty." };

  // Rule 1: Reasonable Length
  if (code.length < 3) {
    return { isValid: false, error: "Code 128 is too short (min 3 chars)." };
  }
  if (code.length > 50) {
    return { isValid: false, error: "Code 128 is too long (max 50 chars)." };
  }

  // Rule 2: Valid ASCII Characters
  if (!/^[\x20-\x7E]+$/.test(code)) {
    return { isValid: false, error: "Code 128 contains invalid characters." };
  }

  // --- NEW RULE: STRICT EXCLUSION ---
  // If the code is exactly 13 digits and passes EAN-13 checksum,
  // we reject it from being saved as "Code 128" to enforce separation.
  if (/^\d{13}$/.test(code)) {
    const potentialEAN = validateEAN13(code);
    if (potentialEAN.isValid) {
      return {
        isValid: false,
        error: "This is a valid EAN-13 code. Please switch type to EAN-13.",
      };
    }
  }

  return { isValid: true };
}
