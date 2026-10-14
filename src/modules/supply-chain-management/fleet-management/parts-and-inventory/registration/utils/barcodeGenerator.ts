/**
 * Generates a purely numeric 12 or 13 digit barcode string.
 * Uses current timestamp millis sliced + random digits to maximize uniqueness.
 */
export function generateNumericBarcode(length: 12 | 13 = 12): string {
  const timestamp = Date.now().toString(); // ~13 digits
  const suffixLength = length === 13 ? 6 : 5;
  const timePart = timestamp.slice(- (length - suffixLength));
  
  let randomPart = "";
  for (let i = 0; i < suffixLength; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }
  
  return `${timePart}${randomPart}`;
}
