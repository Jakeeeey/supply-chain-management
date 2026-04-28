/**
 * Normalizes product names by removing unit suffixes to identify "Family" groups.
 */
export const normalizeProductName = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') return "";
  return name
    .replace(/x\s*\d+\s*(box|pack|tie|pcs|pieces)?/gi, '')
    .replace(/\s+\d+\s*(box|pack|tie|pcs|pieces)\b/gi, '')
    .replace(/\s+(box|pack|tie|pcs|pieces)\b/gi, '')
    .trim()
    .toLowerCase();
};

/**
 * Generates a unique document number for conversion transactions.
 */
export const generateConversionDocNo = (): string => {
  return `CONV-${Date.now()}`;
};

/**
 * Calculates converted quantity based on conversion factors.
 */
export const calculateConvertedQty = (
  sourceQty: number,
  sourceFactor: number,
  targetFactor: number
): number => {
  if (targetFactor === 0) return 0;
  return (sourceQty * sourceFactor) / targetFactor;
};
