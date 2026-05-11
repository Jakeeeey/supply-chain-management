/**
 * Utility to robustly check if a Directus value represents "Posted" status.
 * Handles Boolean, Number (0/1), and MySQL Buffer objects.
 */
export const isPostedStatus = (value: unknown): boolean => {
    if (value === true || value === 1 || value === "1") return true;
    
    if (typeof value === 'object' && value !== null) {
        const valObj = value as { data?: number | number[] };
        if (valObj.data === 1) return true;
        if (Array.isArray(valObj.data) && valObj.data[0] === 1) return true;
    }
    
    return false;
};
