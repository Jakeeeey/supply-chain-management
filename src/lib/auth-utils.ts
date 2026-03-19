/**
 * JWT Utility for decoding payloads without verification
 */

export function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const p = parts[1];
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    // Use Buffer for Node.js environments (API routes, Server Components)
    if (typeof Buffer !== 'undefined') {
      const json = Buffer.from(padded, "base64").toString("utf8");
      return JSON.parse(json);
    }
    
    // Fallback for browser if needed (though usually we use atob)
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Extract User ID from JWT Payload
 */
export function getUserIdFromToken(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Try common ID fields
  const idValue = payload.user_id ?? payload.userId ?? payload.id ?? payload.sub;
  
  if (idValue !== undefined && idValue !== null) {
    const num = Number(idValue);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Extract User Full Name from JWT Payload
 */
export function getUserNameFromToken(token: string | null | undefined): string {
  if (!token) return "System User";
  const payload = decodeJwtPayload(token);
  if (!payload) return "System User";

  const first = (payload.Firstname ?? payload.FirstName ?? payload.firstName ?? payload.firstname ?? payload.first_name ?? "").trim();
  const last = (payload.LastName ?? payload.Lastname ?? payload.lastName ?? payload.lastname ?? payload.last_name ?? "").trim();
  const email = (payload.email ?? payload.Email ?? "").trim();

  const name = [first, last].filter(Boolean).join(" ") || email || "User";
  return name;
}
