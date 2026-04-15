export function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

export async function readError(res: Response, moduleName: string) {
  try {
    if (isJsonResponse(res)) {
      const j = await res.json();
      console.error(`[${moduleName} API Error]`, j);
      
      if (Array.isArray(j?.errors) && j.errors.length > 0) {
        return j.errors[0]?.message || "A database error occurred.";
      }
      
      if (j?.error) return j.error;
      if (j?.message) return j.message;
      
      return JSON.stringify(j);
    }
    
    const text = await res.text();
    console.error(`[${moduleName} API Error Text]`, text);
    return text || `HTTP ${res.status}: ${res.statusText}`;
  } catch (error) {
    console.error(`[${moduleName} readError Failed]`, error);
    return `Server communication failed (${res.status})`;
  }
}

export function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  
  const normalizedDate = dateStr.endsWith("Z") || dateStr.includes("+") 
    ? dateStr 
    : `${dateStr.replace(" ", "T")}Z`;

  return new Date(normalizedDate).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
